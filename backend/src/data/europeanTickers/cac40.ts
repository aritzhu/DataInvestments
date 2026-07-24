// CAC 40 - France's benchmark index
import { STOXX600_TICKERS } from './stoxx600';

export const CAC40_TICKERS = STOXX600_TICKERS.filter(t => t.countryCode === 'FR').slice(0, 40);
export const CAC40_COUNT = CAC40_TICKERS.length;
