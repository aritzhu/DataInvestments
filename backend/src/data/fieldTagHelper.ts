import prisma from '../infrastructure/prisma/client';
import { FIELD_MAPPING_CATALOG } from './fieldMappingCatalog';

export type SourceKey = 'sec' | 'european' | 'yahoo';

export const SOURCE_KEYS: SourceKey[] = ['sec', 'european', 'yahoo'];

export interface FieldSourceTags {
  baseTags: string[];
  customTags: string[];
  active: boolean;
}

export type FieldTagsMap = Map<string, Record<SourceKey, FieldSourceTags>>;

export async function buildFieldTagsMap(): Promise<FieldTagsMap> {
  const dbConfigs = await prisma.fieldConfig.findMany();
  const configMap = new Map<string, { customTags: string[]; active: boolean }>();
  for (const c of dbConfigs) {
    configMap.set(`${c.fieldName}:${c.source}`, { customTags: c.customTags, active: c.active });
  }

  const map: FieldTagsMap = new Map();
  for (const entry of FIELD_MAPPING_CATALOG) {
    const sources = {} as Record<SourceKey, FieldSourceTags>;
    for (const src of SOURCE_KEYS) {
      const dbConfig = configMap.get(`${entry.fieldName}:${src}`);
      sources[src] = {
        baseTags: entry.sources[src] || [],
        customTags: dbConfig?.customTags || [],
        active: dbConfig?.active ?? true,
      };
    }
    map.set(entry.fieldName, sources);
  }
  return map;
}
