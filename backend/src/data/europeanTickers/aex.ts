// AEX - Netherlands benchmark index
import { STOXX600_TICKERS } from './stoxx600';

export const AEX_TICKERS = STOXX600_TICKERS.filter(t => t.countryCode === 'NL').slice(0, 25);
export const AEX_COUNT = AEX_TICKERS.length;
