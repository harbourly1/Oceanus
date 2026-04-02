import { Currency } from '../enums';
import { VAT_RATE } from './workflow-rules';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  [Currency.AED]: 'AED ',
  [Currency.USD]: '$',
  [Currency.EUR]: '\u20AC',
  [Currency.GBP]: '\u00A3',
};

export function computeVat(amount: number, currency: Currency): number {
  return currency === Currency.AED ? Math.round(amount * VAT_RATE) : 0;
}
