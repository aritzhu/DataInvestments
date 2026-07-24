// FTSE MIB - Italy's benchmark index
import { STOXX600_TICKERS } from './stoxx600';

export const FTSEMIB_TICKERS = STOXX600_TICKERS.filter(t => t.countryCode === 'IT').slice(0, 40);
export const FTSEMIB_COUNT = FTSEMIB_TICKERS.length;
