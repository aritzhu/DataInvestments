// DAX 40 - Germany's benchmark index
import { STOXX600_TICKERS } from './stoxx600';

export const DAX_TICKERS = STOXX600_TICKERS.filter(t => t.countryCode === 'DE').slice(0, 40);
export const DAX_COUNT = DAX_TICKERS.length;
