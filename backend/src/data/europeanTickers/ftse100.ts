// FTSE 100 - UK's benchmark index
import { STOXX600_TICKERS } from './stoxx600';

export const FTSE100_TICKERS = STOXX600_TICKERS.filter(t => t.countryCode === 'GB').slice(0, 100);
export const FTSE100_COUNT = FTSE100_TICKERS.length;
