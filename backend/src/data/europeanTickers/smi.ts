// SMI - Switzerland's benchmark index
import { STOXX600_TICKERS } from './stoxx600';

export const SMI_TICKERS = STOXX600_TICKERS.filter(t => t.countryCode === 'CH').slice(0, 20);
export const SMI_COUNT = SMI_TICKERS.length;
