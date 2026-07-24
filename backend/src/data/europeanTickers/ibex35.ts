// IBEX 35 - Spain's benchmark index
import { STOXX600_TICKERS } from './stoxx600';

export const IBEX35_TICKERS = STOXX600_TICKERS.filter(t => t.countryCode === 'ES').slice(0, 35);
export const IBEX35_COUNT = IBEX35_TICKERS.length;
