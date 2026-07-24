export { STOXX600_TICKERS, STOXX600_UNIQUE_TICKERS, STOXX600_COUNTRIES } from './stoxx600';
export type { EuropeanTicker } from './stoxx600';
export { DAX_TICKERS, DAX_COUNT } from './dax';
export { CAC40_TICKERS, CAC40_COUNT } from './cac40';
export { FTSE100_TICKERS, FTSE100_COUNT } from './ftse100';
export { IBEX35_TICKERS, IBEX35_COUNT } from './ibex35';
export { AEX_TICKERS, AEX_COUNT } from './aex';
export { FTSEMIB_TICKERS, FTSEMIB_COUNT } from './ftsemib';
export { SMI_TICKERS, SMI_COUNT } from './smi';

export interface EuropeanIndex {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  count: number;
  description: string;
}

export const EUROPEAN_INDICES: EuropeanIndex[] = [
  { id: 'stoxx600', name: 'STOXX Europe 600', country: 'Europa', countryCode: 'EU', count: 600, description: 'Los 600 mayores valores de 17 países europeos' },
  { id: 'dax', name: 'DAX 40', country: 'Alemania', countryCode: 'DE', count: 40, description: 'Las 40 mayores empresas de Alemania' },
  { id: 'cac40', name: 'CAC 40', country: 'Francia', countryCode: 'FR', count: 40, description: 'Las 40 mayores empresas de Francia' },
  { id: 'ftse100', name: 'FTSE 100', country: 'Reino Unido', countryCode: 'GB', count: 100, description: 'Las 100 mayores empresas del Reino Unido' },
  { id: 'ibex35', name: 'IBEX 35', country: 'España', countryCode: 'ES', count: 35, description: 'Las 35 mayores empresas de España' },
  { id: 'aex', name: 'AEX', country: 'Países Bajos', countryCode: 'NL', count: 25, description: 'Las 25 mayores empresas de Países Bajos' },
  { id: 'ftsemib', name: 'FTSE MIB', country: 'Italia', countryCode: 'IT', count: 40, description: 'Las 40 mayores empresas de Italia' },
  { id: 'smi', name: 'SMI', country: 'Suiza', countryCode: 'CH', count: 20, description: 'Las 20 mayores empresas de Suiza' },
];
