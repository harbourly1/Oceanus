import { EndorsementType, InvoiceType } from '../enums';

// ─── Invoice Numbering Rules ──────────────────────────────────────────────────

/**
 * Invoice number format by type:
 * - NEW_POLICY:    INV-YYYY-XXXX
 * - CANCELLATION:  INV-YYYY-XXXX-C
 * - EXTENSION:     INV-YYYY-XXXX-EXT-N
 * - NAME_CHANGE:   INV-YYYY-XXXX-NC-N
 * - ADDON:         INV-YYYY-XXXX-A-N
 */
export const INVOICE_SUFFIX_MAP: Record<InvoiceType, string> = {
  [InvoiceType.NEW_POLICY]:   '',
  [InvoiceType.CANCELLATION]: '-C',
  [InvoiceType.EXTENSION]:    '-EXT',
  [InvoiceType.NAME_CHANGE]:  '-NC',
  [InvoiceType.ADDON]:        '-A',
};

// ─── Endorsement Workflow Rules ───────────────────────────────────────────────

/** Whether an endorsement type requires an invoice */
export const ENDORSEMENT_REQUIRES_INVOICE: Record<EndorsementType, boolean> = {
  [EndorsementType.CANCELLATION]: false,
  [EndorsementType.EXTENSION]:    true,
  [EndorsementType.NAME_CHANGE]:  true,
  [EndorsementType.ADDON]:        true,
};

/** Map endorsement type to invoice type */
export const ENDORSEMENT_TO_INVOICE_TYPE: Partial<Record<EndorsementType, InvoiceType>> = {
  [EndorsementType.EXTENSION]:    InvoiceType.EXTENSION,
  [EndorsementType.NAME_CHANGE]:  InvoiceType.NAME_CHANGE,
  [EndorsementType.ADDON]:        InvoiceType.ADDON,
};

/** Whether an endorsement type goes to Cancellation queue (vs Approval queue) */
export const ENDORSEMENT_GOES_TO_COMPLETION: Record<EndorsementType, boolean> = {
  [EndorsementType.CANCELLATION]: true,
  [EndorsementType.EXTENSION]:    false,
  [EndorsementType.NAME_CHANGE]:  false,
  [EndorsementType.ADDON]:        false,
};

// ─── VAT Configuration ────────────────────────────────────────────────────────

/** UAE VAT rate */
export const VAT_RATE = 0.05;
