import { ProductType } from '../enums';

export interface ProductConfig {
  label: string;
  iconKey: string;
}

/** @deprecated Source of truth is now the `products` DB table. This remains as a static fallback for offline/portal display. */
export const PRODUCT_CONFIG: Record<ProductType, ProductConfig> = {
  [ProductType.CARGO]:     { label: 'Marine Cargo',        iconKey: 'Package' },
  [ProductType.HULL]:      { label: 'Marine Hull',         iconKey: 'Ship' },
  [ProductType.LIABILITY]: { label: 'Marine Liability',    iconKey: 'Scale' },
  [ProductType.PLEASURE]:  { label: 'Pleasure Craft',      iconKey: 'Sailboat' },
  [ProductType.JETSKI]:    { label: 'Jet Ski / PWC',       iconKey: 'Waves' },
  [ProductType.SPEEDBOAT]: { label: 'Speedboat / RIB',     iconKey: 'Zap' },
  [ProductType.BARGE]:     { label: 'Barge & Commercial',  iconKey: 'Container' },
};

/** @deprecated Source of truth is now the `rate_tables` DB table. Kept as seed reference only. */
export const QUOTE_RATES: Record<ProductType, number[]> = {
  [ProductType.CARGO]:     [0.0015, 0.0019, 0.0022, 0.0026, 0.0032],
  [ProductType.HULL]:      [0.006,  0.008,  0.010,  0.012,  0.015 ],
  [ProductType.LIABILITY]: [0.009,  0.011,  0.014,  0.018,  0.022 ],
  [ProductType.PLEASURE]:  [0.011,  0.014,  0.017,  0.020,  0.024 ],
  [ProductType.JETSKI]:    [0.022,  0.027,  0.030,  0.034,  0.040 ],
  [ProductType.SPEEDBOAT]: [0.016,  0.020,  0.024,  0.028,  0.032 ],
  [ProductType.BARGE]:     [0.007,  0.009,  0.011,  0.013,  0.015 ],
};

/** @deprecated Source of truth is now the `coverage_inclusions` DB table. Kept as seed reference only. */
export const QUOTE_INCLUSIONS: Record<string, string[]> = {
  cargo:    ['Institute Cargo Clauses', 'General Average', 'Theft & Pilferage', 'Jettison', 'Contamination'],
  hull:     ['Total Loss Cover', 'Collision Liability', 'General Average', 'Fire & Explosion', 'War Risk'],
  liability:['Third Party Property', 'Bodily Injury', 'Legal Defence', 'Pollution Liability', 'Wreck Removal'],
  pleasure: ['Agreed Hull Value', 'TPL Cover', 'Fire & Theft', 'Storm Damage', 'Personal Accident'],
  default:  ['Agreed Value Cover', 'TPL Cover', 'Fire & Theft', 'Storm & Flood'],
};

/** @deprecated Source of truth is now the `insurers` DB table. Kept as seed reference only. */
export const INSURERS = [
  { logo: 'OI', name: 'Orient Insurance',              rating: 'A',  specialty: 'All Marine Risks'       },
  { logo: 'AX', name: 'AXA Gulf',                      rating: 'A+', specialty: 'Cargo & Transit'        },
  { logo: 'OM', name: 'Oman Insurance',                rating: 'A',  specialty: 'Hull & Machinery'       },
  { logo: 'AD', name: 'Abu Dhabi National Insurance',   rating: 'A+', specialty: 'P&I & Liability'        },
  { logo: 'DT', name: 'Dar Al Takaful',                rating: 'A-', specialty: 'Takaful Marine'         },
] as const;
