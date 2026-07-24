import { DataCategory, DataSource, ValidationStatus, PeriodType, ValueType } from '../enums';

export interface NormalizedData {
  category: DataCategory;
  field: string;
  value: number | string | boolean | null;
  valueType: ValueType;
  periodType: PeriodType;
  year?: number;
  quarter?: number;
  date?: Date;
  source: DataSource;
  sourceRef?: string;
  confidence?: number;
}

export interface CompanyRecord {
  id: string;
  ticker: string;
  name: string;
  sector?: string | null;
  industry?: string | null;
  description?: string | null;
  cik?: string | null;
  ceo?: string | null;
  employees?: number | null;
  country?: string | null;
  exchange?: string | null;
  currency?: string | null;
  market?: string | null;
  website?: string | null;
  ipoDate?: string | null;
  figi?: string | null;
  isin?: string | null;
  cusip?: string | null;
  lei?: string | null;
}

export interface RawDataResponse {
  source: DataSource;
  endpoint: string;
  requestParams?: Record<string, unknown>;
  response: unknown;
  statusCode?: number;
  fetchedAt: Date;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface ImportJobLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: unknown;
}

export interface CoverageResult {
  category: DataCategory;
  coveragePct: number;
  fieldCount: number;
  totalExpected: number;
}
