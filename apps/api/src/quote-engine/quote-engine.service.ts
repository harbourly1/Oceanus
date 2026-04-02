import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuoteEngineService {
  constructor(private prisma: PrismaService) {}

  async calculateQuotes(productCode: string, formData: Record<string, any>) {
    // 1. Load product
    const product = await this.prisma.product.findUnique({ where: { code: productCode.toUpperCase() } });
    if (!product) throw new Error(`Product not found: ${productCode}`);

    // 2. Load active insurers
    const insurers = await this.prisma.insurer.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // 3. Load rate tables for this product
    const rateTables = await this.prisma.rateTable.findMany({
      where: { productId: product.id, isActive: true },
    });
    const rateByInsurer: Record<string, number> = {};
    for (const rt of rateTables) {
      rateByInsurer[rt.insurerId] = rt.rate;
    }

    // 4. Load risk modifiers
    const allModifiers = await this.prisma.riskModifier.findMany({
      where: { isActive: true },
      orderBy: [{ modifierType: 'asc' }, { sortOrder: 'asc' }],
    });
    const modifiersByType: Record<string, Array<{ conditionKey: string; factor: number }>> = {};
    for (const m of allModifiers) {
      if (!modifiersByType[m.modifierType]) modifiersByType[m.modifierType] = [];
      modifiersByType[m.modifierType].push({ conditionKey: m.conditionKey, factor: m.factor });
    }

    // 5. Load coverage inclusions
    const inclusions = await this.prisma.coverageInclusion.findMany({
      where: { productId: product.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // 6. Compute insured base value
    const base = parseFloat(
      formData.craftValue || formData.cargoValue || formData.annualTurnover ||
      formData.vesselValue || formData.boatValue || formData.pwcValue || formData.value || '500000'
    );

    const liabLimit = parseFloat(formData.liabilityLimit || '1000000');

    // Sum Insured Basis multiplier (cargo) — changes insured value, not risk loading
    const siBasisMap: Record<string, number> = { 'CIF + 10% (Standard)': 1.10, 'CIF Only': 1.00, 'Invoice Value': 1.00 };
    const sumInsuredMultiplier = productCode.toUpperCase() === 'CARGO'
      ? (siBasisMap[formData.sumInsuredBasis] || 1.10)
      : 1.0;

    const valueForPremium = productCode.toUpperCase() === 'LIABILITY'
      ? liabLimit
      : base * sumInsuredMultiplier;

    // 7. Apply risk modifiers — same logic as frontend generateQuotes()
    const getModifierFactor = (type: string, formValue: string | undefined): number => {
      const mods = modifiersByType[type];
      if (!mods || !formValue) return 1.0;
      const match = mods.find(m => m.conditionKey === formValue);
      if (match) return match.factor;
      const def = mods.find(m => m.conditionKey === 'default');
      return def ? def.factor : 1.0;
    };

    // Claims loading
    const claimsLoad = getModifierFactor('CLAIMS', formData.claims || 'None');

    // Vessel age loading
    const buildYear = parseInt(formData.buildYear || '2015');
    const age = new Date().getFullYear() - buildYear;
    let ageKey: string;
    if (age <= 5) ageKey = '0-5';
    else if (age <= 10) ageKey = '6-10';
    else if (age <= 15) ageKey = '11-15';
    else if (age <= 20) ageKey = '16-20';
    else ageKey = '21+';
    const ageLoad = getModifierFactor('AGE', ageKey);

    // ICC clause (cargo)
    const iccLoad = getModifierFactor('ICC', formData.iccClause);

    // Operating area / route
    const routeValue = formData.operatingWaters || formData.tradeRoute || formData.navArea || formData.operatingArea;
    const routeLoad = getModifierFactor('ROUTE', routeValue);

    // Use/charter (pleasure)
    const useValue = formData.use;
    let useLoad = 1.0;
    if (useValue && useValue.toLowerCase().includes('charter')) {
      useLoad = getModifierFactor('USE', useValue);
    }

    // Racing
    const racingLoad = getModifierFactor('RACING', formData.racing);

    // Conveyance mode (cargo)
    const modeLoad = getModifierFactor('MODE', formData.conveyanceMode);

    // War & Strikes (cargo only, 15% add-on)
    const warLoad = productCode.toUpperCase() === 'CARGO'
      ? getModifierFactor('WAR', formData.warStrikes)
      : 1.0;

    // Perishable (cargo)
    const perishLoad = getModifierFactor('PERISHABLE', formData.perishable);

    // TPL add-on (hull/pleasure)
    const tplLoad = getModifierFactor('TPL', formData.tplCover);

    // Pollution (hull/barge)
    const pollLoad = getModifierFactor('POLLUTION', formData.pollution);

    // Loss of Hire (hull/barge)
    const lohLoad = getModifierFactor('LOH', formData.lossOfHire);

    // ─── NEW MODIFIERS: Close all pricing gaps ──────────────────────────────

    // Cargo category (cargo)
    const cargoCatLoad = getModifierFactor('CARGO_CATEGORY', formData.cargoCategory);

    // Packing type (cargo)
    const packingLoad = getModifierFactor('PACKING', formData.packingType);

    // Letter of credit (cargo)
    const lcLoad = getModifierFactor('LC', formData.letterOfCredit);

    // Hull / vessel type (hull)
    const hullTypeLoad = getModifierFactor('HULL_TYPE', formData.hullType);

    // Classification society (hull/barge)
    const classLoad = getModifierFactor('CLASSIFICATION', formData.classification);

    // Cargo carried on hull vessel (hull)
    const cargoCarriedLoad = getModifierFactor('CARGO_CARRIED', formData.cargoType);

    // Liability sub-type (liability — critical: P&I = 1.80x vs Haulier = 0.65x)
    const liabTypeLoad = getModifierFactor('LIABILITY_TYPE', formData.liabilityType);

    // Craft type (pleasure)
    const craftTypeLoad = getModifierFactor('CRAFT_TYPE', formData.craftType);

    // Owner experience (pleasure)
    const expLoad = getModifierFactor('EXPERIENCE', formData.experience);

    // Engine type (pleasure)
    const engineLoad = getModifierFactor('ENGINE', formData.engineType);

    // Survey / classification status (hull, pleasure)
    const surveyLoad = getModifierFactor('SURVEY', formData.surveyStatus);

    // Hull material (hull, pleasure)
    const materialLoad = getModifierFactor('HULL_MATERIAL', formData.hullMaterial);

    // ─── CARGO OPEN COVER GAP-FIX MODIFIERS ──────────────────────────────────

    // Inland transit extension (cargo — warehouse-to-warehouse)
    const inlandLoad = getModifierFactor('INLAND_TRANSIT', formData.inlandTransit);

    // Storage / warehousing duration (cargo)
    const storageLoad = getModifierFactor('STORAGE', formData.storageDuration);

    // Duty insurance (cargo — import duties cover)
    const dutyLoad = getModifierFactor('DUTY', formData.dutyInsurance);

    // Increased value (cargo — cover above declared CIF)
    const ivLoad = getModifierFactor('INCREASED_VALUE', formData.increasedValue);

    // Transshipment risk (cargo — cargo changes vessel/mode)
    const transLoad = getModifierFactor('TRANSSHIPMENT', formData.transshipment);

    // ─── COMPUTED MODIFIERS (continuous numeric ranges, like AGE) ────────────

    // ENGINE POWER (KW) — hull
    const ep = parseFloat(formData.enginePower || '0');
    let enginePowerLoad = 1.0;
    if (ep > 0) {
      if (ep <= 500) enginePowerLoad = 0.90;
      else if (ep <= 2000) enginePowerLoad = 1.0;
      else if (ep <= 5000) enginePowerLoad = 1.08;
      else if (ep <= 10000) enginePowerLoad = 1.15;
      else enginePowerLoad = 1.25;
    }

    // GRT (Gross Tonnage) — hull
    const grt = parseFloat(formData.grt || '0');
    let grtLoad = 1.0;
    if (grt > 0) {
      if (grt <= 500) grtLoad = 0.85;
      else if (grt <= 5000) grtLoad = 1.0;
      else if (grt <= 25000) grtLoad = 1.10;
      else if (grt <= 50000) grtLoad = 1.20;
      else grtLoad = 1.30;
    }

    // LENGTH — pleasure craft
    const length = parseFloat(formData.length || '0');
    let lengthLoad = 1.0;
    if (length > 0) {
      if (length <= 8) lengthLoad = 0.85;
      else if (length <= 15) lengthLoad = 1.0;
      else if (length <= 24) lengthLoad = 1.15;
      else if (length <= 40) lengthLoad = 1.30;
      else lengthLoad = 1.45;
    }

    // CREW_SIZE — liability
    const crew = parseInt(formData.crew || '0');
    let crewLoad = 1.0;
    if (crew > 0) {
      if (crew <= 10) crewLoad = 1.0;
      else if (crew <= 25) crewLoad = 1.05;
      else if (crew <= 50) crewLoad = 1.10;
      else if (crew <= 100) crewLoad = 1.15;
      else crewLoad = 1.20;
    }

    // ANNUAL REVENUE — liability (higher revenue = more exposure)
    const rev = parseFloat(formData.annualRevenue || '0');
    let revenueLoad = 1.0;
    if (rev > 0) {
      if (rev <= 5000000) revenueLoad = 0.90;
      else if (rev <= 20000000) revenueLoad = 1.0;
      else if (rev <= 50000000) revenueLoad = 1.08;
      else if (rev <= 100000000) revenueLoad = 1.15;
      else revenueLoad = 1.25;
    }

    // FLEET SIZE — liability (P&I / Charterer's: more vessels = more risk)
    const fleet = parseInt(formData.fleetSize || '0');
    let fleetLoad = 1.0;
    if (fleet > 0) {
      if (fleet <= 3) fleetLoad = 0.90;
      else if (fleet <= 10) fleetLoad = 1.0;
      else if (fleet <= 25) fleetLoad = 1.10;
      else if (fleet <= 50) fleetLoad = 1.20;
      else fleetLoad = 1.35;
    }

    // Combined loading (all modifiers multiplicative)
    let combinedLoad = claimsLoad * ageLoad * iccLoad * routeLoad * useLoad
      * racingLoad * modeLoad * warLoad * perishLoad * tplLoad * pollLoad * lohLoad
      * cargoCatLoad * packingLoad * lcLoad * hullTypeLoad * classLoad
      * cargoCarriedLoad * liabTypeLoad * craftTypeLoad * expLoad * engineLoad
      * surveyLoad * materialLoad * grtLoad * lengthLoad * crewLoad * enginePowerLoad
      * revenueLoad * fleetLoad
      * inlandLoad * storageLoad * dutyLoad * ivLoad * transLoad;

    // Safety cap to prevent extreme premium blowups from multiplicative stacking
    combinedLoad = Math.max(0.35, Math.min(combinedLoad, 4.0));

    // 8. Generate quotes per insurer
    const inclusionTexts = inclusions.map(i => i.inclusionText);

    // Deterministic variance based on hash instead of Math.random()
    const hashStr = (s: string): number => {
      let hash = 0;
      for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
      }
      return Math.abs(hash);
    };

    const quotes = insurers.map((ins, idx) => {
      const rate = rateByInsurer[ins.id];
      if (rate === undefined) return null;

      // Use rate table value directly as the insurer-specific rate
      const finalRate = rate * combinedLoad;
      const premium = Math.round(valueForPremium * finalRate);

      // Deductible = % of insured value (deterministic variance)
      const deductHash = hashStr(`${ins.code}-deduct-${base}`) % 100;
      const deductVariance = 0.8 + (deductHash / 100) * 0.4; // 0.8–1.2
      const deductible = Math.round(base * product.deductibleRate * deductVariance);

      // Coverage — uses sumInsuredBasis multiplier for cargo
      const coverage = productCode.toUpperCase() === 'CARGO'
        ? Math.round(base * sumInsuredMultiplier)
        : Math.round(base * 1.0);

      // Underwriting score (deterministic)
      const scoreHash = hashStr(`${ins.code}-score-${productCode}`) % 10;
      const riskScore = Math.round(
        95
        - (claimsLoad - 1) * 30
        - (ageLoad - 1) * 15
        - (routeLoad - 1) * 10
        - (liabTypeLoad - 1) * 12
        - (classLoad - 1) * 8
        - (craftTypeLoad - 1) * 6
        - (surveyLoad - 1) * 8
        + scoreHash * 0.5
      );
      const score = Math.max(45, Math.min(99, riskScore));

      // Pick 3-5 inclusions per insurer
      const numInclusions = 3 + (idx % 3);
      const insInclusions = inclusionTexts.slice(0, numInclusions);

      return {
        id: idx + 1,
        insurerId: ins.id,
        name: ins.name,
        logo: ins.logo,
        rating: ins.rating,
        specialty: ins.specialty,
        premium,
        deductible,
        coverage,
        score,
        responseTime: `${ins.responseHours} hrs`,
        inclusions: insInclusions,
        annualRate: (finalRate * 100).toFixed(3),
        deductiblePct: (product.deductibleRate * 100).toFixed(1),
      };
    }).filter(Boolean);

    return quotes.sort((a: any, b: any) => a.premium - b.premium);
  }
}
