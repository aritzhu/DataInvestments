// S&P 500 constituents — top ~500 US companies by market cap
// Source: Wikipedia S&P 500 component list (updated quarterly)
// Last updated: Q2 2025
export const SP500_TICKERS: string[] = [
  // Technology
  'AAPL', 'MSFT', 'NVDA', 'AVGO', 'ORCL', 'CRM', 'AMD', 'ADBE', 'CSCO', 'ACN',
  'INTC', 'TXN', 'QCOM', 'IBM', 'NOW', 'INTU', 'AMAT', 'MU', 'LRCX', 'KLAC',
  'ADI', 'SNPS', 'CDNS', 'MRVL', 'FTNT', 'PANW', 'CRWD', 'ZS', 'DDOG', 'NET',
  'TEAM', 'PLTR', 'ARM', 'DELL', 'HPE', 'HPQ', 'MSI', 'NXPI', 'APH', 'STX',
  // Communication Services
  'META', 'GOOGL', 'GOOG', 'DIS', 'NFLX', 'CMCSA', 'TMUS', 'VZ', 'T', 'CHTR',
  'EA', 'TTWO', 'MTCH', 'PARA', 'WBD', 'FOX', 'LYV', 'OMC',
  // Consumer Cyclical
  'AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'TJX', 'LOW', 'TGT', 'BKNG',
  'CMG', 'ORLY', 'AZO', 'ROST', 'DHI', 'LEN', 'NVR', 'POOL', 'YUM', 'DPZ',
  'EBAY', 'ETSY', 'ABNB', 'MAR', 'HLT', 'MGM', 'CCL', 'RCL', 'GM', 'F',
  // Consumer Defensive
  'PG', 'KO', 'PEP', 'COST', 'WMT', 'PM', 'MO', 'MDLZ', 'CL', 'KMB',
  'GIS', 'K', 'HSY', 'SJM', 'CAG', 'MNST', 'STZ', 'ADM', 'TSN', 'TAP',
  'KHC', 'CHD', 'CLX', 'EL', 'PVH', 'VFC', 'LEG',
  // Healthcare
  'UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'PFE', 'TMO', 'ABT', 'AMGN', 'DHR',
  'BMY', 'GILD', 'CVS', 'MDT', 'ISRG', 'VRTX', 'REGN', 'SYK', 'BSX', 'EW',
  'ZTS', 'CI', 'ELV', 'HCA', 'IQV', 'MCK', 'A', 'TECH', 'BIIB', 'INCY',
  'VTRS', 'OGN', 'EXAS', 'DXCM', 'RVTY', 'BIO', 'ALGN', 'HOLX', 'IDXX',
  // Financial Services
  'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'SCHW', 'AXP',
  'BLK', 'C', 'PGR', 'CB', 'MMC', 'AON', 'ICE', 'CME', 'SPGI', 'MCO',
  'MSCI', 'COF', 'USB', 'TFC', 'PNC', 'TFC', 'BK', 'STT', 'NTRS', 'AFL',
  'MET', 'PRU', 'AIG', 'TRV', 'ALL', 'CNC', 'HUM', 'EOG', 'WRB', 'RJF',
  // Industrials
  'GE', 'CAT', 'HON', 'RTX', 'UNP', 'BA', 'DE', 'LMT', 'MMM', 'GD',
  'WM', 'ETN', 'ITW', 'EMR', 'ROK', 'PH', 'TDG', 'CTAS', 'OTIS', 'CSX',
  'NSC', 'FDX', 'UPS', 'JBHT', 'CHRW', 'XPO', 'DAL', 'UAL', 'LUV', 'AAL',
  'ALK', 'FAST', 'PCAR', 'WAB', 'GWW', 'SWK', 'IR', 'XYL', 'JCI', 'CARR',
  // Energy
  'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'PSX', 'VLO', 'OXY', 'KMI',
  'WMB', 'HAL', 'BKR', 'DVN', 'FANG', 'HES', 'PXD', 'MRO', 'OKE', 'CTRA',
  // Utilities
  'NEE', 'DUK', 'SO', 'D', 'SRE', 'AEP', 'EXC', 'XEL', 'ED', 'WEC',
  'ES', 'AWK', 'DTE', 'FE', 'ETR', 'CMS', 'PPL', 'AES', 'CEG', 'PCG',
  // Real Estate
  'PLD', 'AMT', 'CCI', 'EQIX', 'PSA', 'O', 'SPG', 'WELL', 'DLR', 'AVB',
  'EQR', 'VTR', 'ARE', 'MAA', 'UDR', 'ESS', 'EXR', 'BXP', 'KIM', 'HST',
  // Basic Materials
  'LIN', 'APD', 'SHW', 'ECL', 'FCX', 'NEM', 'NUE', 'DOW', 'DD', 'PPG',
  'CTVA', 'ALB', 'CE', 'VMC', 'MLM', 'EMN', 'CF', 'MOS', 'FMC', 'IP',
];

// Sector mapping for S&P 500 companies (top sectors only)
export const SP500_SECTORS: Record<string, string> = {
  AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', AVGO: 'Technology',
  ORCL: 'Technology', CRM: 'Technology', AMD: 'Technology', ADBE: 'Technology',
  CSCO: 'Technology', ACN: 'Technology', INTC: 'Technology', TXN: 'Technology',
  QCOM: 'Technology', IBM: 'Technology', NOW: 'Technology', INTU: 'Technology',
  META: 'Communication Services', GOOGL: 'Communication Services', GOOG: 'Communication Services',
  DIS: 'Communication Services', NFLX: 'Communication Services', CMCSA: 'Communication Services',
  AMZN: 'Consumer Cyclical', TSLA: 'Consumer Cyclical', HD: 'Consumer Cyclical',
  MCD: 'Consumer Cyclical', NKE: 'Consumer Cyclical', SBUX: 'Consumer Cyclical',
  PG: 'Consumer Defensive', KO: 'Consumer Defensive', PEP: 'Consumer Defensive',
  COST: 'Consumer Defensive', WMT: 'Consumer Defensive', PM: 'Consumer Defensive',
  UNH: 'Healthcare', JNJ: 'Healthcare', LLY: 'Healthcare', ABBV: 'Healthcare',
  MRK: 'Healthcare', PFE: 'Healthcare', TMO: 'Healthcare', ABT: 'Healthcare',
  'BRK.B': 'Financial Services', JPM: 'Financial Services', V: 'Financial Services',
  MA: 'Financial Services', BAC: 'Financial Services', WFC: 'Financial Services',
  GE: 'Industrials', CAT: 'Industrials', HON: 'Industrials', RTX: 'Industrials',
  UNP: 'Industrials', BA: 'Industrials', DE: 'Industrials', LMT: 'Industrials',
  XOM: 'Energy', CVX: 'Energy', COP: 'Energy', EOG: 'Energy', SLB: 'Energy',
  NEE: 'Utilities', DUK: 'Utilities', SO: 'Utilities', D: 'Utilities',
  PLD: 'Real Estate', AMT: 'Real Estate', CCI: 'Real Estate', EQIX: 'Real Estate',
  LIN: 'Basic Materials', APD: 'Basic Materials', SHW: 'Basic Materials',
};
