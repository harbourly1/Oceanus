// @ts-nocheck
'use client';
import { useState, useEffect, useRef, createContext, useContext } from "react";
import { usePublicCatalog, usePublicReferenceData, useCalculateQuotes } from "@/hooks/use-api";

// ─── THEME ────────────────────────────────────────────────────────────────────
const ThemeCtx = createContext({ dark: true });
const useTheme = () => useContext(ThemeCtx);

const DARK = {
  bg:           "#050c1a",
  bgAlt:        "#0a1628",
  surface:      "rgba(255,255,255,0.03)",
  surfaceHover: "rgba(255,255,255,0.06)",
  border:       "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.15)",
  header:       "rgba(5,12,26,0.97)",
  text:         "#e2e8f0",
  textSub:      "#94a3b8",
  textMuted:    "#64748b",
  textFaint:    "#334155",
  textFaintest: "#1e293b",
  input:        "rgba(255,255,255,0.05)",
  inputBorder:  "rgba(255,255,255,0.1)",
  inputText:    "#e2e8f0",
  radioInactive:"rgba(255,255,255,0.09)",
  cardBest:     "rgba(14,165,233,0.04)",
  cardBestBorder:"rgba(14,165,233,0.3)",
  tooltipBg:    "#1e293b",
  tooltipBorder:"rgba(14,165,233,0.2)",
  tooltipText:  "#94a3b8",
  timelinePending:"#1e293b",
  policyItem:   "rgba(255,255,255,0.02)",
  policyBorder: "rgba(255,255,255,0.05)",
  bindSummary:  "rgba(14,165,233,0.04)",
  bindBorder:   "rgba(14,165,233,0.12)",
  btnSecBorder: "rgba(255,255,255,0.12)",
  btnSecText:   "#94a3b8",
  convBg:       "rgba(255,255,255,0.05)",
  convBorder:   "rgba(255,255,255,0.12)",
  landingGrad:  "radial-gradient(ellipse 80% 60% at 50% -10%,rgba(14,165,233,0.18) 0%,transparent 70%),radial-gradient(ellipse 60% 50% at 80% 80%,rgba(99,102,241,0.1) 0%,transparent 70%)",
  statBorder:   "rgba(255,255,255,0.05)",
  docChip:      "rgba(255,255,255,0.03)",
  selectOption: "#1e293b",
};

const LIGHT = {
  bg:           "#f0f4f8",
  bgAlt:        "#e8eef5",
  surface:      "#ffffff",
  surfaceHover: "#f8fafc",
  border:       "#d1dce8",
  borderStrong: "#94a3b8",
  header:       "rgba(255,255,255,0.97)",
  text:         "#0f172a",
  textSub:      "#334155",
  textMuted:    "#64748b",
  textFaint:    "#94a3b8",
  textFaintest: "#cbd5e1",
  input:        "#ffffff",
  inputBorder:  "#cbd5e1",
  inputText:    "#0f172a",
  radioInactive:"#e2e8f0",
  cardBest:     "rgba(14,165,233,0.05)",
  cardBestBorder:"rgba(14,165,233,0.35)",
  tooltipBg:    "#1e293b",
  tooltipBorder:"rgba(14,165,233,0.3)",
  tooltipText:  "#94a3b8",
  timelinePending:"#cbd5e1",
  policyItem:   "#f8fafc",
  policyBorder: "#e2e8f0",
  bindSummary:  "rgba(14,165,233,0.05)",
  bindBorder:   "rgba(14,165,233,0.2)",
  btnSecBorder: "#cbd5e1",
  btnSecText:   "#64748b",
  convBg:       "#ffffff",
  convBorder:   "#d1dce8",
  landingGrad:  "radial-gradient(ellipse 80% 60% at 50% -10%,rgba(14,165,233,0.12) 0%,transparent 70%),radial-gradient(ellipse 60% 50% at 80% 80%,rgba(99,102,241,0.07) 0%,transparent 70%)",
  statBorder:   "#e2e8f0",
  docChip:      "#f1f5f9",
  selectOption: "#ffffff",
};

// ─── CONSTANTS (static fallback while API loads) ─────────────────────────────
const INSURERS = [
  { id:1, name:"Orient Insurance", logo:"OI", rating:"A", specialty:"All Marine Risks" },
  { id:2, name:"AXA Gulf",         logo:"AX", rating:"A+", specialty:"Cargo & Transit" },
  { id:3, name:"Oman Insurance",   logo:"OM", rating:"A",  specialty:"Hull & Machinery" },
  { id:4, name:"Abu Dhabi National Insurance", logo:"AD", rating:"A+", specialty:"P&I & Liability" },
  { id:5, name:"Dar Al Takaful",   logo:"DT", rating:"A-", specialty:"Takaful Marine" },
];

const PRODUCT_TYPES = [
  { id:"cargo",     label:"Marine Cargo",           icon:"📦", desc:"Goods in transit — single shipment or annual open cover", color:"#f97316", estMins:3, steps:["Policy Type","Shipment Details","Contact"], badge:"Orient" },
  { id:"hull",      label:"Marine Hull",            icon:"🚢", desc:"Cargo vessels, tugs, supply vessels, dredgers — blue water or coastal", color:"#0ea5e9", estMins:4, steps:["Vessel Info","Operations","Contact"], badge:"Orient" },
  { id:"liability", label:"Marine Liability",       icon:"⚖️", desc:"Ship repairer's, charterer's, freight forwarder's & P&I liability", color:"#8b5cf6", estMins:3, steps:["Liability Type","Details","Contact"], badge:"Orient" },
  { id:"pleasure",  label:"Pleasure Crafts",        icon:"⛵", desc:"Yachts, speedboats, jet skis — tailored cover from small boats to mega yachts", color:"#6366f1", estMins:3, steps:["Craft Details","Use & Cover","Contact"], badge:"Orient" },
  { id:"jetski",    label:"Jet Ski / PWC",          icon:"🏄", desc:"Personal watercraft, wave runners",         color:"#10b981", estMins:2, steps:["Your PWC","Contact"] },
  { id:"speedboat", label:"Speedboat / RIB",        icon:"🚤", desc:"Speedboats, rigid inflatable boats",        color:"#f59e0b", estMins:2, steps:["Your Boat","Contact"] },
  { id:"barge",     label:"Barge & Commercial",     icon:"🛳️", desc:"Barges, ferries, workboats, offshore support", color:"#ec4899", estMins:4, steps:["Vessel Info","Operations","Contact"] },
];

const COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Belgium","Bolivia","Brazil","Bulgaria","Cambodia","Canada","Chile","China","Colombia","Croatia","Cuba","Cyprus","Czech Republic","Denmark","Ecuador","Egypt","Estonia","Ethiopia","Finland","France","Germany","Ghana","Greece","Guatemala","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kuwait","Latvia","Lebanon","Libya","Lithuania","Luxembourg","Malaysia","Maldives","Malta","Mexico","Monaco","Morocco","Myanmar","Netherlands","New Zealand","Nigeria","Norway","Oman","Pakistan","Panama","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Saudi Arabia","Senegal","Serbia","Singapore","Slovakia","Slovenia","South Africa","South Korea","Spain","Sri Lanka","Sudan","Sweden","Switzerland","Syria","Taiwan","Tanzania","Thailand","Tunisia","Turkey","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];
const YEARS = Array.from({ length: 2026-1950+1 }, (_,i) => 1950+i).reverse();
const NAV_LIMITS = ["UAE Waters","Arabian Gulf","Indian Ocean","Mediterranean","Asia-Pacific","Europe + Med","North Sea","Caribbean","Atlantic","Pacific","Worldwide"];
const CURRENCIES = ["AED","USD","EUR","GBP"];

const DEFAULTS = {
  cargo:     { policyType:"Open Cover", conveyanceMode:"Sea", interestType:"Buyer (CIF)", iccClause:"ICC (A) – All Risks", warStrikes:"Yes", claims:"None", sumInsuredBasis:"CIF + 10% (Standard)", inlandTransit:"Yes", storageDuration:"None / In Transit Only", transshipment:"No", dutyInsurance:"No", increasedValue:"No", effectiveDate: todayPlus(7) },
  hull:      { flag:"United Arab Emirates", operatingWaters:"Coastal / Inland", tradeRoute:"Arabian Gulf", pandi:"Yes", claims:"None", hullMaterial:"Steel", surveyStatus:"In Class", effectiveDate: todayPlus(7) },
  liability: { liabilityType:"Charterer's Liability", flag:"United Arab Emirates", operatingArea:"Arabian Gulf", claims:"None", effectiveDate: todayPlus(7) },
  pleasure:  { flag:"United Arab Emirates", craftType:"Motor Yacht", navArea:"UAE Waters", use:"Private", tplCover:"Yes", claims:"None", hullMaterial:"GRP / Fiberglass", surveyStatus:"N/A", effectiveDate: todayPlus(7) },
  jetski:    { country:"United Arab Emirates", usageArea:"Coastal / Sea", frequency:"Weekend only", racing:"No", claims:"None", storage:"Marina / Berth", quantity:"1", licence:"Yes", effectiveDate: todayPlus(7) },
  speedboat: { country:"United Arab Emirates", waters:"UAE Waters", storage:"Marina Berth", overnight:"No", trailer:"No", experience:"1-3 years", claims:"None", effectiveDate: todayPlus(7) },
  barge:     { flag:"United Arab Emirates", operatingArea:"UAE Waters", opType:"Coastal", lossOfHire:"No", pollution:"No", claims:"None", effectiveDate: todayPlus(7) },
};

function todayPlus(days) { const d=new Date(); d.setDate(d.getDate()+days); return d.toISOString().split("T")[0]; }
function currencySymbol(c) { return {USD:"$",EUR:"€",GBP:"£",AED:"AED "}[c]||"$"; }
function hexToRgb(hex) { return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`; }

function generateQuotes(form, productType) {
  // ── INSURED BASE VALUE ────────────────────────────────────────────────────
  const base = parseFloat(
    form.craftValue||form.cargoValue||form.annualTurnover||
    form.vesselValue||form.boatValue||form.pwcValue||form.value||500000
  );

  // ── LIABILITY LIMIT (separate from insured value) ─────────────────────────
  const liabLimit = parseFloat(form.liabilityLimit||1000000);

  // ── SUM INSURED BASIS (cargo: CIF+10% / CIF Only / Invoice Value) ────────
  const sumInsuredMultiplier = productType==="cargo"
    ? ({"CIF + 10% (Standard)":1.10,"CIF Only":1.00,"Invoice Value":1.00}[form.sumInsuredBasis]||1.10)
    : 1.0;
  const valueForPremium = productType==="liability" ? liabLimit : base * sumInsuredMultiplier;

  // ── RISK MODIFIERS ────────────────────────────────────────────────────────
  // Claims history loading: 0 claims = 1.0x, 1 = 1.2x, 2 = 1.45x, 3+ = 1.75x
  const claimsLoad = {None:1.0,"0":1.0,"1":1.2,"2":1.45,"3+":1.75}[form.claims||"None"]||1.0;

  // Vessel age loading: newer = cheaper, older = more expensive
  const buildYear = parseInt(form.buildYear||2015);
  const age = new Date().getFullYear() - buildYear;
  const ageLoad = age<=5?0.85 : age<=10?1.0 : age<=15?1.15 : age<=20?1.3 : 1.55;

  // ICC clause factor for cargo (A=all risk premium, B=named perils, C=basic)
  const iccLoad = {"ICC (A) – All Risks":1.0,"ICC (B) – Named Perils":0.65,"ICC (C) – Basic Cover":0.45,"ICC (Air)":0.85}[form.iccClause]||1.0;

  // Operating area / trade route surcharge
  const routeLoad = (form.operatingWaters==="Blue Water (Open Sea)"||form.tradeRoute==="Worldwide"||form.tradeRoute==="Atlantic"||form.tradeRoute==="Pacific")?1.25
    :(form.tradeRoute==="Arabian Gulf"||form.navArea==="UAE Waters"||form.operatingWaters==="Port / Harbour Only")?0.9:1.0;

  // Use/charter loading for pleasure craft
  const useLoad = (form.use&&form.use.toLowerCase().includes("charter"))?1.3:1.0;

  // Racing surcharge
  const racingLoad = form.racing==="Yes"?1.4:1.0;

  // Conveyance mode surcharge for cargo (air = higher; sea = baseline)
  const modeLoad = {Sea:1.0,"Sea + Air (Multimodal)":1.1,"Air":1.2,"Land (Road/Rail)":0.85,"Sea + Land (Multimodal)":0.95}[form.conveyanceMode]||1.0;

  // War & Strikes add-on (adds ~15% for cargo)
  const warLoad = (productType==="cargo"&&form.warStrikes==="Yes")?1.15:1.0;

  // Perishable / temperature sensitive surcharge
  const perishLoad = form.perishable==="Yes"?1.2:1.0;

  // TPL add-on for hull/pleasure
  const tplLoad = form.tplCover==="Yes"?1.12:1.0;

  // Pollution add-on
  const pollLoad = form.pollution==="Yes"?1.08:1.0;

  // Loss of hire add-on
  const lohLoad = form.lossOfHire==="Yes"?1.1:1.0;

  // ── NEW MODIFIERS: Close all pricing gaps ────────────────────────────────
  // Cargo category
  const cargoCatLoad = {"Electronics & Machinery":1.15,"Steel & Metal Products":0.90,"Foodstuffs & Perishables":1.25,"Chemicals & Hazardous":1.40,"Textiles & Garments":1.00,"Auto Parts & Vehicles":1.10,"Building Materials":0.85,"Pharmaceuticals":1.20,"Oil & Petroleum Products":1.30,"General Merchandise":1.00}[form.cargoCategory]||1.0;

  // Packing type
  const packingLoad = {"Full Container Load (FCL)":0.90,"Less than Container Load (LCL)":1.05,"Bulk (Unpacked)":1.25,"Wooden Crates":1.00,"Cartons on Pallets":1.00,"Breakbulk":1.15,"Refrigerated Container":1.10,"Flat Rack / Open Top":1.20}[form.packingType]||1.0;

  // Letter of credit
  const lcLoad = form.letterOfCredit==="Yes"?0.95:1.0;

  // Hull / vessel type
  const hullTypeLoad = {"Bulk Carrier":1.00,"Container Ship":1.05,"Oil Tanker":1.30,"Chemical Tanker":1.35,"LNG/LPG Carrier":1.40,"General Cargo Vessel":1.00,"Ro-Ro Vessel":1.10,"Car Carrier":1.10,"Refrigerated Cargo":1.05,"Heavy Lift Vessel":1.15,"Tug":1.20,"Supply Vessel":1.15,"Dredger":1.10,"Survey Vessel":0.95,"Offshore Support Vessel":1.20,"Fishing Vessel":1.25,"Passenger Vessel":1.30,"Other":1.15}[form.hullType]||1.0;

  // Classification society
  const classLoad = {"Lloyd's Register":0.95,"DNV":0.95,"Bureau Veritas":0.95,"American Bureau of Shipping":0.95,"ClassNK":1.00,"RINA":1.00,"Korean Register":1.00,"Unclassed":1.40,"Other":1.10}[form.classification]||1.0;

  // Cargo carried on hull
  const cargoCarriedLoad = {"Dry Bulk":1.00,"Liquid Bulk":1.10,"Containerised":1.00,"Break Bulk":1.05,"Refrigerated":1.05,"Heavy Lift":1.10,"Ro-Ro Cargo":1.05,"Hazardous (IMDG)":1.30,"Dredge / Spoil":0.95,"Sand & Aggregates":0.90,"Passengers":1.20,"General Mixed":1.00,"None / Not Applicable":1.00}[form.cargoType]||1.0;

  // Liability sub-type (critical: P&I=1.80 vs Haulier=0.65)
  const liabTypeLoad = {"Ship Repairer's Liability":0.80,"Charterer's Liability":1.00,"Freight Forwarder's Liability":0.70,"Haulier's Liability":0.65,"Terminal Operator's Liability":0.90,"Protection & Indemnity (P&I)":1.80}[form.liabilityType]||1.0;

  // Craft type
  const craftTypeLoad = {"Motor Yacht":1.00,"Sailing Yacht":0.85,"Catamaran":0.90,"Superyacht (24m+)":1.30,"Sport Boat / Speedboat":1.20,"RIB (Rigid Inflatable)":1.10,"Jet Ski / PWC":1.15,"Fishing Boat":0.95,"Inflatable / Dinghy":0.80,"Traditional Wooden Dhow":1.25,"Other":1.10}[form.craftType]||1.0;

  // Owner experience
  const expLoad = {"Less than 1 year":1.30,"1-2 years":1.15,"3-5 years":1.00,"5-10 years":0.90,"10+ years":0.85}[form.experience]||1.0;

  // Engine type
  const engineLoad = {"Inboard":1.00,"Outboard":1.05,"Sail-only":0.80,"Hybrid":0.95,"Jet Drive":1.15}[form.engineType]||1.0;

  // Survey status
  const surveyLoad = {"In Class":0.95,"Due Soon":1.00,"Overdue":1.20,"Not Surveyed":1.35,"N/A":1.00}[form.surveyStatus]||1.0;

  // Hull material
  const materialLoad = {"Steel":1.00,"GRP / Fiberglass":0.95,"Aluminum":1.00,"Wood":1.25,"Composite":0.95,"Other":1.10}[form.hullMaterial]||1.0;

  // ── CARGO OPEN COVER GAP-FIX MODIFIERS ─────────────────────────────────
  const inlandLoad = {"Yes":1.12,"No":1.00}[form.inlandTransit]||1.0;
  const storageLoad = {"None / In Transit Only":1.00,"Up to 30 days":1.05,"31–60 days":1.10,"61–90 days":1.18,"Over 90 days":1.30}[form.storageDuration]||1.0;
  const dutyLoad = {"Yes":1.08,"No":1.00}[form.dutyInsurance]||1.0;
  const ivLoad = {"Yes":1.05,"No":1.00}[form.increasedValue]||1.0;
  const transLoad = {"Yes":1.10,"No":1.00}[form.transshipment]||1.0;

  // ENGINE POWER (KW) — hull
  const ep = parseFloat(form.enginePower||0);
  const enginePowerLoad = ep<=0?1.0 : ep<=500?0.90 : ep<=2000?1.0 : ep<=5000?1.08 : ep<=10000?1.15 : 1.25;

  // GRT (Gross Tonnage) — hull
  const grt = parseFloat(form.grt||0);
  const grtLoad = grt<=0?1.0 : grt<=500?0.85 : grt<=5000?1.0 : grt<=25000?1.10 : grt<=50000?1.20 : 1.30;

  // LENGTH — pleasure craft
  const len = parseFloat(form.length||0);
  const lengthLoad = len<=0?1.0 : len<=8?0.85 : len<=15?1.0 : len<=24?1.15 : len<=40?1.30 : 1.45;

  // CREW_SIZE — liability
  const crw = parseInt(form.crew||0);
  const crewLoad = crw<=0?1.0 : crw<=10?1.0 : crw<=25?1.05 : crw<=50?1.10 : crw<=100?1.15 : 1.20;

  // ANNUAL REVENUE — liability (higher revenue = more exposure)
  const rev = parseFloat(form.annualRevenue||0);
  const revenueLoad = rev<=0?1.0 : rev<=5000000?0.90 : rev<=20000000?1.0 : rev<=50000000?1.08 : rev<=100000000?1.15 : 1.25;

  // FLEET SIZE — liability (P&I / Charterer's: more vessels = more risk)
  const fleet = parseInt(form.fleetSize||0);
  const fleetLoad = fleet<=0?1.0 : fleet<=3?0.90 : fleet<=10?1.0 : fleet<=25?1.10 : fleet<=50?1.20 : 1.35;

  // ── BASE RATES (industry-accurate) ───────────────────────────────────────
  // Cargo:   ICC(A) standard goods 0.15%–0.35% of CIF+10% insured value
  //          Dangerous/perishable up to 1%–2%
  // Hull:    Commercial ships 0.5%–1.5%; barge 0.6%–1.2%
  // Pleasure: Yachts/speedboats 1%–3%; jet ski 2%–4%
  // Liability: rated as flat % of declared limit (0.8%–2.5%)

  const INSURER_FACTORS = [0.92, 0.97, 1.00, 1.05, 1.11]; // spread between cheapest–most expensive insurer

  const BASE_RATES = {
    cargo:     { min:0.0015, max:0.0035 }, // 0.15%–0.35% of cargo value
    hull:      { min:0.005,  max:0.015  }, // 0.5%–1.5% of hull value
    pleasure:  { min:0.010,  max:0.025  }, // 1%–2.5% of craft value
    jetski:    { min:0.020,  max:0.040  }, // 2%–4% of PWC value
    speedboat: { min:0.015,  max:0.030  }, // 1.5%–3%
    barge:     { min:0.006,  max:0.014  }, // 0.6%–1.4%
    liability: { min:0.008,  max:0.025  }, // 0.8%–2.5% of liability limit
  };

  const r = BASE_RATES[productType]||BASE_RATES.hull;

  // ── INCLUSIONS PER PRODUCT ────────────────────────────────────────────────
  const INCLUSIONS = {
    cargo:     ["Institute Cargo Clauses","General Average","Theft & Pilferage","Jettison & Washing Overboard","Contamination Risk","Sue & Labour"],
    hull:      ["Total Loss Cover","Collision Liability","General Average & Salvage","Fire & Explosion","Machinery Breakdown","War Risk (if elected)"],
    pleasure:  ["Agreed Hull Value","Third Party Liability","Fire & Theft","Storm Damage","Personal Accident","Emergency Towing"],
    jetski:    ["Agreed Value Cover","Third Party Liability","Fire & Theft","Rescue & Recovery","Personal Accident"],
    speedboat: ["Agreed Value Cover","Third Party Liability","Fire & Theft","Storm & Flood","Trailer Cover (if applicable)"],
    barge:     ["Total Loss & CTL","Collision Liability","Pollution Cover","Loss of Hire","Fire & Explosion","Wreck Removal"],
    liability: ["Third Party Property Damage","Bodily Injury","Legal Defence Costs","Pollution Liability","Wreck Removal","Cargo Liability"],
  };

  // ── DEDUCTIBLES (industry standard: % of insured value, not premium) ─────
  // Typical deductible: 1%–3% of insured value for commercial, flat for small craft
  const deductibleRate = productType==="cargo"?0.005
    : productType==="hull"?0.01
    : productType==="barge"?0.0075
    : 0.02; // pleasure, jetski, speedboat

  const inclusions = INCLUSIONS[productType]||INCLUSIONS.hull;

  return INSURERS.map((ins, idx) => {
    const insFactorBase = r.min + (r.max - r.min) * INSURER_FACTORS[idx];

    // Apply all risk loadings
    let combinedLoad = claimsLoad * ageLoad * iccLoad * routeLoad * useLoad
      * racingLoad * modeLoad * warLoad * perishLoad * tplLoad * pollLoad * lohLoad
      * cargoCatLoad * packingLoad * lcLoad * hullTypeLoad * classLoad
      * cargoCarriedLoad * liabTypeLoad * craftTypeLoad * expLoad * engineLoad
      * surveyLoad * materialLoad * grtLoad * lengthLoad * crewLoad * enginePowerLoad
      * revenueLoad * fleetLoad
      * inlandLoad * storageLoad * dutyLoad * ivLoad * transLoad;
    combinedLoad = Math.max(0.35, Math.min(combinedLoad, 4.0));

    const finalRate = insFactorBase * combinedLoad;
    const premium = Math.round(valueForPremium * finalRate);

    // Deductible = % of insured value (realistic)
    const deductible = Math.round(base * deductibleRate * (0.8 + Math.random() * 0.4));

    // Coverage = insured value using sumInsuredBasis for cargo, or 100% agreed value for hull/pleasure
    const coverage = productType==="cargo"
      ? Math.round(base * sumInsuredMultiplier)
      : Math.round(base * 1.00);  // agreed hull/craft value

    // Underwriting score: driven by risk factors (not random)
    const riskScore = Math.round(
      95
      - (claimsLoad-1)*30
      - (ageLoad-1)*15
      - (routeLoad-1)*10
      - (liabTypeLoad-1)*12
      - (classLoad-1)*8
      - (craftTypeLoad-1)*6
      - (surveyLoad-1)*8
      + Math.random()*5 // small insurer-specific variance
    );
    const score = Math.max(45, Math.min(99, riskScore));

    // Pick 3–5 relevant inclusions for this insurer
    const numInclusions = 3 + (idx % 3);
    const insInclusions = inclusions.slice(0, numInclusions);

    return {
      ...ins,
      premium,
      deductible,
      coverage,
      score,
      responseTime: `${[2,4,1,3,6][idx]} hrs`,
      inclusions: insInclusions,
      // Extra data for display
      annualRate: (finalRate*100).toFixed(3),
      deductiblePct: (deductibleRate*100).toFixed(1),
    };
  }).sort((a,b) => a.premium - b.premium);
}

const validators = {
  vesselName:v=>v&&v.trim().length>=2, craftName:v=>v&&v.trim().length>=2,
  vesselValue:v=>v&&parseFloat(v)>0, value:v=>v&&parseFloat(v)>0, boatValue:v=>v&&parseFloat(v)>0, pwcValue:v=>v&&parseFloat(v)>0, craftValue:v=>v&&parseFloat(v)>0,
  cargoValue:v=>v&&parseFloat(v)>0, annualTurnover:v=>v&&parseFloat(v)>0, liabilityLimit:v=>v&&parseFloat(v)>0,
  originPort:v=>v&&v.trim().length>=2, destinationPort:v=>v&&v.trim().length>=2,
  commodity:v=>v&&v.trim().length>=2, policyType:v=>!!v, iccClause:v=>!!v,
  liabilityType:v=>!!v, hullType:v=>!!v, craftType:v=>!!v,
  email:v=>v&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), phone:v=>v&&v.replace(/\D/g,"").length>=7,
  fullName:v=>v&&v.trim().split(" ").length>=2, grt:v=>v&&parseFloat(v)>0,
  buildYear:v=>!!v, flag:v=>!!v, country:v=>!!v, tradeRoute:v=>!!v, navArea:v=>!!v, waters:v=>!!v, vesselType:v=>!!v, boatType:v=>!!v, brand:v=>!!v,
  hullMaterial:v=>!!v, surveyStatus:v=>!!v, sumInsuredBasis:v=>!!v,
  inlandTransit:v=>!!v, storageDuration:v=>!!v, transshipment:v=>!!v, dutyInsurance:v=>!!v, increasedValue:v=>!!v,
};

const TOOLTIPS = {
  vesselValue:"The agreed market value of your vessel. This determines your premium and the maximum payout in a total loss claim.",
  craftValue:"Current market value of your pleasure craft. We recommend a professional valuation for vessels over AED 200,000.",
  value:"The agreed market value of your yacht.",
  boatValue:"Current market replacement value. Include engine, trailer, and standard equipment.",
  pwcValue:"Current market value including standard accessories.",
  grt:"Gross Register Tonnage — the total internal volume of the vessel. Found on the vessel's certificate of registry.",
  imo:"International Maritime Organization number — a unique 7-digit ID assigned to seagoing ships over 100 GT.",
  tradeRoute:"The primary geographic area where your vessel operates. This directly affects your risk rating.",
  claims:"Honest claims history is essential — undisclosed claims can void your policy.",
  email:"Your quote confirmation and policy documents will be sent here.",
  effectiveDate:"The date your coverage begins. Must be a future date. We recommend at least 7 days for policy processing.",
  soloNav:"Solo passages over 24 hours are considered higher risk and may affect your premium.",
  racing:"Competition or racing use typically requires a separate specialist policy.",
  pandi:"P&I Club membership provides third-party liability cover for bodily injury and property damage.",
  classification:"Classification society certification demonstrates your vessel meets international safety standards.",
  lossOfHire:"Compensates for loss of revenue if your vessel is unable to trade due to an insured incident.",
  pollution:"Required for vessels carrying fuel, chemicals, or other pollutants. Mandatory in many jurisdictions.",
  policyType:"Open Cover provides automatic annual protection for all shipments. Single Transit covers one specific shipment only.",
  iccClause:"ICC (A) is the broadest cover — All Risks. ICC (B) covers specific named perils. ICC (C) is the most basic.",
  cargoValue:"Insure at CIF value (Cost + Insurance + Freight) plus 10% uplift, as per international trade practice.",
  annualTurnover:"Total estimated value of all shipments over 12 months. Used to calculate the open cover premium.",
  incoterms:"Determines who bears the risk — seller or buyer — and from which point in the journey.",
  warStrikes:"War & Strikes (Institute War Clauses / SRCC) is an add-on covering political risks and civil unrest.",
  packingType:"Better packing (e.g. containerised) typically attracts lower premium rates.",
  letterOfCredit:"Banks issuing Letters of Credit often require specific wording on the policy. Select Yes if applicable.",
  operatingWaters:"Orient Insurance covers both blue water (open sea) and protected inland/coastal waters. Affects your rating.",
  tplCover:"Orient explicitly offers Third Party Liability alongside hull cover for pleasure crafts — covers damage to other vessels, piers, and third-party injury.",
  liabilityLimit:"Maximum the insurer pays for any single liability claim. Select based on the scale of your operations.",
  liabilityType:"Orient Marine Liability covers 6 distinct roles. Select the one matching your business.",
  hullMaterial:"The primary hull construction material. Wood and composite hulls attract higher premiums due to fire and damage susceptibility.",
  surveyStatus:"Current survey or classification status. Overdue surveys or unsurveyed vessels attract significant premium surcharges.",
  sumInsuredBasis:"CIF + 10% is the international standard (Cost + Insurance + Freight + 10% anticipated profit). Required under ICC rules.",
  annualRevenue:"Your company's annual gross revenue. Used as a proxy for risk exposure in liability underwriting.",
  enginePower:"Main engine power output in kW or HP. Higher-powered engines can indicate higher risk profiles.",
  fleetSize:"Total number of vessels in your fleet. Affects aggregate P&I exposure and may qualify for fleet discounts.",
  maxAnySending:"Maximum value exposed on any one vessel or single sending. Required for open cover — sets the per-shipment limit.",
  maxAnyLocation:"Maximum value of goods stored at any one location (warehouse, port). Sets the storage accumulation limit.",
  inlandTransit:"Extends cover from warehouse-to-warehouse (door-to-door) instead of port-to-port only. Standard for most open covers.",
  storageDuration:"Duration goods may be stored in warehouse before/after transit. Longer storage increases risk exposure.",
  transshipment:"Whether cargo will be transferred between vessels or modes of transport during the journey. Increases handling risk.",
  dutyInsurance:"Covers import duties and taxes payable even if goods are lost or damaged. Typically 5–10% of cargo value.",
  increasedValue:"Additional cover for value above the declared CIF amount. Protects against market price increases during transit.",
}

// ─── THEME TOGGLE BUTTON ──────────────────────────────────────────────────────
function ThemeToggle({ dark, onToggle }) {
  const t = dark ? DARK : LIGHT;
  return (
    <button onClick={onToggle}
      style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 14px", borderRadius:20, border:`1px solid ${t.border}`, background:t.surface, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}>
      <div style={{ width:32, height:18, borderRadius:9, background: dark?"#0ea5e9":"#e2e8f0", position:"relative", transition:"background 0.3s", flexShrink:0 }}>
        <div style={{ width:14, height:14, borderRadius:"50%", background:"#fff", position:"absolute", top:2, left: dark?16:2, transition:"left 0.3s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)" }} />
      </div>
      <span style={{ fontSize:13, color:t.textMuted }}>{dark ? "🌙 Dark" : "☀️ Light"}</span>
    </button>
  );
}

// ─── API CONFIG ───────────────────────────────────────────────────────────────
const API_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api")
  : "http://localhost:4000/api";

async function submitLead(leadData) {
  try {
    const res = await fetch(`${API_BASE}/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leadData),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null; // silently fail — offline mode
  }
}

async function uploadDocuments(leadId, formData) {
  try {
    const res = await fetch(`${API_BASE}/leads/${leadId}/documents`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function MarineInsuranceLanding() {
  const [dark, setDark]             = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('oceanus-theme') !== 'light';
    }
    return true;
  });
  const [screen, setScreen]         = useState("landing");
  const [productType, setProductType] = useState(null);
  const [formStep, setFormStep]     = useState(0);
  const [form, setForm]             = useState({});
  const [touched, setTouched]       = useState({});
  const [quotes, setQuotes]         = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [dashTab, setDashTab]       = useState("overview");
  const [currency, setCurrency]     = useState("AED");
  const [leadId, setLeadId]         = useState(null);   // backend lead ID
  const [leadRef, setLeadRef]       = useState(null);   // e.g. OCN-2024-0001
  const [submittingLead, setSubmittingLead] = useState(false);

  // Sync theme preference to localStorage
  useEffect(() => {
    try { localStorage.setItem('oceanus-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);

  // ── Load dynamic catalog from API ──────────────────────────────────────
  const { data: catalog } = usePublicCatalog();
  const { data: refData } = usePublicReferenceData();
  const calculateQuotesMutation = useCalculateQuotes();

  // Derive dynamic product types from API (fallback to static)
  const dynamicProductTypes = catalog?.products?.map(p => ({
    id: p.code.toLowerCase(),
    label: p.label,
    icon: p.iconKey,
    desc: p.description,
    color: p.color,
    estMins: p.estimatedMinutes,
    steps: JSON.parse(p.formStepsJson),
    badge: p.badge,
  })) || PRODUCT_TYPES;

  // Derive dynamic defaults from API
  const dynamicDefaults = {};
  if (catalog?.products) {
    for (const p of catalog.products) {
      try {
        dynamicDefaults[p.code.toLowerCase()] = { ...JSON.parse(p.defaultsJson), effectiveDate: todayPlus(7) };
      } catch { dynamicDefaults[p.code.toLowerCase()] = { effectiveDate: todayPlus(7) }; }
    }
  }
  const activeDefaults = Object.keys(dynamicDefaults).length > 0 ? dynamicDefaults : DEFAULTS;

  // Derive dynamic reference data lists (fallback to static)
  const dynamicCountries = refData?.COUNTRY || COUNTRIES;
  const dynamicNavLimits = refData?.NAV_AREA || NAV_LIMITS;
  const dynamicCurrencies = refData?.CURRENCY || CURRENCIES;

  const t = dark ? DARK : LIGHT;
  const product = dynamicProductTypes.find(p=>p.id===productType);
  const upd = (k,v) => { setForm(f=>({...f,[k]:v})); setTouched(t=>({...t,[k]:true})); };
  const touch = k => setTouched(t=>({...t,[k]:true}));

  const handleSelectProduct = (id) => { setProductType(id); setForm({...activeDefaults[id]||{}}); setTouched({}); setFormStep(0); setScreen("form"); };

  const handleGetQuotes = async () => {
    // Use server-side quote engine (fall back to client-side if API fails)
    let generated;
    try {
      generated = await calculateQuotesMutation.mutateAsync({ productCode: productType, formData: form });
    } catch {
      generated = generateQuotes(form, productType);
    }
    setQuotes(generated);
    setScreen("quotes");
    // Submit lead to backend (fire & forget — app works offline too)
    setSubmittingLead(true);
    const result = await submitLead({
      productType,
      formData:       form,
      quotesData:     generated,
      selectedQuote:  null,
      fullName:       form.fullName,
      email:          form.email,
      phone:          form.phone,
      company:        form.company,
      nationality:    form.nationality,
      residence:      form.residence,
      contactPref:    form.contactPref,
      currency,
      source: "web",
    });
    if (result?.lead_id) {
      setLeadId(result.lead_id);
      setLeadRef(result.lead_ref);
    }
    setSubmittingLead(false);
  };

  const handleSelectQuote = async (q, tab="overview") => {
    setSelectedQuote(q);
    setDashTab(tab);
    setScreen("dashboard");
    // Update lead with selected quote
    if (leadId) {
      try {
        await fetch(`${API_BASE}/leads/${leadId}/select`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: `Customer selected ${q.name} — ${currencySymbol(currency)}${q.premium.toLocaleString()} premium` }),
        });
      } catch {}
    }
  };

  const handleReset = () => { setScreen("landing"); setProductType(null); setForm({}); setTouched({}); setFormStep(0); setQuotes([]); setLeadId(null); setLeadRef(null); };

  const formProps = { form, upd, touch, touched, currency, product,
    onNext:()=>formStep<product.steps.length-1?setFormStep(s=>s+1):handleGetQuotes(),
    onBack:()=>formStep===0?setScreen("landing"):setFormStep(s=>s-1),
  };

  return (
    <ThemeCtx.Provider value={{ dark, t }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin:0; }
        input, select, textarea {
          background: ${t.input} !important;
          border-color: ${t.inputBorder} !important;
          color: ${t.inputText} !important;
        }
        input::placeholder, textarea::placeholder { color: ${t.textMuted} !important; opacity:1; }
        select option { background: ${t.selectOption}; color: ${t.inputText}; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: ${dark?"invert(1)":"none"}; opacity:0.5; }
        * { transition: background-color 0.25s, border-color 0.25s, color 0.2s; }
        input, select, textarea, button { transition: background-color 0.25s, border-color 0.25s, color 0.2s, box-shadow 0.2s !important; }
      `}</style>
      <div style={{fontFamily:"'Georgia','Times New Roman',serif",background:t.bg,minHeight:"100vh",color:t.text}}>
        {screen==="landing"   && <Landing onSelect={handleSelectProduct} currency={currency} onCurrency={setCurrency} dark={dark} onToggleDark={()=>setDark(d=>!d)} productTypes={dynamicProductTypes} currencies={dynamicCurrencies} />}
        {screen==="form"      && <FormShell product={product} step={formStep} onHome={handleReset} dark={dark} onToggleDark={()=>setDark(d=>!d)}><ProductForm productType={productType} step={formStep} {...formProps} countries={dynamicCountries} navLimits={dynamicNavLimits} refData={refData} /></FormShell>}
        {screen==="quotes"    && <QuotesScreen quotes={quotes} form={form} product={product} currency={currency} onSelect={handleSelectQuote} onBack={()=>setScreen("form")} onHome={handleReset} dark={dark} onToggleDark={()=>setDark(d=>!d)} leadRef={leadRef} submittingLead={submittingLead} />}
        {screen==="dashboard" && selectedQuote && <DashboardScreen quote={selectedQuote} form={form} product={product} currency={currency} dashTab={dashTab} setDashTab={setDashTab} onBack={()=>setScreen("quotes")} onHome={handleReset} dark={dark} onToggleDark={()=>setDark(d=>!d)} leadId={leadId} leadRef={leadRef} onDocUpload={uploadDocuments} />}
      </div>
    </ThemeCtx.Provider>
  );
}

// ─── SHARED HEADER ────────────────────────────────────────────────────────────
function AppHeader({ onHome, dark, onToggleDark, right, below }) {
  const { t } = useTheme();
  return (
    <header style={{background:t.header,borderBottom:`1px solid ${t.border}`,backdropFilter:"blur(8px)",position:"sticky",top:0,zIndex:100,boxShadow: dark?"none":"0 1px 12px rgba(0,0,0,0.06)"}}>
      <div style={{maxWidth:1100,margin:"0 auto",padding:"13px 24px",display:"flex",alignItems:"center",gap:16}}>
        <button onClick={onHome} style={{background:"none",border:"none",color:t.text,fontSize:13,fontWeight:700,letterSpacing:"0.15em",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"Georgia,serif",whiteSpace:"nowrap"}}>
          <span style={{filter:"drop-shadow(0 0 6px rgba(14,165,233,0.7))"}}>⚓</span> OCEANUS
        </button>
        {right}
        <ThemeToggle dark={dark} onToggle={onToggleDark} />
      </div>
      {below}
    </header>
  );
}

// ─── LANDING ─────────────────────────────────────────────────────────────────
function Landing({ onSelect, currency, onCurrency, dark, onToggleDark, productTypes, currencies }) {
  const { t } = useTheme();
  const [hovered, setHovered] = useState(null);
  const activePT = productTypes || PRODUCT_TYPES;
  const activeCurrencies = currencies || CURRENCIES;
  return (
    <div style={{minHeight:"100vh",background:t.bg,overflow:"hidden",position:"relative"}}>
      <div style={{position:"absolute",inset:0,background:t.landingGrad}} />
      {/* Header */}
      <div style={{position:"relative",zIndex:10,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 40px",borderBottom:`1px solid ${t.border}`,background:t.header,backdropFilter:"blur(8px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22,filter:"drop-shadow(0 0 10px rgba(14,165,233,0.9))"}}>⚓</span>
          <span style={{fontSize:17,fontWeight:700,letterSpacing:"0.2em",color:t.text}}>OCEANUS</span>
          <span style={{fontSize:10,color:t.textMuted,letterSpacing:"0.12em",textTransform:"uppercase",marginLeft:4}}>Marine Insurance Exchange</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {/* Currency */}
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <span style={{fontSize:11,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.1em"}}>Currency:</span>
            {activeCurrencies.map(c=>(
              <button key={c} onClick={()=>onCurrency(c)} style={{padding:"5px 11px",borderRadius:6,border:`1px solid ${currency===c?"#0ea5e9":t.border}`,background:currency===c?"rgba(14,165,233,0.12)":t.surface,color:currency===c?"#0ea5e9":t.textMuted,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                {c}
              </button>
            ))}
          </div>
          <ThemeToggle dark={dark} onToggle={onToggleDark} />
        </div>
      </div>

      {/* Hero */}
      <div style={{position:"relative",zIndex:10,textAlign:"center",padding:"56px 24px 40px"}}>
        <div style={{display:"inline-block",fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"#0ea5e9",background:"rgba(14,165,233,0.1)",border:"1px solid rgba(14,165,233,0.25)",padding:"6px 16px",borderRadius:20,marginBottom:22}}>
          50+ Insurer Partners · Instant Quotes · UAE & Worldwide
        </div>
        <h1 style={{fontSize:50,fontWeight:800,lineHeight:1.1,margin:"0 0 16px",color:t.text,letterSpacing:"-0.02em"}}>
          Marine Insurance<br /><span style={{color:"#0ea5e9"}}>Simplified.</span>
        </h1>
        <p style={{fontSize:16,color:t.textMuted,lineHeight:1.7,maxWidth:480,margin:"0 auto 48px"}}>
          Select your vessel type — each has its own tailored form with smart defaults. No irrelevant fields, just what matters for your coverage.
        </p>
      </div>

      {/* Product Cards */}
      <div style={{position:"relative",zIndex:10,maxWidth:1080,margin:"0 auto",padding:"0 24px 80px"}}>
        <p style={{textAlign:"center",fontSize:11,color:t.textFaint,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:22}}>Choose your product to begin</p>
        {/* Top row: 4 Orient-partner products */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:14}}>
          {activePT.slice(0,4).map(p=>(
            <button key={p.id} onMouseEnter={()=>setHovered(p.id)} onMouseLeave={()=>setHovered(null)} onClick={()=>onSelect(p.id)}
              style={{background:hovered===p.id?`rgba(${hexToRgb(p.color)},0.08)`:t.surface,border:`1px solid ${hovered===p.id?p.color:(p.badge?"rgba(249,115,22,0.25)":t.border)}`,borderRadius:16,padding:"22px 16px 18px",cursor:"pointer",textAlign:"center",fontFamily:"inherit",transform:hovered===p.id?"translateY(-5px)":"none",boxShadow:hovered===p.id?`0 12px 32px rgba(${hexToRgb(p.color)},0.18)`:(dark?"none":"0 2px 8px rgba(0,0,0,0.06)"),transition:"all 0.2s",position:"relative"}}>
              {p.badge && <div style={{position:"absolute",top:10,right:10,fontSize:9,fontWeight:700,color:"#f97316",background:"rgba(249,115,22,0.1)",border:"1px solid rgba(249,115,22,0.25)",padding:"2px 7px",borderRadius:8,letterSpacing:"0.06em"}}>🤝 {p.badge}</div>}
              <div style={{fontSize:30,marginBottom:8,filter:hovered===p.id?`drop-shadow(0 0 12px ${p.color})`:"none",transition:"filter 0.2s"}}>{p.icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:hovered===p.id?p.color:t.textSub,marginBottom:5,lineHeight:1.3}}>{p.label}</div>
              <div style={{fontSize:11,color:t.textMuted,lineHeight:1.5,marginBottom:10}}>{p.desc}</div>
              <div style={{borderTop:`1px solid ${hovered===p.id?`rgba(${hexToRgb(p.color)},0.3)`:t.statBorder}`,paddingTop:8,fontSize:10,color:hovered===p.id?p.color:t.textFaint,fontWeight:700,letterSpacing:"0.06em",transition:"all 0.2s"}}>
                {hovered===p.id?"Get Quote →":`~${p.estMins} min`}
              </div>
            </button>
          ))}
        </div>
        {/* Bottom row: 3 additional vessel types */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {activePT.slice(4).map(p=>(
            <button key={p.id} onMouseEnter={()=>setHovered(p.id)} onMouseLeave={()=>setHovered(null)} onClick={()=>onSelect(p.id)}
              style={{background:hovered===p.id?`rgba(${hexToRgb(p.color)},0.08)`:t.surface,border:`1px solid ${hovered===p.id?p.color:t.border}`,borderRadius:16,padding:"20px 16px 16px",cursor:"pointer",textAlign:"center",fontFamily:"inherit",transform:hovered===p.id?"translateY(-5px)":"none",boxShadow:hovered===p.id?`0 12px 32px rgba(${hexToRgb(p.color)},0.18)`:(dark?"none":"0 2px 8px rgba(0,0,0,0.06)"),transition:"all 0.2s"}}>
              <div style={{fontSize:28,marginBottom:7,filter:hovered===p.id?`drop-shadow(0 0 10px ${p.color})`:"none",transition:"filter 0.2s"}}>{p.icon}</div>
              <div style={{fontSize:12,fontWeight:700,color:hovered===p.id?p.color:t.textSub,marginBottom:5,lineHeight:1.3}}>{p.label}</div>
              <div style={{fontSize:11,color:t.textMuted,lineHeight:1.5,marginBottom:10}}>{p.desc}</div>
              <div style={{borderTop:`1px solid ${hovered===p.id?`rgba(${hexToRgb(p.color)},0.3)`:t.statBorder}`,paddingTop:8,fontSize:10,color:hovered===p.id?p.color:t.textFaint,fontWeight:700,letterSpacing:"0.06em",transition:"all 0.2s"}}>
                {hovered===p.id?"Get Quote →":`~${p.estMins} min`}
              </div>
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:44,justifyContent:"center",marginTop:52,flexWrap:"wrap"}}>
          {[["$2.4B+","Insured annually"],["50+","Insurer partners"],["3 min","Avg. quote time"],["98%","Claims satisfaction"]].map(([v,l])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:700,color:"#0ea5e9"}}>{v}</div>
              <div style={{fontSize:10,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginTop:4}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FORM SHELL ───────────────────────────────────────────────────────────────
function FormShell({ product, step, onHome, dark, onToggleDark, children }) {
  const { t } = useTheme();
  if (!product) return null;
  const totalSteps = product.steps.length;
  const pct = Math.round((step/totalSteps)*100);
  const minsLeft = Math.max(1,Math.round(product.estMins*(1-step/totalSteps)));
  return (
    <div style={{minHeight:"100vh",background:t.bg}}>
      <AppHeader onHome={onHome} dark={dark} onToggleDark={onToggleDark}
        right={
          <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:0,overflowX:"auto"}}>
            {product.steps.map((s,i)=>(
              <div key={s} style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:24,height:24,borderRadius:"50%",border:`2px solid ${i<=step?"#0ea5e9":t.border}`,background:i<step?"#0ea5e9":i===step?"rgba(14,165,233,0.15)":t.surface,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:i<=step?"#fff":t.textFaint,fontWeight:700,flexShrink:0,transition:"all 0.3s"}}>
                  {i<step?"✓":i+1}
                </div>
                <span style={{fontSize:11,color:i===step?t.textSub:t.textFaint,whiteSpace:"nowrap"}}>{s}</span>
                {i<product.steps.length-1&&<div style={{width:18,height:2,background:i<step?"#0ea5e9":t.border,margin:"0 6px",transition:"background 0.3s"}} />}
              </div>
            ))}
          </div>
        }
        below={
          <div style={{maxWidth:1100,margin:"0 auto",padding:"0 24px 10px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1,height:3,background:t.border,borderRadius:99,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#0ea5e9,#6366f1)",borderRadius:99,transition:"width 0.5s ease"}} />
            </div>
            <div style={{fontSize:11,color:t.textMuted,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6}}>
              <span>{pct}% complete</span>
              {step<totalSteps&&<><span style={{color:t.textFaintest}}>·</span><span style={{color:"#10b981"}}>~{minsLeft} min left</span></>}
            </div>
          </div>
        }
      />
      <main style={{maxWidth:860,margin:"0 auto",padding:"36px 24px 80px"}}>{children}</main>
    </div>
  );
}

// ─── PRODUCT FORM ROUTER ──────────────────────────────────────────────────────
function ProductForm({ productType, ...props }) {
  if (productType==="cargo")     return <MarineCargoForm {...props} />;
  if (productType==="hull")      return <MarineHullForm {...props} />;
  if (productType==="liability") return <MarineLiabilityForm {...props} />;
  if (productType==="pleasure")  return <PleasureCraftForm {...props} />;
  if (productType==="jetski")    return <JetSkiConversational {...props} />;
  if (productType==="speedboat") return <SpeedboatConversational {...props} />;
  if (productType==="barge")     return <BargeForm {...props} />;
  return null;
}

// ─── ORIENT BADGE BANNER ─────────────────────────────────────────────────────
function OrientBanner() {
  const { t } = useTheme();
  return (
    <div style={{background:"rgba(249,115,22,0.06)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:10,padding:"11px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:10}}>
      <span style={{fontSize:18}}>🤝</span>
      <div>
        <div style={{fontSize:12,fontWeight:700,color:"#f97316"}}>Orient Insurance UAE — Partner Product</div>
        <div style={{fontSize:11,color:t.textMuted}}>Al-Futtaim Group · AM Best A· rated · UAE licensed insurer since 1982</div>
      </div>
    </div>
  );
}

// ─── MARINE CARGO FORM (Orient Insurance UAE product) ─────────────────────────
function MarineCargoForm({ step, form, upd, touch, touched, currency, onNext, onBack, countries }) {
  const { t } = useTheme();
  const sym = currencySymbol(currency);
  const isOpenCover = form.policyType === "Open Cover";

  if (step === 0) return (
    <FCard icon="📦" title="Policy Type" desc="Choose how you'd like to insure your goods — one shipment or all year round.">
      {/* Policy Type Selector — large visual cards */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:24}}>
        {[
          { id:"Single Transit", icon:"📋", title:"Single Transit", sub:"One specific shipment", bullets:["Perfect for importers/exporters with occasional shipments","Cover from origin to final destination","Sea, Land, or Air conveyance"] },
          { id:"Open Cover",     icon:"🔄", title:"Open Cover (Annual)", sub:"All shipments, all year", bullets:["Automatic cover for every shipment","No need to declare each one","Ideal for regular traders & frequent shippers"] },
        ].map(opt=>{
          const active = form.policyType===opt.id;
          return (
            <button key={opt.id} onClick={()=>upd("policyType",opt.id)}
              style={{background:active?"rgba(249,115,22,0.08)":t.surface,border:`2px solid ${active?"#f97316":t.border}`,borderRadius:14,padding:"20px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all 0.2s",boxShadow:active?"0 0 0 3px rgba(249,115,22,0.12)":"none"}}>
              <div style={{fontSize:28,marginBottom:8}}>{opt.icon}</div>
              <div style={{fontSize:15,fontWeight:700,color:active?"#f97316":t.text,marginBottom:3}}>{opt.title}</div>
              <div style={{fontSize:12,color:t.textMuted,marginBottom:12}}>{opt.sub}</div>
              {opt.bullets.map(b=><div key={b} style={{fontSize:12,color:t.textSub,marginBottom:5,display:"flex",gap:7,alignItems:"flex-start"}}><span style={{color:active?"#f97316":"#10b981",flexShrink:0}}>✓</span>{b}</div>)}
              {active && <div style={{marginTop:12,fontSize:11,fontWeight:700,color:"#f97316",letterSpacing:"0.06em"}}>◉ SELECTED</div>}
            </button>
          );
        })}
      </div>

      {/* Conveyance Mode */}
      <div style={{marginBottom:22}}>
        <div style={{fontSize:10,fontWeight:700,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Mode of Conveyance</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {["Sea","Air","Land (Road/Rail)","Multimodal (Sea + Land)","Multimodal (Sea + Air)"].map(mode=>{
            const active = form.conveyanceMode===mode;
            return <button key={mode} onClick={()=>upd("conveyanceMode",mode)} style={{padding:"9px 16px",border:`1px solid ${active?"#f97316":t.border}`,borderRadius:8,fontSize:12,cursor:"pointer",color:active?"#f97316":t.textSub,background:active?"rgba(249,115,22,0.08)":t.surface,fontFamily:"inherit",transition:"all 0.15s"}}>{mode}</button>;
          })}
        </div>
      </div>

      {/* Insurable Interest */}
      <div style={{marginBottom:22}}>
        <VF label="Insurable Interest" fkey="interestType" form={form} touched={touched} tip={TOOLTIPS.incoterms}>
          <RG options={["Buyer (CIF)","Seller (FOB)","Both (Contingency)"]} value={form.interestType||""} onChange={v=>upd("interestType",v)} inline />
        </VF>
      </div>

      {/* Orient partner notice */}
      <div style={{background:"rgba(249,115,22,0.06)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:10,padding:"12px 16px",marginBottom:4,display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:18}}>🤝</span>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:"#f97316"}}>Orient Insurance UAE Partner Product</div>
          <div style={{fontSize:11,color:t.textMuted}}>Powered by Orient Insurance (Al-Futtaim Group) · AM Best A· rated · UAE licensed insurer</div>
        </div>
      </div>
      <BtnRow><Btn onClick={onBack}>← Back</Btn><Btn primary onClick={onNext}>Continue →</Btn></BtnRow>
    </FCard>
  );

  if (step === 1) {
    const valueLabel = isOpenCover ? `Estimated Annual Turnover (${currency})` : `Shipment / Cargo Value (${currency})`;
    const valueFkey  = isOpenCover ? "annualTurnover" : "cargoValue";
    return (
      <FCard icon="🗂️" title="Shipment Details" desc={isOpenCover ? "Tell us about the goods you ship annually." : "Tell us about this specific shipment."}>
        <G2>
          {/* Origin & Destination — only for single transit */}
          {!isOpenCover && <>
            <VF label="Origin Port / City" fkey="originPort" form={form} touched={touched}><In value={form.originPort||""} onChange={v=>upd("originPort",v)} onBlur={()=>touch("originPort")} placeholder="e.g. Jebel Ali, UAE" /></VF>
            <VF label="Destination Port / City" fkey="destinationPort" form={form} touched={touched}><In value={form.destinationPort||""} onChange={v=>upd("destinationPort",v)} onBlur={()=>touch("destinationPort")} placeholder="e.g. Hamburg, Germany" /></VF>
          </>}

          {/* Trade route — for open cover */}
          {isOpenCover && <>
            <VF label="Primary Trade Lane" fkey="tradeRoute" form={form} touched={touched}>
              <Sel value={form.tradeRoute||""} onChange={v=>upd("tradeRoute",v)} options={["UAE / Arabian Gulf","Gulf to Indian Subcontinent","Gulf to Far East","Gulf to Europe / Med","Gulf to Africa","Gulf to Americas","Worldwide"]} placeholder="Select trade lane" />
            </VF>
            <VF label="No. of Shipments / Year" fkey="shipmentCount" form={form} touched={touched}>
              <Sel value={form.shipmentCount||""} onChange={v=>upd("shipmentCount",v)} options={["1–5","6–12","13–24","25–50","50–100","100+"]} placeholder="Select range" />
            </VF>
          </>}

          {/* Commodity */}
          <VF label="Commodity / Goods Description" fkey="commodity" form={form} touched={touched}>
            <In value={form.commodity||""} onChange={v=>upd("commodity",v)} onBlur={()=>touch("commodity")} placeholder="e.g. Electronics, Steel Pipes, Foodstuffs" />
          </VF>

          {/* Cargo category */}
          <VF label="Cargo Category" fkey="cargoCategory" form={form} touched={touched}>
            <Sel value={form.cargoCategory||""} onChange={v=>upd("cargoCategory",v)} options={["Electronics & Machinery","Steel & Metal Products","Foodstuffs & Perishables","Chemicals & Hazardous","Textiles & Garments","Auto Parts & Vehicles","Building Materials","Pharmaceuticals","Oil & Petroleum Products","General Merchandise"]} placeholder="Select category" />
          </VF>

          {/* Value */}
          <VF label={valueLabel} fkey={valueFkey} form={form} touched={touched} tip={TOOLTIPS.cargoValue}>
            <In type="number" value={form[valueFkey]||""} onChange={v=>upd(valueFkey,v)} onBlur={()=>touch(valueFkey)} placeholder={isOpenCover?"e.g. 5000000":"e.g. 250000"} />
          </VF>

          {/* Open Cover limits */}
          {isOpenCover && <>
            <VF label={`Max Any One Sending / Vessel (${currency})`} fkey="maxAnySending" form={form} touched={touched} tip={TOOLTIPS.maxAnySending}>
              <In type="number" value={form.maxAnySending||""} onChange={v=>upd("maxAnySending",v)} onBlur={()=>touch("maxAnySending")} placeholder="e.g. 1000000" />
            </VF>
            <VF label={`Max Any One Location (${currency})`} fkey="maxAnyLocation" form={form} touched={touched} tip={TOOLTIPS.maxAnyLocation}>
              <In type="number" value={form.maxAnyLocation||""} onChange={v=>upd("maxAnyLocation",v)} onBlur={()=>touch("maxAnyLocation")} placeholder="e.g. 2000000" />
            </VF>
          </>}

          {/* Packing */}
          <VF label="Packing Type" fkey="packingType" form={form} touched={touched} tip={TOOLTIPS.packingType}>
            <Sel value={form.packingType||""} onChange={v=>upd("packingType",v)} options={["Full Container Load (FCL)","Less than Container Load (LCL)","Bulk (Unpacked)","Wooden Crates","Cartons on Pallets","Breakbulk","Refrigerated Container","Flat Rack / Open Top"]} placeholder="Select packing" />
          </VF>

          {/* ICC Clause */}
          <VF label="Coverage Clause (ICC)" fkey="iccClause" form={form} touched={touched} tip={TOOLTIPS.iccClause}>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {[
                {id:"ICC (A) – All Risks",  sub:"Broadest cover — all risks of loss or damage"},
                {id:"ICC (B) – Named Perils",sub:"Intermediate — specific perils listed in policy"},
                {id:"ICC (C) – Basic",       sub:"Minimum cover — major casualties only"},
                {id:"ICC (Air)",             sub:"Specific clause for air freight shipments"},
              ].map(opt=>{
                const active = form.iccClause===opt.id;
                return <button key={opt.id} onClick={()=>upd("iccClause",opt.id)} style={{padding:"10px 14px",border:`1px solid ${active?"#f97316":t.border}`,borderRadius:8,cursor:"pointer",textAlign:"left",fontFamily:"inherit",background:active?"rgba(249,115,22,0.07)":t.surface,transition:"all 0.15s"}}>
                  <span style={{fontSize:12,fontWeight:700,color:active?"#f97316":t.text}}>{opt.id}</span>
                  <span style={{fontSize:11,color:t.textMuted,marginLeft:8}}>{opt.sub}</span>
                </button>;
              })}
            </div>
          </VF>

          {/* War & Strikes */}
          <VF label="War & Strikes Cover?" fkey="warStrikes" form={form} touched={touched} tip={TOOLTIPS.warStrikes}>
            <RG options={["Yes","No"]} value={form.warStrikes||""} onChange={v=>upd("warStrikes",v)} inline />
          </VF>

          {/* Letter of Credit */}
          <VF label="Letter of Credit Required?" fkey="letterOfCredit" form={form} touched={touched} tip={TOOLTIPS.letterOfCredit}>
            <RG options={["Yes","No"]} value={form.letterOfCredit||""} onChange={v=>upd("letterOfCredit",v)} inline />
          </VF>

          {/* Sum Insured Basis */}
          <VF label="Sum Insured Basis" fkey="sumInsuredBasis" form={form} touched={touched} tip={TOOLTIPS.sumInsuredBasis}>
            <RG options={["CIF + 10% (Standard)","CIF Only","Invoice Value"]} value={form.sumInsuredBasis||""} onChange={v=>upd("sumInsuredBasis",v)} />
          </VF>

          {/* Inland Transit Extension */}
          <VF label="Inland Transit Extension (Warehouse-to-Warehouse)?" fkey="inlandTransit" form={form} touched={touched} tip={TOOLTIPS.inlandTransit}>
            <RG options={["Yes","No"]} value={form.inlandTransit||""} onChange={v=>upd("inlandTransit",v)} inline />
          </VF>

          {/* Storage Duration */}
          <VF label="Storage / Warehousing Duration" fkey="storageDuration" form={form} touched={touched} tip={TOOLTIPS.storageDuration}>
            <Sel value={form.storageDuration||""} onChange={v=>upd("storageDuration",v)} options={["None / In Transit Only","Up to 30 days","31–60 days","61–90 days","Over 90 days"]} placeholder="Select duration" />
          </VF>

          {/* Transshipment */}
          <VF label="Transshipment Involved?" fkey="transshipment" form={form} touched={touched} tip={TOOLTIPS.transshipment}>
            <RG options={["Yes","No"]} value={form.transshipment||""} onChange={v=>upd("transshipment",v)} inline />
          </VF>

          {/* Duty Insurance */}
          <VF label="Import Duty Insurance?" fkey="dutyInsurance" form={form} touched={touched} tip={TOOLTIPS.dutyInsurance}>
            <RG options={["Yes","No"]} value={form.dutyInsurance||""} onChange={v=>upd("dutyInsurance",v)} inline />
          </VF>

          {/* Increased Value */}
          <VF label="Increased Value Cover?" fkey="increasedValue" form={form} touched={touched} tip={TOOLTIPS.increasedValue}>
            <RG options={["Yes","No"]} value={form.increasedValue||""} onChange={v=>upd("increasedValue",v)} inline />
          </VF>

          {/* Perishable flag */}
          <VF label="Perishable / Temperature Sensitive?" fkey="perishable" form={form} touched={touched}>
            <RG options={["Yes","No"]} value={form.perishable||""} onChange={v=>upd("perishable",v)} inline />
          </VF>

          {/* Previous claims */}
          <VF label="Claims in Last 3 Years" fkey="claims" form={form} touched={touched} tip={TOOLTIPS.claims}>
            <RG options={["None","1","2","3+"]} value={form.claims||""} onChange={v=>upd("claims",v)} inline />
          </VF>

          {/* Effective date */}
          <VF label="Coverage Start Date" fkey="effectiveDate" form={form} touched={touched} tip={TOOLTIPS.effectiveDate}>
            <In type="date" value={form.effectiveDate||""} onChange={v=>upd("effectiveDate",v)} onBlur={()=>touch("effectiveDate")} />
          </VF>
        </G2>

        {/* Summary banner */}
        <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:10,padding:"14px 18px",marginBottom:4,display:"flex",gap:24,flexWrap:"wrap"}}>
          <div><div style={{fontSize:10,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Policy</div><div style={{fontSize:13,fontWeight:600,color:"#f97316",marginTop:2}}>{form.policyType||"—"}</div></div>
          <div><div style={{fontSize:10,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Mode</div><div style={{fontSize:13,fontWeight:600,color:t.text,marginTop:2}}>{form.conveyanceMode||"—"}</div></div>
          <div><div style={{fontSize:10,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Insured as</div><div style={{fontSize:13,fontWeight:600,color:t.text,marginTop:2}}>{form.interestType||"—"}</div></div>
          {form.iccClause&&<div><div style={{fontSize:10,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Clause</div><div style={{fontSize:13,fontWeight:600,color:t.text,marginTop:2}}>{form.iccClause.split("–")[0].trim()}</div></div>}
        </div>
        <BtnRow><Btn onClick={onBack}>← Back</Btn><Btn primary onClick={onNext}>Continue →</Btn></BtnRow>
      </FCard>
    );
  }

  if (step === 2) return <ContactStep form={form} upd={upd} touch={touch} touched={touched} onNext={onNext} onBack={onBack} countries={countries} />;
  return null;
}
// ─── MARINE HULL FORM (Orient: cargo vessels, tugs, supply vessels, dredgers — blue water OR inland/coastal) ──
function MarineHullForm({ step, form, upd, touch, touched, currency, onNext, onBack, countries, navLimits }) {
  if (step===0) return (
    <FCard icon="🚢" title="Vessel Information" desc="Orient covers all vessel types — blue water open sea or protected inland/coastal waters.">
      <OrientBanner />
      <G2>
        <VF label="Vessel Name" fkey="vesselName" form={form} touched={touched}><In value={form.vesselName||""} onChange={v=>upd("vesselName",v)} onBlur={()=>touch("vesselName")} placeholder="e.g. MV Gulf Pioneer" /></VF>
        <VF label="Hull / Vessel Type" fkey="hullType" form={form} touched={touched}>
          <Sel value={form.hullType||""} onChange={v=>upd("hullType",v)} options={["Bulk Carrier","Container Ship","Oil Tanker","Chemical Tanker","LNG/LPG Carrier","General Cargo Vessel","Ro-Ro Vessel","Car Carrier","Refrigerated Cargo","Heavy Lift Vessel","Tug","Supply Vessel","Dredger","Survey Vessel","Offshore Support Vessel","Fishing Vessel","Passenger Vessel","Other"]} placeholder="Select vessel type" />
        </VF>
        <VF label="Flag State" fkey="flag" form={form} touched={touched}><Sel value={form.flag||""} onChange={v=>upd("flag",v)} options={countries||COUNTRIES} /></VF>
        <VF label="IMO Number" fkey="imo" form={form} touched={touched} tip={TOOLTIPS.imo}><In value={form.imo||""} onChange={v=>upd("imo",v)} onBlur={()=>touch("imo")} placeholder="e.g. 9123456 (7 digits)" /></VF>
        <VF label="Build Year" fkey="buildYear" form={form} touched={touched}><Sel value={form.buildYear||""} onChange={v=>upd("buildYear",v)} options={YEARS.map(String)} placeholder="Select year" /></VF>
        <VF label="Gross Tonnage (GRT)" fkey="grt" form={form} touched={touched} tip={TOOLTIPS.grt}><In type="number" value={form.grt||""} onChange={v=>upd("grt",v)} onBlur={()=>touch("grt")} placeholder="e.g. 45000" /></VF>
        <VF label={`Agreed Hull Value (${currency})`} fkey="vesselValue" form={form} touched={touched} tip={TOOLTIPS.vesselValue}><In type="number" value={form.vesselValue||""} onChange={v=>upd("vesselValue",v)} onBlur={()=>touch("vesselValue")} placeholder="e.g. 12000000" /></VF>
        <VF label="Classification Society" fkey="classification" form={form} touched={touched} tip={TOOLTIPS.classification}><Sel value={form.classification||""} onChange={v=>upd("classification",v)} options={["Lloyd's Register","DNV","Bureau Veritas","American Bureau of Shipping","ClassNK","RINA","Korean Register","Unclassed","Other"]} placeholder="Select" /></VF>
        <VF label="Hull Material" fkey="hullMaterial" form={form} touched={touched} tip={TOOLTIPS.hullMaterial}><Sel value={form.hullMaterial||""} onChange={v=>upd("hullMaterial",v)} options={["Steel","GRP / Fiberglass","Aluminum","Wood","Composite","Other"]} placeholder="Select material" /></VF>
        <VF label="Engine Power (kW)" fkey="enginePower" form={form} touched={touched} tip={TOOLTIPS.enginePower}><In type="number" value={form.enginePower||""} onChange={v=>upd("enginePower",v)} onBlur={()=>touch("enginePower")} placeholder="e.g. 5000" /></VF>
        <VF label="Survey Status" fkey="surveyStatus" form={form} touched={touched} tip={TOOLTIPS.surveyStatus}><Sel value={form.surveyStatus||""} onChange={v=>upd("surveyStatus",v)} options={["In Class","Due Soon","Overdue","Not Surveyed","N/A"]} placeholder="Select status" /></VF>
        <VF label="Operating Waters" fkey="operatingWaters" form={form} touched={touched} tip={TOOLTIPS.operatingWaters}>
          <Sel value={form.operatingWaters||""} onChange={v=>upd("operatingWaters",v)} options={["Blue Water (Open Sea)","Coastal / Inland Waters","Both Blue Water & Coastal","Port / Harbour Only"]} placeholder="Select scope" />
        </VF>
        <VF label="P&I Club Membership" fkey="pandi" form={form} touched={touched} tip={TOOLTIPS.pandi}><RG options={["Yes","No","Pending"]} value={form.pandi||""} onChange={v=>upd("pandi",v)} inline /></VF>
        <VF label="Third Party Liability Required?" fkey="tplCover" form={form} touched={touched} tip={TOOLTIPS.tplCover}><RG options={["Yes","No"]} value={form.tplCover||""} onChange={v=>upd("tplCover",v)} inline /></VF>
        {form.tplCover==="Yes"&&<VF label={`TPL Limit (${currency})`} fkey="tplLimit" form={form} touched={touched}><In type="number" value={form.tplLimit||""} onChange={v=>upd("tplLimit",v)} onBlur={()=>touch("tplLimit")} placeholder="e.g. 5000000" /></VF>}
      </G2>
      <BtnRow><Btn onClick={onBack}>← Back</Btn><Btn primary onClick={onNext}>Continue →</Btn></BtnRow>
    </FCard>
  );
  if (step===1) return (
    <FCard icon="⚙️" title="Operations & Trade" desc="Trade routes, cargo carried and operational details.">
      <G2>
        <VF label="Primary Trade Route" fkey="tradeRoute" form={form} touched={touched} tip={TOOLTIPS.tradeRoute}><Sel value={form.tradeRoute||""} onChange={v=>upd("tradeRoute",v)} options={navLimits||NAV_LIMITS} placeholder="Select route" /></VF>
        <VF label="Cargo / Payload Type" fkey="cargoType" form={form} touched={touched}><Sel value={form.cargoType||""} onChange={v=>upd("cargoType",v)} options={["Dry Bulk","Liquid Bulk","Containerised","Break Bulk","Refrigerated","Heavy Lift","Ro-Ro Cargo","Hazardous (IMDG)","Dredge / Spoil","Sand & Aggregates","Passengers","General Mixed","None / Not Applicable"]} placeholder="Select cargo" /></VF>
        <VF label="Home Port / Base" fkey="homePort" form={form} touched={touched}><In value={form.homePort||""} onChange={v=>upd("homePort",v)} onBlur={()=>touch("homePort")} placeholder="e.g. Jebel Ali, UAE" /></VF>
        <VF label="Crew on Board" fkey="crew" form={form} touched={touched}><In type="number" value={form.crew||""} onChange={v=>upd("crew",v)} onBlur={()=>touch("crew")} placeholder="e.g. 22" /></VF>
        <VF label="Voyages / Year" fkey="voyages" form={form} touched={touched}><In type="number" value={form.voyages||""} onChange={v=>upd("voyages",v)} onBlur={()=>touch("voyages")} placeholder="e.g. 24" /></VF>
        <VF label="Loss of Hire Cover?" fkey="lossOfHire" form={form} touched={touched} tip={TOOLTIPS.lossOfHire}><RG options={["Yes","No"]} value={form.lossOfHire||""} onChange={v=>upd("lossOfHire",v)} inline /></VF>
        <VF label="Pollution Liability?" fkey="pollution" form={form} touched={touched} tip={TOOLTIPS.pollution}><RG options={["Yes","No"]} value={form.pollution||""} onChange={v=>upd("pollution",v)} inline /></VF>
        <VF label="Previous Claims" fkey="claims" form={form} touched={touched} tip={TOOLTIPS.claims}><RG options={["None","1","2","3+"]} value={form.claims||""} onChange={v=>upd("claims",v)} inline /></VF>
        <VF label="Coverage Start Date" fkey="effectiveDate" form={form} touched={touched} tip={TOOLTIPS.effectiveDate}><In type="date" value={form.effectiveDate||""} onChange={v=>upd("effectiveDate",v)} onBlur={()=>touch("effectiveDate")} /></VF>
      </G2>
      <BtnRow><Btn onClick={onBack}>← Back</Btn><Btn primary onClick={onNext}>Continue →</Btn></BtnRow>
    </FCard>
  );
  if (step===2) return <ContactStep form={form} upd={upd} touch={touch} touched={touched} onNext={onNext} onBack={onBack} countries={countries} />;
  return null;
}

// ─── MARINE LIABILITY FORM (Orient: 6 sub-types) ─────────────────────────────
function MarineLiabilityForm({ step, form, upd, touch, touched, currency, onNext, onBack, countries, navLimits }) {
  const { t } = useTheme();
  const LIAB_TYPES = [
    { id:"Ship Repairer's Liability",    icon:"🔧", desc:"Covers liability for damage to vessels or property while in your care for repair or maintenance" },
    { id:"Charterer's Liability",        icon:"📋", desc:"Covers charterer's liability for loss/damage to the vessel and third-party claims during the charter period" },
    { id:"Freight Forwarder's Liability",icon:"📦", desc:"Covers liability for cargo loss, damage, or delay while acting as a freight forwarder or NVOCC" },
    { id:"Haulier's Liability",          icon:"🚛", desc:"Covers road haulier's liability for cargo entrusted for transportation by road" },
    { id:"Terminal Operator's Liability",icon:"🏗️", desc:"Covers liability for cargo, vessels, and third parties arising from port or terminal operations" },
    { id:"Protection & Indemnity (P&I)", icon:"⚓", desc:"Broad third-party cover for vessel owners — collision, crew injury, pollution, wreck removal" },
  ];

  if (step===0) return (
    <FCard icon="⚖️" title="Liability Type" desc="Orient Marine Liability covers 6 distinct roles. Select the one that matches your business.">
      <OrientBanner />
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
        {LIAB_TYPES.map(lt=>{
          const active = form.liabilityType===lt.id;
          return (
            <button key={lt.id} onClick={()=>upd("liabilityType",lt.id)}
              style={{background:active?"rgba(139,92,246,0.09)":t.surface,border:`2px solid ${active?"#8b5cf6":t.border}`,borderRadius:12,padding:"16px",cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:"all 0.2s",boxShadow:active?"0 0 0 3px rgba(139,92,246,0.1)":"none"}}>
              <div style={{fontSize:22,marginBottom:7}}>{lt.icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:active?"#8b5cf6":t.text,marginBottom:5}}>{lt.id}</div>
              <div style={{fontSize:11,color:t.textMuted,lineHeight:1.5}}>{lt.desc}</div>
              {active&&<div style={{marginTop:8,fontSize:10,fontWeight:700,color:"#8b5cf6",letterSpacing:"0.06em"}}>◉ SELECTED</div>}
            </button>
          );
        })}
      </div>
      <BtnRow><Btn onClick={onBack}>← Back</Btn><Btn primary onClick={onNext}>Continue →</Btn></BtnRow>
    </FCard>
  );

  if (step===1) return (
    <FCard icon="📋" title="Liability Details" desc={`Details for your ${form.liabilityType||"Marine Liability"} policy.`}>
      <G2>
        <VF label="Company / Entity Name" fkey="vesselName" form={form} touched={touched}><In value={form.vesselName||""} onChange={v=>upd("vesselName",v)} onBlur={()=>touch("vesselName")} placeholder="e.g. Gulf Ship Services LLC" /></VF>
        <VF label="Country of Operation" fkey="flag" form={form} touched={touched}><Sel value={form.flag||""} onChange={v=>upd("flag",v)} options={countries||COUNTRIES} /></VF>
        <VF label="Operating Area" fkey="tradeRoute" form={form} touched={touched} tip={TOOLTIPS.tradeRoute}><Sel value={form.tradeRoute||""} onChange={v=>upd("tradeRoute",v)} options={navLimits||NAV_LIMITS} placeholder="Select area" /></VF>
        <VF label={`Liability Limit Required (${currency})`} fkey="liabilityLimit" form={form} touched={touched} tip={TOOLTIPS.liabilityLimit}>
          <Sel value={form.liabilityLimit||""} onChange={v=>upd("liabilityLimit",v)} options={["500000","1000000","2000000","5000000","10000000","25000000","50000000","100000000"]} placeholder="Select limit" />
        </VF>
        <VF label={`Annual Revenue (${currency})`} fkey="annualRevenue" form={form} touched={touched} tip={TOOLTIPS.annualRevenue}><In type="number" value={form.annualRevenue||""} onChange={v=>upd("annualRevenue",v)} onBlur={()=>touch("annualRevenue")} placeholder="e.g. 5000000" /></VF>
        {/* Vessel details — shown for P&I and Charterer's */}
        {(form.liabilityType==="Protection & Indemnity (P&I)"||form.liabilityType==="Charterer's Liability")&&<>
          <VF label="Vessel Name / IMO" fkey="imo" form={form} touched={touched}><In value={form.imo||""} onChange={v=>upd("imo",v)} onBlur={()=>touch("imo")} placeholder="e.g. MV Gulf Star / IMO 9123456" /></VF>
          <VF label="Vessel GRT" fkey="grt" form={form} touched={touched} tip={TOOLTIPS.grt}><In type="number" value={form.grt||""} onChange={v=>upd("grt",v)} onBlur={()=>touch("grt")} placeholder="e.g. 15000" /></VF>
          <VF label="Fleet Size" fkey="fleetSize" form={form} touched={touched} tip={TOOLTIPS.fleetSize}><In type="number" value={form.fleetSize||""} onChange={v=>upd("fleetSize",v)} onBlur={()=>touch("fleetSize")} placeholder="e.g. 5" /></VF>
        </>}
        {/* Cargo turnover — shown for freight forwarders and hauliers */}
        {(form.liabilityType==="Freight Forwarder's Liability"||form.liabilityType==="Haulier's Liability")&&<>
          <VF label={`Annual Cargo Turnover (${currency})`} fkey="annualTurnover" form={form} touched={touched} tip={TOOLTIPS.annualTurnover}><In type="number" value={form.annualTurnover||""} onChange={v=>upd("annualTurnover",v)} onBlur={()=>touch("annualTurnover")} placeholder="e.g. 10000000" /></VF>
          <VF label="Number of Shipments / Year" fkey="shipmentCount" form={form} touched={touched}><Sel value={form.shipmentCount||""} onChange={v=>upd("shipmentCount",v)} options={["1–25","26–100","101–250","251–500","500+"]} placeholder="Select range" /></VF>
        </>}
        {/* Terminal throughput */}
        {form.liabilityType==="Terminal Operator's Liability"&&<>
          <VF label="Annual Throughput (TEUs or tonnes)" fkey="annualTurnover" form={form} touched={touched}><In type="number" value={form.annualTurnover||""} onChange={v=>upd("annualTurnover",v)} onBlur={()=>touch("annualTurnover")} placeholder="e.g. 500000" /></VF>
          <VF label="Terminal / Port Name" fkey="homePort" form={form} touched={touched}><In value={form.homePort||""} onChange={v=>upd("homePort",v)} onBlur={()=>touch("homePort")} placeholder="e.g. Khalifa Port, Abu Dhabi" /></VF>
        </>}
        <VF label="No. of Employees / Crew" fkey="crew" form={form} touched={touched}><In type="number" value={form.crew||""} onChange={v=>upd("crew",v)} onBlur={()=>touch("crew")} placeholder="e.g. 45" /></VF>
        <VF label="Previous Claims" fkey="claims" form={form} touched={touched} tip={TOOLTIPS.claims}><RG options={["None","1","2","3+"]} value={form.claims||""} onChange={v=>upd("claims",v)} inline /></VF>
        <VF label="Coverage Start Date" fkey="effectiveDate" form={form} touched={touched} tip={TOOLTIPS.effectiveDate}><In type="date" value={form.effectiveDate||""} onChange={v=>upd("effectiveDate",v)} onBlur={()=>touch("effectiveDate")} /></VF>
      </G2>
      <BtnRow><Btn onClick={onBack}>← Back</Btn><Btn primary onClick={onNext}>Continue →</Btn></BtnRow>
    </FCard>
  );
  if (step===2) return <ContactStep form={form} upd={upd} touch={touch} touched={touched} onNext={onNext} onBack={onBack} countries={countries} />;
  return null;
}

// ─── PLEASURE CRAFT FORM (Orient: small boats to mega yachts + TPL) ───────────
function PleasureCraftForm({ step, form, upd, touch, touched, currency, onNext, onBack, countries, navLimits }) {
  if (step===0) return (
    <FCard icon="⛵" title="Your Pleasure Craft" desc="Orient covers everything from small boats to mega yachts with uniquely tailored cover.">
      <OrientBanner />
      <G2>
        <VF label="Craft Name" fkey="craftName" form={form} touched={touched}><In value={form.craftName||""} onChange={v=>upd("craftName",v)} onBlur={()=>touch("craftName")} placeholder="e.g. Blue Horizon" /></VF>
        <VF label="Craft Type" fkey="craftType" form={form} touched={touched}>
          <Sel value={form.craftType||""} onChange={v=>upd("craftType",v)} options={["Motor Yacht","Sailing Yacht","Catamaran","Superyacht (24m+)","Sport Boat / Speedboat","RIB (Rigid Inflatable)","Jet Ski / PWC","Fishing Boat","Inflatable / Dinghy","Traditional Wooden Dhow","Other"]} placeholder="Select craft type" />
        </VF>
        <VF label="Builder / Brand" fkey="builder" form={form} touched={touched}><In value={form.builder||""} onChange={v=>upd("builder",v)} onBlur={()=>touch("builder")} placeholder="e.g. Sunseeker, Azimut" /></VF>
        <VF label="Model" fkey="model" form={form} touched={touched}><In value={form.model||""} onChange={v=>upd("model",v)} onBlur={()=>touch("model")} placeholder="e.g. Manhattan 66" /></VF>
        <VF label="Build Year" fkey="buildYear" form={form} touched={touched}><Sel value={form.buildYear||""} onChange={v=>upd("buildYear",v)} options={YEARS.map(String)} placeholder="Select year" /></VF>
        <VF label="Length (metres)" fkey="length" form={form} touched={touched}><In type="number" value={form.length||""} onChange={v=>upd("length",v)} onBlur={()=>touch("length")} placeholder="e.g. 20" /></VF>
        <VF label={`Insured Value (${currency})`} fkey="craftValue" form={form} touched={touched} tip={TOOLTIPS.craftValue}><In type="number" value={form.craftValue||""} onChange={v=>upd("craftValue",v)} onBlur={()=>touch("craftValue")} placeholder="e.g. 850000" /></VF>
        <VF label="Registration Country" fkey="flag" form={form} touched={touched}><Sel value={form.flag||""} onChange={v=>upd("flag",v)} options={countries||COUNTRIES} /></VF>
        <VF label="Engine Type" fkey="engineType" form={form} touched={touched}><RG options={["Inboard","Outboard","Sail-only","Hybrid","Jet Drive"]} value={form.engineType||""} onChange={v=>upd("engineType",v)} inline /></VF>
        <VF label="Hull Material" fkey="hullMaterial" form={form} touched={touched} tip={TOOLTIPS.hullMaterial}><Sel value={form.hullMaterial||""} onChange={v=>upd("hullMaterial",v)} options={["GRP / Fiberglass","Steel","Aluminum","Wood","Composite","Other"]} placeholder="Select material" /></VF>
        <VF label="Tender / Dinghy Included?" fkey="tender" form={form} touched={touched}><RG options={["Yes","No"]} value={form.tender||""} onChange={v=>upd("tender",v)} inline /></VF>
        {form.tender==="Yes"&&<VF label={`Tender Value (${currency})`} fkey="tenderValue" form={form} touched={touched}><In type="number" value={form.tenderValue||""} onChange={v=>upd("tenderValue",v)} onBlur={()=>touch("tenderValue")} placeholder="e.g. 45000" /></VF>}
      </G2>
      <BtnRow><Btn onClick={onBack}>← Back</Btn><Btn primary onClick={onNext}>Continue →</Btn></BtnRow>
    </FCard>
  );
  if (step===1) return (
    <FCard icon="🧭" title="Use & Cover Options" desc="How you use the craft and the cover you need.">
      <G2>
        <VF label="Navigation Area" fkey="navArea" form={form} touched={touched} tip={TOOLTIPS.tradeRoute}><Sel value={form.navArea||""} onChange={v=>upd("navArea",v)} options={navLimits||NAV_LIMITS} placeholder="Select area" /></VF>
        <VF label="Primary Use" fkey="use" form={form} touched={touched}><Sel value={form.use||""} onChange={v=>upd("use",v)} options={["Private / Leisure","Charter","Private + Charter","Bareboat Charter","Fishing","Water Sports"]} /></VF>
        <VF label="Home Marina / Port" fkey="marina" form={form} touched={touched}><In value={form.marina||""} onChange={v=>upd("marina",v)} onBlur={()=>touch("marina")} placeholder="e.g. Dubai Marina, UAE" /></VF>
        <VF label="Professional Crew Count" fkey="crew" form={form} touched={touched}><Sel value={form.crew||""} onChange={v=>upd("crew",v)} options={["0","1","2","3","4","5","6-10","10+"]} /></VF>
        <VF label="Owner Experience" fkey="experience" form={form} touched={touched}><Sel value={form.experience||""} onChange={v=>upd("experience",v)} options={["Less than 1 year","1-2 years","3-5 years","5-10 years","10+ years"]} /></VF>
        <VF label="Survey Status" fkey="surveyStatus" form={form} touched={touched} tip={TOOLTIPS.surveyStatus}><Sel value={form.surveyStatus||""} onChange={v=>upd("surveyStatus",v)} options={["In Class","Due Soon","Overdue","N/A"]} placeholder="Select status" /></VF>
        {/* Orient-specific: TPL cover */}
        <VF label="Third Party Liability Cover?" fkey="tplCover" form={form} touched={touched} tip={TOOLTIPS.tplCover}><RG options={["Yes","No"]} value={form.tplCover||""} onChange={v=>upd("tplCover",v)} inline /></VF>
        {form.tplCover==="Yes"&&<VF label={`TPL Limit (${currency})`} fkey="tplLimit" form={form} touched={touched}><Sel value={form.tplLimit||""} onChange={v=>upd("tplLimit",v)} options={["250000","500000","1000000","2000000","5000000"]} placeholder="Select limit" /></VF>}
        <VF label="Racing / Competition Use?" fkey="racing" form={form} touched={touched} tip={TOOLTIPS.racing}><RG options={["Yes","No"]} value={form.racing||""} onChange={v=>upd("racing",v)} inline /></VF>
        <VF label="Previous Claims" fkey="claims" form={form} touched={touched} tip={TOOLTIPS.claims}><RG options={["None","1","2","3+"]} value={form.claims||""} onChange={v=>upd("claims",v)} inline /></VF>
        <VF label="Coverage Start Date" fkey="effectiveDate" form={form} touched={touched} tip={TOOLTIPS.effectiveDate}><In type="date" value={form.effectiveDate||""} onChange={v=>upd("effectiveDate",v)} onBlur={()=>touch("effectiveDate")} /></VF>
      </G2>
      <BtnRow><Btn onClick={onBack}>← Back</Btn><Btn primary onClick={onNext}>Continue →</Btn></BtnRow>
    </FCard>
  );
  if (step===2) return <ContactStep form={form} upd={upd} touch={touch} touched={touched} onNext={onNext} onBack={onBack} countries={countries} />;
  return null;
}

// ─── CONVERSATIONAL FORM ──────────────────────────────────────────────────────
const JETSKI_QUESTIONS = [
  {key:"brand",       label:"What brand is your jet ski?",               tip:null,              type:"sel",  options:["Sea-Doo","Yamaha WaveRunner","Kawasaki Jet Ski","Honda AquaTrax","Polaris","Other"]},
  {key:"model",       label:"What's the model?",                         tip:null,              type:"text", placeholder:"e.g. Sea-Doo GTX 300"},
  {key:"buildYear",   label:"What year was it manufactured?",            tip:null,              type:"sel",  options:YEARS.map(String)},
  {key:"pwcValue",    label:"What's the current market value?",          tip:TOOLTIPS.pwcValue, type:"money"},
  {key:"quantity",    label:"How many PWCs do you want to insure?",      tip:null,              type:"rg",   options:["1","2","3","4+"], inline:true},
  {key:"country",     label:"Where is it registered?",                   tip:null,              type:"sel",  options:COUNTRIES},
  {key:"usageArea",   label:"Where do you mainly use it?",               tip:null,              type:"rg",   options:["Coastal / Sea","Inland Lake/River","Both"], inline:true},
  {key:"storage",     label:"How do you store it?",                      tip:null,              type:"rg",   options:["Marina / Berth","Home / Garage","Trailered","Offshore Mooring"]},
  {key:"racing",      label:"Do you use it for racing or competitions?", tip:TOOLTIPS.racing,   type:"rg",   options:["Yes","No"], inline:true},
  {key:"claims",      label:"Any claims in the last 3 years?",           tip:TOOLTIPS.claims,   type:"rg",   options:["None","1","2+"], inline:true},
  {key:"effectiveDate",label:"When do you want coverage to start?",      tip:TOOLTIPS.effectiveDate, type:"date"},
];
const SPEEDBOAT_QUESTIONS = [
  {key:"boatType",     label:"What type of boat is it?",                 tip:null,               type:"rg",   options:["Speedboat","RIB (Rigid Inflatable)","Sport Boat","Center Console","Bowrider","Pontoon Boat"]},
  {key:"brand",        label:"What's the brand or make?",                tip:null,               type:"text", placeholder:"e.g. Bayliner, Zodiac, Sea Ray"},
  {key:"buildYear",    label:"What year was it built?",                  tip:null,               type:"sel",  options:YEARS.map(String)},
  {key:"length",       label:"What's the length in metres?",             tip:null,               type:"text", placeholder:"e.g. 7.5"},
  {key:"boatValue",    label:"What's the current market value?",         tip:TOOLTIPS.boatValue, type:"money"},
  {key:"engineConfig", label:"What's the engine setup?",                 tip:null,               type:"rg",   options:["Single Outboard","Twin Outboard","Inboard","Stern Drive"]},
  {key:"country",      label:"Where is it registered?",                  tip:null,               type:"sel",  options:COUNTRIES},
  {key:"use",          label:"How do you mainly use the boat?",          tip:null,               type:"rg",   options:["Private / Leisure","Fishing","Water Sports","Charter / Commercial"]},
  {key:"storage",      label:"How do you store it?",                     tip:null,               type:"rg",   options:["Marina Berth","Dry Stack","Trailered at Home","Mooring Buoy"]},
  {key:"overnight",    label:"Do you do overnight passages?",            tip:null,               type:"rg",   options:["Yes","No"], inline:true},
  {key:"claims",       label:"Any claims in the last 3 years?",          tip:TOOLTIPS.claims,    type:"rg",   options:["None","1","2+"], inline:true},
  {key:"effectiveDate",label:"When do you want coverage to start?",      tip:TOOLTIPS.effectiveDate, type:"date"},
];

function ConversationalForm({ questions, form, upd, currency, onNext, onBack, icon, productLabel }) {
  const { t } = useTheme();
  const [qIndex, setQIndex] = useState(()=>{for(let i=0;i<questions.length;i++){if(!form[questions[i].key])return i;}return questions.length-1;});
  const [animating, setAnimating] = useState(false);
  const inputRef = useRef(null);
  useEffect(()=>{if(inputRef.current)inputRef.current.focus();},[qIndex]);
  const q = questions[qIndex];
  const answered = questions.filter(q=>form[q.key]).length;
  const isValid = form[q.key]&&String(form[q.key]).trim().length>0;
  const advance = ()=>{ if(!isValid)return; setAnimating(true); setTimeout(()=>{setAnimating(false);if(qIndex<questions.length-1)setQIndex(i=>i+1);else onNext();},220); };
  const goBack = ()=>{ if(qIndex===0)onBack();else setQIndex(i=>i-1); };

  return (
    <div style={{maxWidth:600,margin:"0 auto"}}>
      <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:32}}>
        {questions.map((_,i)=>(
          <div key={i} onClick={()=>i<=qIndex&&setQIndex(i)} style={{flex:1,height:3,borderRadius:99,background:i<answered?"#0ea5e9":i===qIndex?"rgba(14,165,233,0.35)":t.border,cursor:i<=qIndex?"pointer":"default",transition:"background 0.3s"}} />
        ))}
      </div>
      <div style={{opacity:animating?0:1,transform:animating?"translateY(8px)":"none",transition:"all 0.22s ease"}}>
        <div style={{marginBottom:28}}>
          <div style={{fontSize:11,color:t.textMuted,marginBottom:10,textTransform:"uppercase",letterSpacing:"0.1em"}}>{icon} {productLabel} · Question {qIndex+1} of {questions.length}</div>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <h2 style={{fontSize:26,fontWeight:700,color:t.text,margin:0,lineHeight:1.3,flex:1}}>{q.label}</h2>
            {q.tip&&<Tooltip text={q.tip} />}
          </div>
        </div>
        <div style={{marginBottom:28}}>
          {q.type==="text"&&<input ref={inputRef} style={{background:t.convBg,border:`1px solid ${t.convBorder}`,borderRadius:10,padding:"14px 16px",color:t.inputText,outline:"none",fontFamily:"inherit",width:"100%",fontSize:18}} value={form[q.key]||""} onChange={e=>upd(q.key,e.target.value)} onKeyDown={e=>e.key==="Enter"&&advance()} placeholder={q.placeholder||""} />}
          {q.type==="sel"&&<select ref={inputRef} style={{background:t.convBg,border:`1px solid ${t.convBorder}`,borderRadius:10,padding:"14px 16px",color:t.inputText,outline:"none",fontFamily:"inherit",width:"100%",fontSize:16}} value={form[q.key]||""} onChange={e=>upd(q.key,e.target.value)}><option value="">Select an option…</option>{q.options.map(o=><option key={o}>{o}</option>)}</select>}
          {q.type==="money"&&<div style={{display:"flex",alignItems:"center",background:t.convBg,border:`1px solid ${t.convBorder}`,borderRadius:10,overflow:"hidden"}}><span style={{padding:"14px 16px",fontSize:15,color:t.textMuted,borderRight:`1px solid ${t.convBorder}`,background:t.surface,whiteSpace:"nowrap"}}>{currency}</span><input ref={inputRef} type="number" style={{background:"transparent",border:"none",padding:"14px 16px",color:t.inputText,outline:"none",fontFamily:"inherit",flex:1,fontSize:18}} value={form[q.key]||""} onChange={e=>upd(q.key,e.target.value)} onKeyDown={e=>e.key==="Enter"&&advance()} placeholder="Enter amount" /></div>}
          {q.type==="date"&&<input ref={inputRef} type="date" style={{background:t.convBg,border:`1px solid ${t.convBorder}`,borderRadius:10,padding:"14px 16px",color:t.inputText,outline:"none",fontFamily:"inherit",width:"100%",fontSize:16}} value={form[q.key]||""} onChange={e=>upd(q.key,e.target.value)} onKeyDown={e=>e.key==="Enter"&&advance()} />}
          {q.type==="rg"&&(
            <div style={{display:"flex",flexDirection:q.inline?"row":"column",gap:10,flexWrap:"wrap"}}>
              {q.options.map(opt=>(
                <button key={opt} onClick={()=>{upd(q.key,opt);setTimeout(advance,180);}}
                  style={{padding:"13px 20px",border:`2px solid ${form[q.key]===opt?"#0ea5e9":t.border}`,borderRadius:10,fontSize:14,cursor:"pointer",color:form[q.key]===opt?"#fff":t.textSub,background:form[q.key]===opt?"#0ea5e9":t.surface,fontFamily:"inherit",transition:"all 0.15s",fontWeight:form[q.key]===opt?600:400,boxShadow:form[q.key]===opt?"none":(t===LIGHT?"0 1px 4px rgba(0,0,0,0.06)":"none")}}>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={goBack} style={{background:"none",border:"none",color:t.textMuted,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← {qIndex===0?"Change vessel type":"Previous"}</button>
          {q.type!=="rg"&&(
            <button onClick={advance} disabled={!isValid}
              style={{background:isValid?"#0ea5e9":"rgba(14,165,233,0.12)",border:"none",borderRadius:9,padding:"12px 28px",color:isValid?"#fff":t.textFaint,fontSize:14,fontWeight:600,cursor:isValid?"pointer":"not-allowed",fontFamily:"inherit",display:"flex",alignItems:"center",gap:8}}>
              {qIndex===questions.length-1?"Continue →":"Next →"}
              {isValid&&<span style={{fontSize:10,opacity:0.7}}>or Enter</span>}
            </button>
          )}
        </div>
        {answered>0&&(
          <div style={{marginTop:28,borderTop:`1px solid ${t.border}`,paddingTop:18}}>
            <div style={{fontSize:10,color:t.textFaint,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Your answers so far</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {questions.slice(0,qIndex).map(q2=>form[q2.key]?(
                <button key={q2.key} onClick={()=>setQIndex(questions.indexOf(q2))}
                  style={{fontSize:11,color:"#10b981",background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",padding:"4px 10px",borderRadius:8,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                  ✓ {q2.key==="pwcValue"||q2.key==="boatValue"?`${currency} ${parseFloat(form[q2.key]).toLocaleString()}`:form[q2.key]}
                </button>
              ):null)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function JetSkiConversational({ step, form, upd, currency, onNext, onBack, countries }) {
  const questions = JETSKI_QUESTIONS.map(q => q.key === 'country' ? { ...q, options: countries || COUNTRIES } : q);
  if (step===0) return <ConversationalForm questions={questions} form={form} upd={upd} currency={currency} onNext={onNext} onBack={onBack} icon="🏄" productLabel="Jet Ski / PWC" />;
  if (step===1) return <ContactStep form={form} upd={upd} touch={()=>{}} touched={{}} onNext={onNext} onBack={onBack} countries={countries} />;
  return null;
}
function SpeedboatConversational({ step, form, upd, currency, onNext, onBack, countries }) {
  const questions = SPEEDBOAT_QUESTIONS.map(q => q.key === 'country' ? { ...q, options: countries || COUNTRIES } : q);
  if (step===0) return <ConversationalForm questions={questions} form={form} upd={upd} currency={currency} onNext={onNext} onBack={onBack} icon="🚤" productLabel="Speedboat / RIB" />;
  if (step===1) return <ContactStep form={form} upd={upd} touch={()=>{}} touched={{}} onNext={onNext} onBack={onBack} countries={countries} />;
  return null;
}

// ─── BARGE FORM ───────────────────────────────────────────────────────────────
function BargeForm({ step, form, upd, touch, touched, currency, onNext, onBack, countries, navLimits }) {
  if (step===0) return (
    <FCard icon="🛳️" title="Commercial Vessel Information" desc="Details about your barge or commercial vessel.">
      <G2>
        <VF label="Vessel Type" fkey="vesselType" form={form} touched={touched}><Sel value={form.vesselType||""} onChange={v=>upd("vesselType",v)} options={["Dumb Barge","Self-Propelled Barge","Hopper Barge","Deck Cargo Barge","Ferry","Passenger Vessel","Tug","Work Boat","Offshore Support","Survey Vessel","Crane Barge"]} placeholder="Select type" /></VF>
        <VF label="Vessel Name" fkey="vesselName" form={form} touched={touched}><In value={form.vesselName||""} onChange={v=>upd("vesselName",v)} onBlur={()=>touch("vesselName")} placeholder="e.g. UAE Transporter 1" /></VF>
        <VF label="Flag State" fkey="flag" form={form} touched={touched}><Sel value={form.flag||""} onChange={v=>upd("flag",v)} options={countries||COUNTRIES} /></VF>
        <VF label="Build Year" fkey="buildYear" form={form} touched={touched}><Sel value={form.buildYear||""} onChange={v=>upd("buildYear",v)} options={YEARS.map(String)} placeholder="Select year" /></VF>
        <VF label="Length (metres)" fkey="length" form={form} touched={touched}><In type="number" value={form.length||""} onChange={v=>upd("length",v)} onBlur={()=>touch("length")} placeholder="e.g. 85" /></VF>
        <VF label={`Vessel Value (${currency})`} fkey="vesselValue" form={form} touched={touched} tip={TOOLTIPS.vesselValue}><In type="number" value={form.vesselValue||""} onChange={v=>upd("vesselValue",v)} onBlur={()=>touch("vesselValue")} placeholder="e.g. 3500000" /></VF>
        <VF label="Classification" fkey="classification" form={form} touched={touched} tip={TOOLTIPS.classification}><Sel value={form.classification||""} onChange={v=>upd("classification",v)} options={["Lloyd's Register","DNV","Bureau Veritas","ABS","ClassNK","RINA","Not Classed","Other"]} placeholder="Select" /></VF>
      </G2>
      <BtnRow><Btn onClick={onBack}>← Back</Btn><Btn primary onClick={onNext}>Continue →</Btn></BtnRow>
    </FCard>
  );
  if (step===1) return (
    <FCard icon="⚙️" title="Operations" desc="Operational details and coverage requirements.">
      <G2>
        <VF label="Operating Area" fkey="operatingArea" form={form} touched={touched}><Sel value={form.operatingArea||""} onChange={v=>upd("operatingArea",v)} options={navLimits||NAV_LIMITS} placeholder="Select area" /></VF>
        <VF label="Operation Type" fkey="opType" form={form} touched={touched}><Sel value={form.opType||""} onChange={v=>upd("opType",v)} options={["Port / Harbour Only","River / Inland Waterway","Coastal","Short Sea Shipping","International Trading"]} /></VF>
        <VF label="Cargo / Payload Type" fkey="cargoType" form={form} touched={touched}><Sel value={form.cargoType||""} onChange={v=>upd("cargoType",v)} options={["Sand & Aggregates","Steel & Metal","Construction Materials","Fuel / Oil Products","Passengers","Container Units","Waste / Dredge","General Mixed"]} placeholder="Select" /></VF>
        <VF label="Crew on Board" fkey="crew" form={form} touched={touched}><In type="number" value={form.crew||""} onChange={v=>upd("crew",v)} onBlur={()=>touch("crew")} placeholder="e.g. 8" /></VF>
        <VF label="Loss of Hire Cover?" fkey="lossOfHire" form={form} touched={touched} tip={TOOLTIPS.lossOfHire}><RG options={["Yes","No"]} value={form.lossOfHire||""} onChange={v=>upd("lossOfHire",v)} inline /></VF>
        <VF label="Pollution Liability?" fkey="pollution" form={form} touched={touched} tip={TOOLTIPS.pollution}><RG options={["Yes","No"]} value={form.pollution||""} onChange={v=>upd("pollution",v)} inline /></VF>
        <VF label="Previous Claims" fkey="claims" form={form} touched={touched} tip={TOOLTIPS.claims}><RG options={["None","1","2","3+"]} value={form.claims||""} onChange={v=>upd("claims",v)} inline /></VF>
        <VF label="Effective Date" fkey="effectiveDate" form={form} touched={touched} tip={TOOLTIPS.effectiveDate}><In type="date" value={form.effectiveDate||""} onChange={v=>upd("effectiveDate",v)} onBlur={()=>touch("effectiveDate")} /></VF>
      </G2>
      <BtnRow><Btn onClick={onBack}>← Back</Btn><Btn primary onClick={onNext}>Continue →</Btn></BtnRow>
    </FCard>
  );
  if (step===2) return <ContactStep form={form} upd={upd} touch={touch} touched={touched} onNext={onNext} onBack={onBack} countries={countries} />;
  return null;
}

// ─── CONTACT STEP ─────────────────────────────────────────────────────────────
function ContactStep({ form, upd, touch, touched, onNext, onBack, countries }) {
  const { t } = useTheme();
  return (
    <FCard icon="👤" title="Your Details" desc="Contact information to receive and bind your quotes.">
      <G2>
        <VF label="Full Name" fkey="fullName" form={form} touched={touched}><In value={form.fullName||""} onChange={v=>upd("fullName",v)} onBlur={()=>touch("fullName")} placeholder="First and last name" /></VF>
        <VF label="Company (optional)" fkey="company" form={form} touched={touched}><In value={form.company||""} onChange={v=>upd("company",v)} onBlur={()=>touch("company")} placeholder="e.g. Gulf Marine LLC" /></VF>
        <VF label="Email Address" fkey="email" form={form} touched={touched} tip={TOOLTIPS.email}><In value={form.email||""} onChange={v=>upd("email",v)} onBlur={()=>touch("email")} placeholder="you@company.ae" /></VF>
        <VF label="Phone Number" fkey="phone" form={form} touched={touched}><In value={form.phone||""} onChange={v=>upd("phone",v)} onBlur={()=>touch("phone")} placeholder="+971 50 123 4567" /></VF>
        <VF label="Nationality" fkey="nationality" form={form} touched={touched}><Sel value={form.nationality||"United Arab Emirates"} onChange={v=>upd("nationality",v)} options={countries||COUNTRIES} /></VF>
        <VF label="Country of Residence" fkey="residence" form={form} touched={touched}><Sel value={form.residence||"United Arab Emirates"} onChange={v=>upd("residence",v)} options={countries||COUNTRIES} /></VF>
        <VF label="Preferred Contact Method" fkey="contactPref" form={form} touched={touched}><RG options={["Email","Phone","WhatsApp"]} value={form.contactPref||"Email"} onChange={v=>upd("contactPref",v)} inline /></VF>
      </G2>
      <div style={{marginBottom:16}}>
        <label style={{fontSize:10,fontWeight:700,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",display:"block",marginBottom:7}}>Additional Notes</label>
        <textarea style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:8,padding:"10px 12px",color:t.inputText,fontSize:13,outline:"none",fontFamily:"inherit",width:"100%",height:68,resize:"vertical"}} value={form.notes||""} onChange={e=>upd("notes",e.target.value)} placeholder="Any special requirements…" />
      </div>
      <div style={{display:"flex",alignItems:"center",gap:10,border:`1px solid ${t.border}`,borderRadius:8,padding:"12px 16px",marginBottom:4,background:t.surface}}>
        <input type="checkbox" id="agree" checked={!!form.agreed} onChange={e=>upd("agreed",e.target.checked)} />
        <label htmlFor="agree" style={{fontSize:13,color:t.textSub,cursor:"pointer"}}>I agree to the terms & conditions and consent to being contacted with quotes.</label>
      </div>
      <BtnRow><Btn onClick={onBack}>← Back</Btn><Btn primary onClick={onNext}>Get My Quotes →</Btn></BtnRow>
    </FCard>
  );
}

// ─── QUOTES SCREEN ────────────────────────────────────────────────────────────
function QuotesScreen({ quotes, form, product, currency, onSelect, onBack, onHome, dark, onToggleDark, leadRef, submittingLead }) {
  const { t } = useTheme();
  const sym = currencySymbol(currency);
  return (
    <div style={{minHeight:"100vh",background:t.bg}}>
      <AppHeader onHome={onHome} dark={dark} onToggleDark={onToggleDark}
        right={<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><span style={{fontSize:16}}>{product?.icon}</span><span style={{fontSize:12,color:t.textMuted}}>{product?.label}</span></div>}
      />
      <main style={{maxWidth:960,margin:"0 auto",padding:"36px 24px 80px"}}>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:26}}>
          <div>
            <button onClick={onBack} style={{background:"none",border:"none",color:t.textMuted,fontSize:12,cursor:"pointer",fontFamily:"inherit",marginBottom:8,display:"block"}}>← Modify Details</button>
            <h2 style={{fontSize:26,fontWeight:700,margin:"0 0 5px",color:t.text}}>Compare Quotes</h2>
            <p style={{fontSize:13,color:t.textMuted,margin:0}}>{quotes.length} quotes · <strong style={{color:"#0ea5e9"}}>{form.liabilityType||form.craftName||form.commodity||form.vesselName||form.model||form.brand||"Your Policy"}</strong>{form.policyType&&<span style={{color:t.textMuted}}> · {form.policyType}</span>}{form.iccClause&&<span style={{color:t.textMuted}}> · {form.iccClause.split("–")[0].trim()}</span>}</p>
            {submittingLead && <div style={{fontSize:11,color:t.textMuted,marginTop:5}}>⟳ Saving lead…</div>}
            {leadRef && <div style={{fontSize:11,color:"#10b981",marginTop:5}}>✓ Lead saved · Ref: <strong style={{fontFamily:"monospace"}}>{leadRef}</strong></div>}
          </div>
          <div style={{fontSize:10,color:t.textMuted,background:t.surface,padding:"7px 14px",borderRadius:20,border:`1px solid ${t.border}`,textTransform:"uppercase",letterSpacing:"0.1em"}}>Currency: {currency}</div>
        </div>
        {/* Premium basis explanation */}
        <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:12,padding:"14px 20px",marginBottom:22,display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-start"}}>
          <div style={{fontSize:18}}>📊</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700,color:t.text,marginBottom:5}}>How these premiums are calculated</div>
            <div style={{fontSize:11,color:t.textMuted,lineHeight:1.7}}>
              {product?.id==="cargo"&&"Cargo premiums are a rate-on-value (% of insured cargo value). Base rate: 0.15–0.35% for ICC(A) standard goods. Adjusted for: ICC clause selected · conveyance mode · war & strikes add-on · perishable goods · claims history."}
              {product?.id==="hull"&&"Hull & Machinery premiums are rated as % of agreed vessel value. Base rate: 0.5–1.5% per year. Adjusted for: vessel age · operating waters · trade route · P&I · TPL add-on · loss of hire · pollution cover · claims history."}
              {product?.id==="pleasure"&&"Pleasure craft premiums run 1–2.5% of agreed hull value annually. Adjusted for: craft type · navigation area · charter use · racing · TPL add-on · vessel age · claims history."}
              {(product?.id==="jetski"||product?.id==="speedboat")&&"Small craft premiums run 1.5–4% of insured value annually, reflecting higher frequency of incidents. Adjusted for: vessel age · usage area · racing · claims history."}
              {product?.id==="barge"&&"Commercial barge premiums run 0.6–1.4% of hull value. Adjusted for: vessel type · operating area · cargo type · pollution cover · loss of hire · claims history."}
              {product?.id==="liability"&&"Liability premiums are rated as % of the declared limit of indemnity. Base rate: 0.8–2.5% depending on liability type and risk profile. Adjusted for: operating area · crew size · claims history."}
              {" "}Deductible is {product?.id==="cargo"?"0.5%":"1–2%"} of insured value. {product?.id==="cargo"&&"Coverage = CIF + 10% per international trade standard (ICC/Incoterms)."}
            </div>
          </div>
        </div>
        {quotes.map((q,i)=>(
          <div key={q.id} style={{background:i===0?t.cardBest:t.surface,border:`1px solid ${i===0?t.cardBestBorder:t.border}`,borderRadius:14,padding:"22px 26px",marginBottom:14,position:"relative",boxShadow:dark?"none":"0 2px 12px rgba(0,0,0,0.06)"}}>
            {i===0&&<div style={{position:"absolute",top:-11,left:20,background:"#0ea5e9",color:"#fff",fontSize:10,fontWeight:700,padding:"3px 12px",borderRadius:12}}>⭐ Best Value</div>}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:42,height:42,borderRadius:10,background:"linear-gradient(135deg,#1e3a5f,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff"}}>{q.logo}</div>
                <div>
                  <div style={{fontSize:15,fontWeight:600,color:t.text}}>{q.name}</div>
                  <div style={{fontSize:12,color:t.textMuted}}>Rating: <strong style={{color:"#10b981"}}>{q.rating}</strong> · {q.specialty}</div>
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:2}}>Annual Premium</div>
                <div style={{fontSize:26,fontWeight:700,color:"#0ea5e9"}}>{sym}{q.premium.toLocaleString()}</div>
                <div style={{fontSize:11,color:t.textMuted,marginTop:2}}>Rate: <strong style={{color:t.textSub}}>{q.annualRate}%</strong> of insured value</div>
              </div>
            </div>
            <div style={{display:"flex",gap:18,marginBottom:12,flexWrap:"wrap"}}>
              {[
                ["Insured Value", `${sym}${q.coverage.toLocaleString()}`],
                ["Deductible", `${sym}${q.deductible.toLocaleString()} (${q.deductiblePct}%)`],
                ["Response", q.responseTime],
                ["Score", `${q.score}/100`]
              ].map(([l,v])=>(
                <div key={l}>
                  <div style={{fontSize:10,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.1em"}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:600,color:l==="Score"?"#0ea5e9":t.text,marginTop:2}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginBottom:14}}>
              {q.inclusions.map(inc=><span key={inc} style={{fontSize:10,color:"#10b981",background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.25)",padding:"3px 10px",borderRadius:10}}>{inc}</span>)}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
              <button onClick={()=>onSelect(q,"overview")} style={{background:"transparent",border:`1px solid rgba(14,165,233,0.35)`,borderRadius:8,padding:"8px 16px",color:"#0ea5e9",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>View Details</button>
              <button onClick={()=>onSelect(q,"bind")} style={{background:"#0ea5e9",border:"none",borderRadius:8,padding:"8px 18px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Bind Quote →</button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardScreen({ quote, form, product, currency, dashTab, setDashTab, onBack, onHome, dark, onToggleDark }) {
  const { t } = useTheme();
  const sym = currencySymbol(currency);
  return (
    <div style={{minHeight:"100vh",background:t.bg}}>
      <AppHeader onHome={onHome} dark={dark} onToggleDark={onToggleDark}
        right={
          <div style={{flex:1,display:"flex",justifyContent:"center"}}>
            <div style={{display:"flex",gap:3,background:t.surface,borderRadius:10,padding:3,border:`1px solid ${t.border}`}}>
              {["overview","policy","bind","claims"].map(tab=>(
                <button key={tab} onClick={()=>setDashTab(tab)} style={{background:dashTab===tab?"rgba(14,165,233,0.15)":"transparent",border:"none",color:dashTab===tab?"#0ea5e9":t.textMuted,padding:"7px 15px",borderRadius:8,cursor:"pointer",fontSize:12,fontFamily:"inherit",textTransform:"capitalize"}}>{tab}</button>
              ))}
            </div>
          </div>
        }
      />
      <main style={{maxWidth:1000,margin:"0 auto",padding:"30px 24px 80px"}}>
        <button onClick={onBack} style={{background:"none",border:"none",color:t.textMuted,fontSize:12,cursor:"pointer",fontFamily:"inherit",marginBottom:18,display:"block"}}>← Back to Quotes</button>
        {dashTab==="overview"&&(
          <div style={{display:"grid",gridTemplateColumns:"270px 1fr",gap:18}}>
            <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,padding:"24px",boxShadow:dark?"none":"0 2px 12px rgba(0,0,0,0.05)"}}>
              <div style={{width:54,height:54,borderRadius:11,background:"linear-gradient(135deg,#1e3a5f,#0ea5e9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:700,color:"#fff",marginBottom:14}}>{quote.logo}</div>
              <h2 style={{fontSize:18,fontWeight:700,color:t.text,margin:"0 0 6px"}}>{quote.name}</h2>
              <div style={{display:"inline-block",background:"rgba(16,185,129,0.1)",color:"#10b981",border:"1px solid rgba(16,185,129,0.25)",padding:"3px 10px",borderRadius:10,fontSize:11,marginBottom:14}}>Rating: {quote.rating}</div>
              <p style={{fontSize:13,color:t.textMuted,lineHeight:1.6,marginBottom:16}}>Specializing in {quote.specialty}, backed by Lloyd's syndicates with 200+ years of maritime experience.</p>
              {[["Founded","1823"],["HQ","London, UK"],["Claims p.a.","12,400+"],["Response",quote.responseTime]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:7,borderBottom:`1px solid ${t.border}`,paddingBottom:6}}><span style={{color:t.textMuted}}>{l}</span><span style={{color:t.text,fontWeight:500}}>{v}</span></div>
              ))}
            </div>
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                {[["Annual Premium",`${sym}${quote.premium.toLocaleString()}`,"#0ea5e9"],["Coverage Limit",`${sym}${quote.coverage.toLocaleString()}`,"#10b981"],["Deductible",`${sym}${quote.deductible.toLocaleString()}`,"#f59e0b"],["Trust Score",`${quote.score}/100`,"#6366f1"]].map(([l,v,c])=>(
                  <div key={l} style={{background:t.surface,border:`1px solid ${t.border}`,borderTop:`3px solid ${c}`,borderRadius:11,padding:"16px 18px",boxShadow:dark?"none":"0 2px 8px rgba(0,0,0,0.05)"}}>
                    <div style={{fontSize:20,fontWeight:700,color:t.text}}>{v}</div>
                    <div style={{fontSize:10,color:t.textMuted,marginTop:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:11,padding:"20px",boxShadow:dark?"none":"0 2px 8px rgba(0,0,0,0.04)"}}>
                <div style={{fontSize:10,fontWeight:700,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Inclusions</div>
                {quote.inclusions.map(inc=><div key={inc} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:t.textSub,marginBottom:6}}><span style={{color:"#10b981"}}>✓</span>{inc}</div>)}
                <div style={{fontSize:10,fontWeight:700,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.1em",marginTop:14,marginBottom:10}}>Exclusions</div>
                {["Nuclear risks","Inherent vice","Delay losses","Illegal trade"].map(exc=><div key={exc} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:t.textSub,marginBottom:6}}><span style={{color:"#ef4444"}}>✗</span>{exc}</div>)}
              </div>
            </div>
          </div>
        )}
        {dashTab==="policy"&&(
          <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,padding:"28px 32px",boxShadow:dark?"none":"0 2px 12px rgba(0,0,0,0.05)"}}>
            <h2 style={{fontSize:20,fontWeight:700,color:t.text,margin:"0 0 22px"}}>Policy Terms</h2>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:22}}>
              {[["Policy Period","12 months from binding date. Renewal available 30 days prior."],["Coverage Basis","All Risks — Institute Hull Clauses / Institute Cargo Clauses (A)."],["Valuation","Agreed value basis. Insured value declared at inception."],["Claims Procedure","Notify within 72 hours. Survey within 24 hrs. Settlement: 30 days."],["Survey Requirements","Pre-insurance survey for vessels over 15 years old."],["Governing Law","English law. Arbitration for disputes above $100,000."]].map(([title,content])=>(
                <div key={title} style={{background:t.policyItem,borderRadius:8,padding:"13px 15px",border:`1px solid ${t.policyBorder}`}}>
                  <h4 style={{fontSize:10,fontWeight:700,color:"#0ea5e9",textTransform:"uppercase",letterSpacing:"0.1em",margin:"0 0 6px"}}>{title}</h4>
                  <p style={{fontSize:13,color:t.textSub,lineHeight:1.6,margin:0}}>{content}</p>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {["Policy Wording.pdf","Institute Clauses.pdf","Claims Guide.pdf"].map(d=><div key={d} style={{fontSize:12,color:t.textMuted,background:t.docChip,border:`1px solid ${t.border}`,padding:"7px 12px",borderRadius:7,cursor:"pointer"}}>📄 {d}</div>)}
            </div>
          </div>
        )}
        {dashTab==="bind"&&(
          <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,padding:"28px 32px",boxShadow:dark?"none":"0 2px 12px rgba(0,0,0,0.05)"}}>
            <h2 style={{fontSize:20,fontWeight:700,color:t.text,margin:"0 0 18px"}}>Bind Your Policy</h2>
            <div style={{background:t.bindSummary,border:`1px solid ${t.bindBorder}`,borderRadius:10,padding:"16px 20px",marginBottom:20}}>
              {[["Insurer",quote.name],["Product",product?.label],["Annual Premium",`${currency} ${quote.premium.toLocaleString()}`],["Coverage",`${sym}${quote.coverage.toLocaleString()}`],["Deductible",`${sym}${quote.deductible.toLocaleString()}`]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:9,borderBottom:`1px solid ${t.border}`,paddingBottom:8}}><span style={{color:t.textMuted}}>{l}</span><strong style={{color:l==="Annual Premium"?"#0ea5e9":t.text}}>{v}</strong></div>
              ))}
            </div>
            <p style={{color:t.textMuted,fontSize:13,marginBottom:20}}>Submitting as: <strong style={{color:t.text}}>{form.fullName||"—"}</strong> · {form.email||"—"}</p>
            <button style={{background:"#0ea5e9",border:"none",borderRadius:10,padding:"14px",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",width:"100%"}}>🔒 Submit Binding Request</button>
            <p style={{fontSize:12,color:t.textMuted,textAlign:"center",marginTop:10}}>Reviewed by {quote.name} within {quote.responseTime}. Policy document issued on confirmation.</p>
          </div>
        )}
        {dashTab==="claims"&&(
          <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:14,padding:"28px 32px",boxShadow:dark?"none":"0 2px 12px rgba(0,0,0,0.05)"}}>
            <h2 style={{fontSize:20,fontWeight:700,color:t.text,margin:"0 0 6px"}}>Claims Tracker</h2>
            <p style={{fontSize:13,color:t.textMuted,margin:"0 0 26px"}}>Once your policy is active, submit and track claims here.</p>
            {[{a:true,l:"Policy Active",d:"Your policy is in force",dt:"Upon binding"},{a:false,l:"Submit Claim",d:"Report loss event within 72 hours",dt:"—"},{a:false,l:"Survey Arranged",d:"Independent surveyor within 24 hrs",dt:"—"},{a:false,l:"Loss Assessment",d:"Quantification & liability determination",dt:"—"},{a:false,l:"Settlement",d:"Payment processed within 30 days",dt:"—"}].map((item,i)=>(
              <div key={i} style={{display:"flex",gap:14,paddingBottom:20}}>
                <div style={{width:14,height:14,borderRadius:"50%",marginTop:3,flexShrink:0,...(item.a?{background:"#0ea5e9",boxShadow:"0 0 10px rgba(14,165,233,0.6)"}:{border:`2px solid ${t.timelinePending}`})}} />
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:t.text,marginBottom:3}}>{item.l}</div>
                  <div style={{fontSize:12,color:t.textMuted}}>{item.d}</div>
                  <div style={{fontSize:11,color:t.textFaint,marginTop:2}}>{item.dt}</div>
                </div>
              </div>
            ))}
            <button style={{background:"#0ea5e9",border:"none",borderRadius:8,padding:"10px 20px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Submit New Claim</button>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── VALIDATED FIELD ─────────────────────────────────────────────────────────
function VF({ label, fkey, form, touched, tip, children }) {
  const { t } = useTheme();
  const val = form[fkey];
  const isTouched = touched[fkey];
  const validate = validators[fkey];
  const isValid = validate ? validate(val) : (val&&String(val).trim().length>0);
  const showOk  = isTouched && isValid;
  const showErr = isTouched && !isValid && validate;
  return (
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <label style={{fontSize:10,fontWeight:700,color:t.textMuted,textTransform:"uppercase",letterSpacing:"0.1em"}}>{label}</label>
        {tip&&<Tooltip text={tip} />}
        {showOk &&<span style={{marginLeft:"auto",fontSize:13,color:"#10b981",fontWeight:700}}>✓</span>}
        {showErr&&<span style={{marginLeft:"auto",fontSize:10,color:"#ef4444"}}>Required</span>}
      </div>
      {children}
    </div>
  );
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
function Tooltip({ text }) {
  const { t } = useTheme();
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  useEffect(()=>{const h=e=>{if(ref.current&&!ref.current.contains(e.target))setShow(false)};document.addEventListener("mousedown",h);return()=>document.removeEventListener("mousedown",h);},[]);
  return (
    <div ref={ref} style={{position:"relative",display:"inline-flex"}}>
      <button onMouseEnter={()=>setShow(true)} onMouseLeave={()=>setShow(false)} onClick={()=>setShow(s=>!s)}
        style={{width:16,height:16,borderRadius:"50%",border:"1px solid rgba(14,165,233,0.4)",background:"rgba(14,165,233,0.1)",color:"#0ea5e9",fontSize:9,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontFamily:"inherit",padding:0}}>i</button>
      {show&&(
        <div style={{position:"absolute",left:"50%",bottom:"calc(100% + 8px)",width:220,background:t.tooltipBg,border:`1px solid ${t.tooltipBorder}`,borderRadius:8,padding:"10px 12px",fontSize:12,color:t.tooltipText,lineHeight:1.5,zIndex:999,pointerEvents:"none",boxShadow:"0 8px 24px rgba(0,0,0,0.3)",transform:"translateX(-50%)"}}>
          {text}
        </div>
      )}
    </div>
  );
}

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
function FCard({ icon, title, desc, children }) {
  const { t } = useTheme();
  return (
    <div style={{background:t.surface,border:`1px solid ${t.border}`,borderRadius:16,padding:"30px 34px",marginBottom:20,boxShadow:t===LIGHT?"0 2px 12px rgba(0,0,0,0.06)":"none"}}>
      {(icon||title)&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:5}}>{icon&&<span style={{fontSize:20}}>{icon}</span>}{title&&<h2 style={{fontSize:20,fontWeight:700,margin:0,color:t.text}}>{title}</h2>}</div>}
      {desc&&<p style={{fontSize:13,color:t.textMuted,margin:"0 0 24px"}}>{desc}</p>}
      {children}
    </div>
  );
}
function G2({ children }) { return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:22}}>{children}</div>; }
function In({ value, onChange, onBlur, type="text", placeholder }) {
  const { t } = useTheme();
  return <input style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:8,padding:"10px 12px",color:t.inputText,fontSize:13,outline:"none",fontFamily:"inherit",width:"100%"}} type={type} value={value} onChange={e=>onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder} />;
}
function Sel({ value, onChange, options, placeholder }) {
  const { t } = useTheme();
  return <select style={{background:t.input,border:`1px solid ${t.inputBorder}`,borderRadius:8,padding:"10px 12px",color:t.inputText,fontSize:13,outline:"none",fontFamily:"inherit",width:"100%"}} value={value} onChange={e=>onChange(e.target.value)}><option value="">{placeholder||"Select…"}</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>;
}
function RG({ options, value, onChange, inline }) {
  const { t } = useTheme();
  return (
    <div style={{display:"flex",flexDirection:inline?"row":"column",gap:7,flexWrap:"wrap"}}>
      {options.map(opt=>(
        <label key={opt} style={{padding:"8px 13px",border:`1px solid ${value===opt?"#0ea5e9":t.radioInactive}`,borderRadius:8,fontSize:12,cursor:"pointer",color:value===opt?"#0ea5e9":t.textSub,background:value===opt?"rgba(14,165,233,0.1)":t.surface,whiteSpace:"nowrap",transition:"all 0.15s",boxShadow:value!==opt&&t===LIGHT?"0 1px 3px rgba(0,0,0,0.05)":"none"}}>
          <input type="radio" value={opt} checked={value===opt} onChange={()=>onChange(opt)} style={{display:"none"}} />
          {value===opt?"◉ ":"○ "}{opt}
        </label>
      ))}
    </div>
  );
}
function BtnRow({ children }) { return <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:26}}>{children}</div>; }
function Btn({ children, primary, onClick }) {
  const { t } = useTheme();
  return (
    <button onClick={onClick} style={primary
      ? {background:"#0ea5e9",border:"none",borderRadius:8,padding:"10px 22px",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 8px rgba(14,165,233,0.3)"}
      : {background:t.surface,border:`1px solid ${t.btnSecBorder}`,borderRadius:8,padding:"10px 22px",color:t.btnSecText,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
      {children}
    </button>
  );
}
