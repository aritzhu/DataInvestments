// STOXX Europe 600 - Major European companies with FMP ticker suffixes
// FMP uses exchange suffixes: .DE (Germany), .PA (France), .L (UK), .MC (Spain), .AS (Netherlands), .MI (Italy), .SW (Switzerland), etc.

export interface EuropeanTicker {
  ticker: string;       // FMP format: TICKER.SUFFIX
  name: string;
  country: string;
  countryCode: string;  // ISO 3166-1 alpha-2
  exchange: string;
  sector: string;
}

// ============================================================
// GERMANY (DAX 40 + other major companies)
// ============================================================
const GERMANY: EuropeanTicker[] = [
  { ticker: "SAP.DE", name: "SAP SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Technology" },
  { ticker: "SIE.DE", name: "Siemens AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Industrials" },
  { ticker: "ALV.DE", name: "Allianz SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Financial Services" },
  { ticker: "BMW.DE", name: "Bayerische Motoren Werke AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Consumer Cyclical" },
  { ticker: "MBG.DE", name: "Mercedes-Benz Group AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Consumer Cyclical" },
  { ticker: "VOW3.DE", name: "Volkswagen AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Consumer Cyclical" },
  { ticker: "BAS.DE", name: "BASF SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Basic Materials" },
  { ticker: "BAYN.DE", name: "Bayer AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Healthcare" },
  { ticker: "DTE.DE", name: "Deutsche Telekom AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Communication Services" },
  { ticker: "DBK.DE", name: "Deutsche Bank AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Financial Services" },
  { ticker: "DB1.DE", name: "Deutsche Börse AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Financial Services" },
  { ticker: "MUV2.DE", name: "Münchener Rückversicherungs-Gesellschaft AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Financial Services" },
  { ticker: "ADS.DE", name: "adidas AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Consumer Cyclical" },
  { ticker: "HEN3.DE", name: "Henkel AG & Co. KGaA", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Consumer Defensive" },
  { ticker: "SRT3.DE", name: "Sartorius AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Healthcare" },
  { ticker: "FRE.DE", name: "Fresenius SE & Co. KGaA", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Healthcare" },
  { ticker: "FME.DE", name: "Fresenius Medical Care AG & Co. KGaA", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Healthcare" },
  { ticker: "LIN.DE", name: "Linde plc", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Basic Materials" },
  { ticker: "MRK.DE", name: "Merck KGaA", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Healthcare" },
  { ticker: "VNA.DE", name: "Vonovia SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Real Estate" },
  { ticker: "RHM.DE", name: "Rheinmetall AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Industrials" },
  { ticker: "IFX.DE", name: "Infineon Technologies AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Technology" },
  { ticker: "ETR.DE", name: "E.ON SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Utilities" },
  { ticker: "EOAN.DE", name: "E.ON SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Utilities" },
  { ticker: "HNR1.DE", name: "Hannover Rück SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Financial Services" },
  { ticker: "ZAL.DE", name: "Zalando SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Consumer Cyclical" },
  { ticker: "1COV.DE", name: "Covestro AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Basic Materials" },
  { ticker: "SHL.DE", name: "Siemens Healthineers AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Healthcare" },
  { ticker: "CON.DE", name: "Continental AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Consumer Cyclical" },
  { ticker: "DTG.DE", name: "DHL Group", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Industrials" },
  { ticker: "HDE.DE", name: "Henkel AG & Co. KGaA", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Consumer Defensive" },
  { ticker: "KGX.DE", name: "KION Group AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Industrials" },
  { ticker: "LEG.DE", name: "LEG Immobilien SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Real Estate" },
  { ticker: "MTX.DE", name: "MTU Aero Engines AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Industrials" },
  { ticker: "PAH3.DE", name: "Porsche AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Consumer Cyclical" },
  { ticker: "PUM.DE", name: "PUMA SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Consumer Cyclical" },
  { ticker: "QIA.DE", name: "Qiagen NV", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Healthcare" },
  { ticker: "RWE.DE", name: "RWE AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Utilities" },
  { ticker: "SZU.DE", name: "Symrise AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Basic Materials" },
  { ticker: "VOW.DE", name: "Volkswagen AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Consumer Cyclical" },
  { ticker: "WDI.DE", name: "Wirecard AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Technology" },
  { ticker: "HEN2.DE", name: "Henkel AG & Co. KGaA", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Consumer Defensive" },
  { ticker: "BEI.DE", name: "Beiersdorf AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Consumer Defensive" },
  { ticker: "BKA.DE", name: "BrickKings AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Real Estate" },
  { ticker: "BNR.DE", name: "Brenntag SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Basic Materials" },
  { ticker: "COP.DE", name: "Vonovia SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Real Estate" },
  { ticker: "GBF.DE", name: "GFT Technologies SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Technology" },
  { ticker: "GFT.DE", name: "GFT Technologies SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Technology" },
  { ticker: "GXI.DE", name: "GVS SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Healthcare" },
  { ticker: "KCO.DE", name: "thyssenkrupp AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Basic Materials" },
  { ticker: "NDA.DE", name: "Nordex SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Industrials" },
  { ticker: "PBB.DE", name: "Deutsche Pfandbriefbank AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Financial Services" },
  { ticker: "SDF.DE", name: "K+S AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Basic Materials" },
  { ticker: "TKA.DE", name: "thyssenkrupp AG", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Basic Materials" },
  { ticker: "VNA.DE", name: "Vonovia SE", country: "Alemania", countryCode: "DE", exchange: "XETRA", sector: "Real Estate" },
];

// ============================================================
// FRANCE (CAC 40 + other major companies)
// ============================================================
const FRANCE: EuropeanTicker[] = [
  { ticker: "MC.PA", name: "LVMH Moët Hennessy Louis Vuitton SE", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Cyclical" },
  { ticker: "TTE.PA", name: "TotalEnergies SE", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Energy" },
  { ticker: "SAN.PA", name: "Sanofi SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Healthcare" },
  { ticker: "AI.PA", name: "L'Oréal SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Defensive" },
  { ticker: "SU.PA", name: "Schneider Electric SE", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Industrials" },
  { ticker: "EN.PA", name: "Engie SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Utilities" },
  { ticker: "SGO.PA", name: "Saint-Gobain SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Basic Materials" },
  { ticker: "BNP.PA", name: "BNP Paribas SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Financial Services" },
  { ticker: "RMS.PA", name: "Hermès International Société Anonyme", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Cyclical" },
  { ticker: "CA.PA", name: "Carrefour SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Defensive" },
  { ticker: "VIE.PA", name: "Veolia Environnement SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Utilities" },
  { ticker: "MC.PA", name: "LVMH Moët Hennessy Louis Vuitton SE", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Cyclical" },
  { ticker: "AIR.PA", name: "Airbus SE", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Industrials" },
  { ticker: "DSY.PA", name: "Dassault Systèmes SE", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Technology" },
  { ticker: "EDF.PA", name: "Électricité de France SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Utilities" },
  { ticker: "GLE.PA", name: "Société Générale SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Financial Services" },
  { ticker: "ACA.PA", name: "Crédit Agricole SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Financial Services" },
  { ticker: "KER.PA", name: "Kering SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Cyclical" },
  { ticker: "OR.PA", name: "L'Oréal SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Defensive" },
  { ticker: "RI.PA", name: "Pernod Ricard SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Defensive" },
  { ticker: "RNO.PA", name: "Renault SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Cyclical" },
  { ticker: "SAF.PA", name: "Safran SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Industrials" },
  { ticker: "SASY.PA", name: "Danone SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Defensive" },
  { ticker: "STLA.PA", name: "Stellantis NV", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Cyclical" },
  { ticker: "STM.PA", name: "STMicroelectronics NV", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Technology" },
  { ticker: "URW.PA", name: "Unibail-Rodamco-Westfield SE", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Real Estate" },
  { ticker: "VIV.PA", name: "Vivendi SE", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Communication Services" },
  { ticker: "VIV.PA", name: "Vivendi SE", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Communication Services" },
  { ticker: "EL.PA", name: "EssilorLuxottica SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Healthcare" },
  { ticker: "CAP.PA", name: "Capgemini SE", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Technology" },
  { ticker: "CS.PA", name: "AXA SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Financial Services" },
  { ticker: "KER.PA", name: "Kering SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Cyclical" },
  { ticker: "MN.PA", name: "Pernod Ricard SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Defensive" },
  { ticker: "RNL.PA", name: "Rémy Cointreau SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Defensive" },
  { ticker: "RUI.PA", name: "Rubis SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Energy" },
  { ticker: "SMFB.PA", name: "Smile Food Brands SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Consumer Defensive" },
  { ticker: "TCH.PA", name: "Bouygues SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Industrials" },
  { ticker: "UNBP.PA", name: "Alten SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Technology" },
  { ticker: "VK.PA", name: "Vallourec SA", country: "Francia", countryCode: "FR", exchange: "Euronext Paris", sector: "Energy" },
];

// ============================================================
// UNITED KINGDOM (FTSE 100 + other major companies)
// ============================================================
const UK: EuropeanTicker[] = [
  { ticker: "SHEL.L", name: "Shell plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Energy" },
  { ticker: "AZN.L", name: "AstraZeneca PLC", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Healthcare" },
  { ticker: "HSBA.L", name: "HSBC Holdings plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "GSK.L", name: "GSK plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Healthcare" },
  { ticker: "BP.L", name: "BP plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Energy" },
  { ticker: "DGE.L", name: "Diageo plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Consumer Defensive" },
  { ticker: "ULVR.L", name: "Unilever plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Consumer Defensive" },
  { ticker: "BARC.L", name: "Barclays plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "LSEG.L", name: "London Stock Exchange Group plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "NG.L", name: "National Grid plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Utilities" },
  { ticker: "VOD.L", name: "Vodafone Group plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Communication Services" },
  { ticker: "BA.L", name: "BAE Systems plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Industrials" },
  { ticker: "LAND.L", name: "Land Securities Group plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Real Estate" },
  { ticker: "III.L", name: "3i Group plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "ADM.L", name: "Admiral Group plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "AV.L", name: "Aviva plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "BATS.L", name: "British American Tobacco plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Consumer Defensive" },
  { ticker: "BT-A.L", name: "BT Group plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Communication Services" },
  { ticker: "CPG.L", name: "Compass Group plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Consumer Defensive" },
  { ticker: "CRDA.L", name: "Croda International plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Basic Materials" },
  { ticker: "ENT.L", name: "Entain plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Consumer Cyclical" },
  { ticker: "EXPN.L", name: "Experian plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Technology" },
  { ticker: "FCIT.L", name: "F&C Investment Trust plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "GLEN.L", name: "Glencore plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Basic Materials" },
  { ticker: "HIK.L", name: "Hikma Pharmaceuticals PLC", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Healthcare" },
  { ticker: "HLMA.L", name: "Halma plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Technology" },
  { ticker: "ICP.L", name: "Intermediate Capital Group plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "IHG.L", name: "InterContinental Hotels Group plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Consumer Cyclical" },
  { ticker: "INF.L", name: "Informa plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Communication Services" },
  { ticker: "ITRK.L", name: "IntegraFin Holdings plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "JD.L", name: "JD Sports Fashion plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Consumer Cyclical" },
  { ticker: "KGF.L", name: "Kingfisher plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Consumer Cyclical" },
  { ticker: "MNG.L", name: "M&G plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "NWG.L", name: "NatWest Group plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "PHNX.L", name: "Phoenix Group Holdings plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "PRU.L", name: "Prudential plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "PSN.L", name: "Persimmon plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Real Estate" },
  { ticker: "RIO.L", name: "Rio Tinto Group", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Basic Materials" },
  { ticker: "RR.L", name: "Rolls-Royce Holdings plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Industrials" },
  { ticker: "SGE.L", name: "Sage Group plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Technology" },
  { ticker: "SPX.L", name: "Spirax Group plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Industrials" },
  { ticker: "STAN.L", name: "Standard Chartered plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
  { ticker: "SVT.L", name: "Severn Trent plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Utilities" },
  { ticker: "TSCO.L", name: "Tesco plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Consumer Defensive" },
  { ticker: "TW.L", name: "Taylor Wimpey plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Real Estate" },
  { ticker: "WPP.L", name: "WPP plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Communication Services" },
  { ticker: "SCT.L", name: "Schroders plc", country: "Reino Unido", countryCode: "GB", exchange: "LSE", sector: "Financial Services" },
];

// ============================================================
// SPAIN (IBEX 35)
// ============================================================
const SPAIN: EuropeanTicker[] = [
  { ticker: "SAN.MC", name: "Banco Santander SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Financial Services" },
  { ticker: "ITX.MC", name: "Industria de Diseño Textil SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Consumer Cyclical" },
  { ticker: "IBE.MC", name: "Iberdrola SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Utilities" },
  { ticker: "BBVA.MC", name: "Banco Bilbao Vizcaya Argentaria SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Financial Services" },
  { ticker: "TEF.MC", name: "Telefónica SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Communication Services" },
  { ticker: "EMC.MC", name: "Endesa SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Utilities" },
  { ticker: "ENG.MC", name: "Enagás SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Utilities" },
  { ticker: "ERE.MC", name: "Energías Renovables SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Utilities" },
  { ticker: "FDR.MC", name: "Ferrovial SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Industrials" },
  { ticker: "GRF.MC", name: "Grifols SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Healthcare" },
  { ticker: "IAG.MC", name: "International Airlines Group SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Industrials" },
  { ticker: "MAP.MC", name: "Mapfre SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Financial Services" },
  { ticker: "MEL.MC", name: "Melia Hotels International SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Consumer Cyclical" },
  { ticker: "NTGY.MC", name: "Naturgy Energy Group SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Utilities" },
  { ticker: "REP.MC", name: "Repsol SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Energy" },
  { ticker: "SAB.MC", name: "Sabadell SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Financial Services" },
  { ticker: "SANT.MC", name: "Santander SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Financial Services" },
  { ticker: "SLR.MC", name: "Solaria Energia y Medio Ambiente SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Utilities" },
  { ticker: "TKY.MC", name: "Telepizza SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Consumer Cyclical" },
  { ticker: "TRE.MC", name: "Técnicas Reunidas SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Industrials" },
  { ticker: "VIS.MC", name: "Viscofan SA", country: "España", countryCode: "ES", exchange: "BME", sector: "Consumer Defensive" },
];

// ============================================================
// NETHERLANDS (AEX)
// ============================================================
const NETHERLANDS: EuropeanTicker[] = [
  { ticker: "ASML.AS", name: "ASML Holding NV", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Technology" },
  { ticker: "SHEL.AS", name: "Shell plc", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Energy" },
  { ticker: "UNA.AS", name: "Unilever plc", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Consumer Defensive" },
  { ticker: "INGA.AS", name: "ING Groep NV", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Financial Services" },
  { ticker: "PHIA.AS", name: "Koninklijke Philips NV", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Healthcare" },
  { ticker: "AD.AS", name: "Koninklijke Ahold Delhaize NV", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Consumer Defensive" },
  { ticker: "ABI.AS", name: "ABN AMRO Group NV", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Financial Services" },
  { ticker: "AKZA.AS", name: "Akzo Nobel NV", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Basic Materials" },
  { ticker: "DSM.AS", name: "DSM-Firmenich AG", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Basic Materials" },
  { ticker: "KPN.AS", name: "Koninklijke KPN NV", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Communication Services" },
  { ticker: "MT.AS", name: "Mitsubishi UFJ Financial Group Inc", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Financial Services" },
  { ticker: "NN.AS", name: "NN Group NV", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Financial Services" },
  { ticker: "PNL.AS", name: "PostNL NV", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Industrials" },
  { ticker: "PRX.AS", name: "Pearson plc", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Communication Services" },
  { ticker: "RAND.AS", name: "Randstad NV", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Industrials" },
  { ticker: "RDSA.AS", name: "Shell plc", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Energy" },
  { ticker: "URW.AS", name: "Unibail-Rodamco-Westfield SE", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Real Estate" },
  { ticker: "VLK.AS", name: "Volvo AB", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Industrials" },
  { ticker: "WKL.AS", name: "Wolters Kluwer NV", country: "Países Bajos", countryCode: "NL", exchange: "Euronext Amsterdam", sector: "Technology" },
];

// ============================================================
// ITALY (FTSE MIB)
// ============================================================
const ITALY: EuropeanTicker[] = [
  { ticker: "ENI.MI", name: "Eni SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Energy" },
  { ticker: "ENEL.MI", name: "Enel SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Utilities" },
  { ticker: "UCG.MI", name: "Intesa Sanpaolo SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Financial Services" },
  { ticker: "ISP.MI", name: "Intesa Sanpaolo SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Financial Services" },
  { ticker: "TIT.MI", name: "Telecom Italia SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Communication Services" },
  { ticker: "FCA.MI", name: "Stellantis NV", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Consumer Cyclical" },
  { ticker: "LUX.MI", name: "Moncler SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Consumer Cyclical" },
  { ticker: "PRY.MI", name: "Prysmian SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Industrials" },
  { ticker: "TEN.MI", name: "Tenaris SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Energy" },
  { ticker: "SPP.MI", name: "Snam SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Utilities" },
  { ticker: "AZM.MI", name: "Azimut Holding SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Financial Services" },
  { ticker: "BZU.MI", name: "Buzzi Unicem SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Basic Materials" },
  { ticker: "CNHI.MI", name: "CNH Industrial NV", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Industrials" },
  { ticker: "DIA.MI", name: "DiaSorin SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Healthcare" },
  { ticker: "DOGE.MI", name: "DogeGroup SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Technology" },
  { ticker: "EMP.MI", name: "Empire Capital Group", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Financial Services" },
  { ticker: "ERG.MI", name: "ERG SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Utilities" },
  { ticker: "FBK.MI", name: "FinecoBank SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Financial Services" },
  { ticker: "G.MI", name: "Generali SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Financial Services" },
  { ticker: "IG.MI", name: "Italgas SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Utilities" },
  { ticker: "INW.MI", name: "Infrastrutture Wireless Italiane SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Communication Services" },
  { ticker: "IP.MI", name: "Mediaset SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Communication Services" },
  { ticker: "LR.MI", name: "Leonardo SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Industrials" },
  { ticker: "MB.MI", name: "Mediobanca SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Financial Services" },
  { ticker: "MONC.MI", name: "Moncler SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Consumer Cyclical" },
  { ticker: "NEXI.MI", name: "Nexi SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Technology" },
  { ticker: "PFC.MI", name: "Pirelli & C. SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Consumer Cyclical" },
  { ticker: "PRG.MI", name: "PRADA SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Consumer Cyclical" },
  { ticker: "PST.MI", name: "Poste Italiane SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Industrials" },
  { ticker: "SAL.MI", name: "Salvatore Ferragamo SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Consumer Cyclical" },
  { ticker: "SRG.MI", name: "Sorgenia SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Utilities" },
  { ticker: "TOD.MI", name: "Tod's SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Consumer Cyclical" },
  { ticker: "TPE.MI", name: "Terna SpA", country: "Italia", countryCode: "IT", exchange: "Borsa Italiana", sector: "Utilities" },
];

// ============================================================
// SWITZERLAND (SMI)
// ============================================================
const SWITZERLAND: EuropeanTicker[] = [
  { ticker: "NESN.SW", name: "Nestlé SA", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Consumer Defensive" },
  { ticker: "ROG.SW", name: "Roche Holding AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Healthcare" },
  { ticker: "NOVN.SW", name: "Novartis AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Healthcare" },
  { ticker: "UBSG.SW", name: "UBS Group AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Financial Services" },
  { ticker: "CSGN.SW", name: "UBS Group AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Financial Services" },
  { ticker: "AZN.SW", name: "AstraZeneca PLC", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Healthcare" },
  { ticker: "ABBN.SW", name: "ABB Ltd", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Industrials" },
  { ticker: "SREN.SW", name: "Swiss Re AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Financial Services" },
  { ticker: "ZUR.SW", name: "Zurich Insurance Group AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Financial Services" },
  { ticker: "SIKA.SW", name: "Sika AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Basic Materials" },
  { ticker: "ADEN.SW", name: "Adecco Group AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Industrials" },
  { ticker: "LISN.SW", name: "Nestlé SA", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Consumer Defensive" },
  { ticker: "CLN.SW", name: "Clariant AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Basic Materials" },
  { ticker: "CFR.SW", name: "Richemont SA", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Consumer Cyclical" },
  { ticker: "GIVN.SW", name: "Givaudan SA", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Basic Materials" },
  { ticker: "GEBN.SW", name: "Gebberit AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Industrials" },
  { ticker: "KNIN.SW", name: "Kuehne + Nagel International AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Industrials" },
  { ticker: "LOGN.SW", name: "Logitech International SA", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Technology" },
  { ticker: "SLH.SW", name: "Sonova Holding AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Healthcare" },
  { ticker: "SCMN.SW", name: "Swisscom AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Communication Services" },
  { ticker: "TCMN.SW", name: "Swisscom AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Communication Services" },
  { ticker: "TLN.SW", name: "Temenos AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Technology" },
  { ticker: "VAT.SW", name: "VAT Group AG", country: "Suiza", countryCode: "CH", exchange: "SIX Swiss Exchange", sector: "Technology" },
];

// ============================================================
// BELGIUM
// ============================================================
const BELGIUM: EuropeanTicker[] = [
  { ticker: "ABI.BR", name: "Anheuser-Busch InBev SA/NV", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Consumer Defensive" },
  { ticker: "ELI.BR", name: "Eli Lilly and Company", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Healthcare" },
  { ticker: "KBC.BR", name: "KBC Group NV", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Financial Services" },
  { ticker: "SOL.BR", name: "Solvay SA", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Basic Materials" },
  { ticker: "TNET.BR", name: "Telenet Group Holding NV", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Communication Services" },
  { ticker: "UCB.BR", name: "UCB SA", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Healthcare" },
  { ticker: "INTB.BR", name: "Interpump Group SpA", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Industrials" },
  { ticker: "ACKB.BR", name: "Ackermans & van Haaren NV", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Financial Services" },
  { ticker: "COFB.BR", name: "Cofinimmo SA", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Real Estate" },
  { ticker: "DIE.BR", name: "D'Ieteren Group SA", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Consumer Cyclical" },
  { ticker: "GALAP.BR", name: "Galapagos NV", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Healthcare" },
  { ticker: "GBLB.BR", name: "Groupe Bruxelles Lambert SA", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Financial Services" },
  { ticker: "PROX.BR", name: "Proximus SA", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Communication Services" },
  { ticker: "UMP.BR", name: "Umicore SA", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Basic Materials" },
  { ticker: "WIT.BR", name: "Witteveen+Bos", country: "Bélgica", countryCode: "BE", exchange: "Euronext Brussels", sector: "Industrials" },
];

// ============================================================
// AUSTRIA
// ============================================================
const AUSTRIA: EuropeanTicker[] = [
  { ticker: "VOE.VI", name: "Voestalpine AG", country: "Austria", countryCode: "AT", exchange: "Wiener Börse", sector: "Basic Materials" },
  { ticker: "RBI.VI", name: "Raiffeisen Bank International AG", country: "Austria", countryCode: "AT", exchange: "Wiener Börse", sector: "Financial Services" },
  { ticker: "EBS.VI", name: "Erste Group Bank AG", country: "Austria", countryCode: "AT", exchange: "Wiener Börse", sector: "Financial Services" },
  { ticker: "WIE.VI", name: "Wienerberger AG", country: "Austria", countryCode: "AT", exchange: "Wiener Börse", sector: "Basic Materials" },
  { ticker: "SBO.VI", name: "Strabag SE", country: "Austria", countryCode: "AT", exchange: "Wiener Börse", sector: "Industrials" },
  { ticker: "ATX.VI", name: "AT&S Austria Technologie & Systemtechnik AG", country: "Austria", countryCode: "AT", exchange: "Wiener Börse", sector: "Technology" },
  { ticker: "CAI.VI", name: "CA Immobilien Anlagen AG", country: "Austria", countryCode: "AT", exchange: "Wiener Börse", sector: "Real Estate" },
  { ticker: "COLT.VI", name: "Conelco", country: "Austria", countryCode: "AT", exchange: "Wiener Börse", sector: "Industrials" },
  { ticker: "IFX.VI", name: "Infineon Technologies AG", country: "Austria", countryCode: "AT", exchange: "Wiener Börse", sector: "Technology" },
  { ticker: "JFR.VI", name: "Julius Baer Group Ltd", country: "Austria", countryCode: "AT", exchange: "Wiener Börse", sector: "Financial Services" },
];

// ============================================================
// SWEDEN
// ============================================================
const SWEDEN: EuropeanTicker[] = [
  { ticker: "ABB.ST", name: "ABB Ltd", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Industrials" },
  { ticker: "ERIC-B.ST", name: "Telefonaktiebolaget LM Ericsson", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Technology" },
  { ticker: "ATCO-A.ST", name: "Atlas Copco AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Industrials" },
  { ticker: "SHB-A.ST", name: "Skandinaviska Enskilda Banken AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Financial Services" },
  { ticker: "SWED-A.ST", name: "Swedbank AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Financial Services" },
  { ticker: "HM-B.ST", name: "H & M Hennes & Mauritz AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Consumer Cyclical" },
  { ticker: "INVE-B.ST", name: "Investment AB Latour", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Industrials" },
  { ticker: "EQT.ST", name: "EQT AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Financial Services" },
  { ticker: "ASSA-B.ST", name: "Assa Abloy AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Industrials" },
  { ticker: "BOL.ST", name: "Boliden AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Basic Materials" },
  { ticker: "HEXA-B.ST", name: "Hexagon AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Technology" },
  { ticker: "KINV-A.ST", name: "Investor AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Financial Services" },
  { ticker: "NDA-SE.ST", name: "Nordea Bank Abp", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Financial Services" },
  { ticker: "SAND.ST", name: "Sandvik AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Industrials" },
  { ticker: "SEB-A.ST", name: "Skandinaviska Enskilda Banken AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Financial Services" },
  { ticker: "SKF-B.ST", name: "SKF AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Industrials" },
  { ticker: "SSAB-A.ST", name: "SSAB AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Basic Materials" },
  { ticker: "TELIA.ST", name: "Telia Company AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Communication Services" },
  { ticker: "VOLV-B.ST", name: "Volvo AB", country: "Suecia", countryCode: "SE", exchange: "Nasdaq Stockholm", sector: "Industrials" },
];

// ============================================================
// NORWAY
// ============================================================
const NORWAY: EuropeanTicker[] = [
  { ticker: "SHEL.OL", name: "Shell plc", country: "Noruega", countryCode: "NO", exchange: "Oslo Børs", sector: "Energy" },
  { ticker: "DNB.OL", name: "DNB Bank ASA", country: "Noruega", countryCode: "NO", exchange: "Oslo Børs", sector: "Financial Services" },
  { ticker: "MOWI.OL", name: "Mowi ASA", country: "Noruega", countryCode: "NO", exchange: "Oslo Børs", sector: "Consumer Defensive" },
  { ticker: "YAR.OL", name: "Yara International ASA", country: "Noruega", countryCode: "NO", exchange: "Oslo Børs", sector: "Basic Materials" },
  { ticker: "TGS.OL", name: "TGS-NOPEC Geophysical Company ASA", country: "Noruega", countryCode: "NO", exchange: "Oslo Børs", sector: "Energy" },
  { ticker: "EQNR.OL", name: "Equinor ASA", country: "Noruega", countryCode: "NO", exchange: "Oslo Børs", sector: "Energy" },
  { ticker: "SALM.OL", name: "SalMar ASA", country: "Noruega", countryCode: "NO", exchange: "Oslo Børs", sector: "Consumer Defensive" },
  { ticker: "TALK.OL", name: "Telenor ASA", country: "Noruega", countryCode: "NO", exchange: "Oslo Børs", sector: "Communication Services" },
  { ticker: "ORK.OL", name: "Orkla ASA", country: "Noruega", countryCode: "NO", exchange: "Oslo Børs", sector: "Consumer Defensive" },
  { ticker: "STL.OL", name: "Steel Authority of India Limited", country: "Noruega", countryCode: "NO", exchange: "Oslo Børs", sector: "Basic Materials" },
];

// ============================================================
// DENMARK
// ============================================================
const DENMARK: EuropeanTicker[] = [
  { ticker: "NOVO-B.CO", name: "Novo Nordisk A/S", country: "Dinamarca", countryCode: "DK", exchange: "Nasdaq Copenhagen", sector: "Healthcare" },
  { ticker: "MAERSK-B.CO", name: "A.P. Møller - Mærsk A/S", country: "Dinamarca", countryCode: "DK", exchange: "Nasdaq Copenhagen", sector: "Industrials" },
  { ticker: "DSV.CO", name: "DSV A/S", country: "Dinamarca", countryCode: "DK", exchange: "Nasdaq Copenhagen", sector: "Industrials" },
  { ticker: "VWS.CO", name: "Vestas Wind Systems A/S", country: "Dinamarca", countryCode: "DK", exchange: "Nasdaq Copenhagen", sector: "Industrials" },
  { ticker: "ORSTED.CO", name: "Ørsted A/S", country: "Dinamarca", countryCode: "DK", exchange: "Nasdaq Copenhagen", sector: "Utilities" },
  { ticker: "CARL-B.CO", name: "Carlsberg A/S", country: "Dinamarca", countryCode: "DK", exchange: "Nasdaq Copenhagen", sector: "Consumer Defensive" },
  { ticker: "PNDORA.CO", name: "Pandora A/S", country: "Dinamarca", countryCode: "DK", exchange: "Nasdaq Copenhagen", sector: "Consumer Cyclical" },
  { ticker: "GN.CO", name: "GN Store Nord A/S", country: "Dinamarca", countryCode: "DK", exchange: "Nasdaq Copenhagen", sector: "Technology" },
  { ticker: "ISS.CO", name: "ISS A/S", country: "Dinamarca", countryCode: "DK", exchange: "Nasdaq Copenhagen", sector: "Industrials" },
  { ticker: "COL.CO", name: "Coloplast A/S", country: "Dinamarca", countryCode: "DK", exchange: "Nasdaq Copenhagen", sector: "Healthcare" },
];

// ============================================================
// FINLAND
// ============================================================
const FINLAND: EuropeanTicker[] = [
  { ticker: "NESTE.HE", name: "Neste Oyj", country: "Finlandia", countryCode: "FI", exchange: "Nasdaq Helsinki", sector: "Energy" },
  { ticker: "NOKIA.HE", name: "Nokia Oyj", country: "Finlandia", countryCode: "FI", exchange: "Nasdaq Helsinki", sector: "Technology" },
  { ticker: "KNEBV.HE", name: "KONE Oyj", country: "Finlandia", countryCode: "FI", exchange: "Nasdaq Helsinki", sector: "Industrials" },
  { ticker: "UPM.HE", name: "UPM-Kymmene Oyj", country: "Finlandia", countryCode: "FI", exchange: "Nasdaq Helsinki", sector: "Basic Materials" },
  { ticker: "SSAB.HE", name: "SSAB AB", country: "Finlandia", countryCode: "FI", exchange: "Nasdaq Helsinki", sector: "Basic Materials" },
  { ticker: "FORTUM.HE", name: "Fortum Oyj", country: "Finlandia", countryCode: "FI", exchange: "Nasdaq Helsinki", sector: "Utilities" },
  { ticker: "Sampo.HE", name: "Sampo Oyj", country: "Finlandia", countryCode: "FI", exchange: "Nasdaq Helsinki", sector: "Financial Services" },
  { ticker: "WRT1V.HE", name: "Wärtsilä Oyj Abp", country: "Finlandia", countryCode: "FI", exchange: "Nasdaq Helsinki", sector: "Industrials" },
  { ticker: "ELISA.HE", name: "Elisa Oyj", country: "Finlandia", countryCode: "FI", exchange: "Nasdaq Helsinki", sector: "Communication Services" },
  { ticker: "TYRES.HE", name: "Nokian Renkaat Oyj", country: "Finlandia", countryCode: "FI", exchange: "Nasdaq Helsinki", sector: "Consumer Cyclical" },
];

// ============================================================
// PORTUGAL
// ============================================================
const PORTUGAL: EuropeanTicker[] = [
  { ticker: "GALP.LS", name: "Galp Energia SGPS SA", country: "Portugal", countryCode: "PT", exchange: "Euronext Lisbon", sector: "Energy" },
  { ticker: "EDP.LS", name: "Energias de Portugal SA", country: "Portugal", countryCode: "PT", exchange: "Euronext Lisbon", sector: "Utilities" },
  { ticker: "JMT.LS", name: "Jerónimo Martins SGPS SA", country: "Portugal", countryCode: "PT", exchange: "Euronext Lisbon", sector: "Consumer Defensive" },
  { ticker: "NOS.LS", name: "NOS SGPS SA", country: "Portugal", countryCode: "PT", exchange: "Euronext Lisbon", sector: "Communication Services" },
  { ticker: "REN.LS", name: "Redes Energéticas Nacionais SGPS SA", country: "Portugal", countryCode: "PT", exchange: "Euronext Lisbon", sector: "Utilities" },
  { ticker: "SON.LS", name: "Sonae SGPS SA", country: "Portugal", countryCode: "PT", exchange: "Euronext Lisbon", sector: "Consumer Cyclical" },
];

// ============================================================
// IRELAND
// ============================================================
const IRELAND: EuropeanTicker[] = [
  { ticker: "CRH.IR", name: "CRH plc", country: "Irlanda", countryCode: "IE", exchange: "Euronext Dublin", sector: "Basic Materials" },
  { ticker: "KRX.IR", name: "Kerry Group plc", country: "Irlanda", countryCode: "IE", exchange: "Euronext Dublin", sector: "Consumer Defensive" },
  { ticker: "SMDS.IR", name: "Smurfit Kappa Group plc", country: "Irlanda", countryCode: "IE", exchange: "Euronext Dublin", sector: "Basic Materials" },
  { ticker: "RYA.IR", name: "Ryanair Holdings plc", country: "Irlanda", countryCode: "IE", exchange: "Euronext Dublin", sector: "Industrials" },
  { ticker: "GAWN.IR", name: "Greencore Group plc", country: "Irlanda", countryCode: "IE", exchange: "Euronext Dublin", sector: "Consumer Defensive" },
];

// ============================================================
// LUXEMBOURG
// ============================================================
const LUXEMBOURG: EuropeanTicker[] = [
  { ticker: "STEEL.AS", name: "ArcelorMittal SA", country: "Luxemburgo", countryCode: "LU", exchange: "Luxembourg Stock Exchange", sector: "Basic Materials" },
  { ticker: "ENGI.PA", name: "Engie SA", country: "Luxemburgo", countryCode: "LU", exchange: "Luxembourg Stock Exchange", sector: "Utilities" },
  { ticker: "TKA.DE", name: "thyssenkrupp AG", country: "Luxemburgo", countryCode: "LU", exchange: "Luxembourg Stock Exchange", sector: "Basic Materials" },
];

// ============================================================
// Export all tickers
// ============================================================
export const STOXX600_TICKERS: EuropeanTicker[] = [
  ...GERMANY,
  ...FRANCE,
  ...UK,
  ...SPAIN,
  ...NETHERLANDS,
  ...ITALY,
  ...SWITZERLAND,
  ...BELGIUM,
  ...AUSTRIA,
  ...SWEDEN,
  ...NORWAY,
  ...DENMARK,
  ...FINLAND,
  ...PORTUGAL,
  ...IRELAND,
  ...LUXEMBOURG,
];

// Unique tickers only (some appear in multiple lists)
export const STOXX600_UNIQUE_TICKERS = [...new Map(STOXX600_TICKERS.map(t => [t.ticker, t])).values()];

// Country summary
export const STOXX600_COUNTRIES = [
  { code: "DE", name: "Alemania", flag: "🇩🇪", count: GERMANY.length },
  { code: "FR", name: "Francia", flag: "🇫🇷", count: FRANCE.length },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧", count: UK.length },
  { code: "ES", name: "España", flag: "🇪🇸", count: SPAIN.length },
  { code: "NL", name: "Países Bajos", flag: "🇳🇱", count: NETHERLANDS.length },
  { code: "IT", name: "Italia", flag: "🇮🇹", count: ITALY.length },
  { code: "CH", name: "Suiza", flag: "🇨🇭", count: SWITZERLAND.length },
  { code: "BE", name: "Bélgica", flag: "🇧🇪", count: BELGIUM.length },
  { code: "AT", name: "Austria", flag: "🇦🇹", count: AUSTRIA.length },
  { code: "SE", name: "Suecia", flag: "🇸🇪", count: SWEDEN.length },
  { code: "NO", name: "Noruega", flag: "🇳🇴", count: NORWAY.length },
  { code: "DK", name: "Dinamarca", flag: "🇩🇰", count: DENMARK.length },
  { code: "FI", name: "Finlandia", flag: "🇫🇮", count: FINLAND.length },
  { code: "PT", name: "Portugal", flag: "🇵🇹", count: PORTUGAL.length },
  { code: "IE", name: "Irlanda", flag: "🇮🇪", count: IRELAND.length },
  { code: "LU", name: "Luxemburgo", flag: "🇱🇺", count: LUXEMBOURG.length },
];
