export enum DataCategory {
  INCOME_STATEMENT = 'income_statement',
  BALANCE_SHEET = 'balance_sheet',
  CASH_FLOW = 'cash_flow',
  MARKET_DATA = 'market_data',
  RATIO = 'ratio',
  SEGMENT = 'segment',
  DIVIDEND = 'dividend',
  NEWS = 'news',
  INSIDER_TRADE = 'insider_trade',
  ANALYST_ESTIMATE = 'analyst_estimate',
  ECONOMIC_INDICATOR = 'economic_indicator',
}

export enum DataSource {
  SEC = 'sec',
  YAHOO = 'yahoo',
  MANUAL = 'manual',
}

export enum ValidationStatus {
  PENDING = 'pending',
  VALID = 'valid',
  INVALID = 'invalid',
  REVIEW = 'review',
}

export enum PeriodType {
  ANNUAL = 'annual',
  QUARTERLY = 'quarterly',
  TTM = 'ttm',
  DAILY = 'daily',
  SNAPSHOT = 'snapshot',
}

export enum ValueType {
  NUMBER = 'number',
  STRING = 'string',
  BOOLEAN = 'boolean',
  DATE = 'date',
  JSON = 'json',
}

export enum ImportJobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum ImportJobType {
  FULL_SYNC = 'full_sync',
  SINGLE_PROVIDER = 'single_provider',
  PRICE_ONLY = 'price_only',
  FINANCIAL_ONLY = 'financial_only',
}
