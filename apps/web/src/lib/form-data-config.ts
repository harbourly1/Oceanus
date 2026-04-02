// Form Data Display Configuration
// Maps product form field keys to human-readable labels with grouping and formatting

type FieldFormat = 'money' | 'date';

interface FieldDescriptor {
  key: string;
  label: string;
  format?: FieldFormat;
}

interface FieldGroup {
  title: string;
  fields: FieldDescriptor[];
}

export interface FormDataGroupResult {
  title: string;
  fields: { label: string; value: string }[];
}

// ---------------------------------------------------------------------------
// Per-product field configuration
// ---------------------------------------------------------------------------

const CARGO: FieldGroup[] = [
  {
    title: 'Policy Details',
    fields: [
      { key: 'policyType', label: 'Policy Type' },
      { key: 'conveyanceMode', label: 'Mode of Conveyance' },
      { key: 'interestType', label: 'Insurable Interest' },
      { key: 'sumInsuredBasis', label: 'Sum Insured Basis' },
    ],
  },
  {
    title: 'Shipment & Route',
    fields: [
      { key: 'originPort', label: 'Origin Port / City' },
      { key: 'destinationPort', label: 'Destination Port / City' },
      { key: 'tradeRoute', label: 'Trade Route' },
      { key: 'commodity', label: 'Commodity / Goods' },
      { key: 'cargoCategory', label: 'Cargo Category' },
      { key: 'packingType', label: 'Packing Type' },
      { key: 'shipmentCount', label: 'Shipments / Year' },
    ],
  },
  {
    title: 'Values',
    fields: [
      { key: 'cargoValue', label: 'Cargo Value', format: 'money' },
      { key: 'annualTurnover', label: 'Annual Turnover', format: 'money' },
      { key: 'maxAnySending', label: 'Max Any One Sending', format: 'money' },
      { key: 'maxAnyLocation', label: 'Max Any One Location', format: 'money' },
    ],
  },
  {
    title: 'Coverage & Extensions',
    fields: [
      { key: 'iccClause', label: 'ICC Clause' },
      { key: 'warStrikes', label: 'War & Strikes' },
      { key: 'letterOfCredit', label: 'Letter of Credit' },
      { key: 'inlandTransit', label: 'Inland Transit' },
      { key: 'storageDuration', label: 'Storage Duration' },
      { key: 'transshipment', label: 'Transshipment' },
      { key: 'dutyInsurance', label: 'Duty Insurance' },
      { key: 'increasedValue', label: 'Increased Value' },
      { key: 'perishable', label: 'Perishable Cargo' },
    ],
  },
  {
    title: 'History',
    fields: [
      { key: 'claims', label: 'Claims History' },
      { key: 'effectiveDate', label: 'Effective Date', format: 'date' },
    ],
  },
];

const HULL: FieldGroup[] = [
  {
    title: 'Vessel Details',
    fields: [
      { key: 'vesselName', label: 'Vessel Name' },
      { key: 'hullType', label: 'Vessel Type' },
      { key: 'flag', label: 'Flag State' },
      { key: 'imo', label: 'IMO Number' },
      { key: 'buildYear', label: 'Build Year' },
      { key: 'grt', label: 'GRT (Gross Tonnage)' },
      { key: 'vesselValue', label: 'Hull Value', format: 'money' },
      { key: 'classification', label: 'Classification Society' },
      { key: 'hullMaterial', label: 'Hull Material' },
      { key: 'enginePower', label: 'Engine Power (kW)' },
      { key: 'surveyStatus', label: 'Survey Status' },
      { key: 'operatingWaters', label: 'Operating Waters' },
    ],
  },
  {
    title: 'Coverage',
    fields: [
      { key: 'pandi', label: 'P&I Club' },
      { key: 'tplCover', label: 'TPL Cover' },
      { key: 'tplLimit', label: 'TPL Limit', format: 'money' },
    ],
  },
  {
    title: 'Operations',
    fields: [
      { key: 'tradeRoute', label: 'Trade Route' },
      { key: 'cargoType', label: 'Cargo Type' },
      { key: 'homePort', label: 'Home Port' },
      { key: 'crew', label: 'Crew' },
      { key: 'voyages', label: 'Voyages / Year' },
      { key: 'lossOfHire', label: 'Loss of Hire' },
      { key: 'pollution', label: 'Pollution Liability' },
    ],
  },
  {
    title: 'History',
    fields: [
      { key: 'claims', label: 'Claims History' },
      { key: 'effectiveDate', label: 'Effective Date', format: 'date' },
    ],
  },
];

const LIABILITY: FieldGroup[] = [
  {
    title: 'Entity Details',
    fields: [
      { key: 'liabilityType', label: 'Liability Type' },
      { key: 'vesselName', label: 'Company / Entity' },
      { key: 'flag', label: 'Country' },
      { key: 'tradeRoute', label: 'Operating Area' },
    ],
  },
  {
    title: 'Financial',
    fields: [
      { key: 'liabilityLimit', label: 'Liability Limit', format: 'money' },
      { key: 'annualRevenue', label: 'Annual Revenue', format: 'money' },
      { key: 'annualTurnover', label: 'Annual Turnover', format: 'money' },
    ],
  },
  {
    title: 'Fleet / Operations',
    fields: [
      { key: 'imo', label: 'Vessel / IMO' },
      { key: 'grt', label: 'Vessel GRT' },
      { key: 'fleetSize', label: 'Fleet Size' },
      { key: 'shipmentCount', label: 'Shipments / Year' },
      { key: 'homePort', label: 'Terminal / Port' },
      { key: 'crew', label: 'Employees / Crew' },
    ],
  },
  {
    title: 'History',
    fields: [
      { key: 'claims', label: 'Claims History' },
      { key: 'effectiveDate', label: 'Effective Date', format: 'date' },
    ],
  },
];

const PLEASURE: FieldGroup[] = [
  {
    title: 'Craft Details',
    fields: [
      { key: 'craftName', label: 'Craft Name' },
      { key: 'craftType', label: 'Craft Type' },
      { key: 'builder', label: 'Builder / Brand' },
      { key: 'model', label: 'Model' },
      { key: 'buildYear', label: 'Build Year' },
      { key: 'length', label: 'Length (m)' },
      { key: 'craftValue', label: 'Insured Value', format: 'money' },
      { key: 'flag', label: 'Registration Country' },
      { key: 'engineType', label: 'Engine Type' },
      { key: 'hullMaterial', label: 'Hull Material' },
    ],
  },
  {
    title: 'Tender',
    fields: [
      { key: 'tender', label: 'Tender Included' },
      { key: 'tenderValue', label: 'Tender Value', format: 'money' },
    ],
  },
  {
    title: 'Use & Coverage',
    fields: [
      { key: 'navArea', label: 'Navigation Area' },
      { key: 'use', label: 'Primary Use' },
      { key: 'marina', label: 'Home Marina' },
      { key: 'crew', label: 'Crew' },
      { key: 'experience', label: 'Experience' },
      { key: 'surveyStatus', label: 'Survey Status' },
      { key: 'tplCover', label: 'TPL Cover' },
      { key: 'tplLimit', label: 'TPL Limit', format: 'money' },
      { key: 'racing', label: 'Racing Use' },
    ],
  },
  {
    title: 'History',
    fields: [
      { key: 'claims', label: 'Claims History' },
      { key: 'effectiveDate', label: 'Effective Date', format: 'date' },
    ],
  },
];

const JETSKI: FieldGroup[] = [
  {
    title: 'PWC Details',
    fields: [
      { key: 'brand', label: 'Brand' },
      { key: 'model', label: 'Model' },
      { key: 'buildYear', label: 'Build Year' },
      { key: 'pwcValue', label: 'Market Value', format: 'money' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'country', label: 'Country' },
    ],
  },
  {
    title: 'Use & Coverage',
    fields: [
      { key: 'usageArea', label: 'Usage Area' },
      { key: 'storage', label: 'Storage' },
      { key: 'racing', label: 'Racing Use' },
    ],
  },
  {
    title: 'History',
    fields: [
      { key: 'claims', label: 'Claims History' },
      { key: 'effectiveDate', label: 'Effective Date', format: 'date' },
    ],
  },
];

const SPEEDBOAT: FieldGroup[] = [
  {
    title: 'Boat Details',
    fields: [
      { key: 'boatType', label: 'Boat Type' },
      { key: 'brand', label: 'Brand' },
      { key: 'buildYear', label: 'Build Year' },
      { key: 'length', label: 'Length (m)' },
      { key: 'boatValue', label: 'Market Value', format: 'money' },
      { key: 'engineConfig', label: 'Engine Config' },
      { key: 'country', label: 'Country' },
    ],
  },
  {
    title: 'Use & Coverage',
    fields: [
      { key: 'use', label: 'Primary Use' },
      { key: 'storage', label: 'Storage' },
      { key: 'overnight', label: 'Overnight Passages' },
    ],
  },
  {
    title: 'History',
    fields: [
      { key: 'claims', label: 'Claims History' },
      { key: 'effectiveDate', label: 'Effective Date', format: 'date' },
    ],
  },
];

const BARGE: FieldGroup[] = [
  {
    title: 'Vessel Details',
    fields: [
      { key: 'vesselType', label: 'Vessel Type' },
      { key: 'vesselName', label: 'Vessel Name' },
      { key: 'flag', label: 'Flag State' },
      { key: 'buildYear', label: 'Build Year' },
      { key: 'length', label: 'Length (m)' },
      { key: 'vesselValue', label: 'Vessel Value', format: 'money' },
      { key: 'classification', label: 'Classification' },
    ],
  },
  {
    title: 'Operations',
    fields: [
      { key: 'operatingArea', label: 'Operating Area' },
      { key: 'opType', label: 'Operation Type' },
      { key: 'cargoType', label: 'Cargo Type' },
      { key: 'crew', label: 'Crew' },
      { key: 'lossOfHire', label: 'Loss of Hire' },
      { key: 'pollution', label: 'Pollution Liability' },
    ],
  },
  {
    title: 'History',
    fields: [
      { key: 'claims', label: 'Claims History' },
      { key: 'effectiveDate', label: 'Effective Date', format: 'date' },
    ],
  },
];

const FORM_FIELD_CONFIG: Record<string, FieldGroup[]> = {
  CARGO,
  HULL,
  LIABILITY,
  PLEASURE,
  JETSKI,
  SPEEDBOAT,
  BARGE,
};

// ---------------------------------------------------------------------------
// Value formatting
// ---------------------------------------------------------------------------

function formatFormValue(value: unknown, format?: FieldFormat): string {
  if (value == null || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);

  const str = String(value);

  if (format === 'money') {
    const num = Number(str.replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? str : num.toLocaleString();
  }

  if (format === 'date') {
    const d = new Date(str);
    return isNaN(d.getTime()) ? str : d.toLocaleDateString();
  }

  return str;
}

// ---------------------------------------------------------------------------
// camelCase fallback for unknown keys
// ---------------------------------------------------------------------------

function camelCaseToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

export function getFormDataGroups(
  productType: string,
  formData: Record<string, unknown>,
): FormDataGroupResult[] {
  const config = FORM_FIELD_CONFIG[productType?.toUpperCase()] || [];
  const consumed = new Set<string>();
  const result: FormDataGroupResult[] = [];

  for (const group of config) {
    const fields: { label: string; value: string }[] = [];

    for (const fd of group.fields) {
      if (!(fd.key in formData)) continue;
      consumed.add(fd.key);
      fields.push({
        label: fd.label,
        value: formatFormValue(formData[fd.key], fd.format),
      });
    }

    if (fields.length > 0) {
      result.push({ title: group.title, fields });
    }
  }

  // Collect unknown keys into "Other Details"
  const unknownFields: { label: string; value: string }[] = [];
  for (const key of Object.keys(formData)) {
    if (consumed.has(key)) continue;
    unknownFields.push({
      label: camelCaseToLabel(key),
      value: formatFormValue(formData[key]),
    });
  }

  if (unknownFields.length > 0) {
    result.push({ title: 'Other Details', fields: unknownFields });
  }

  return result;
}
