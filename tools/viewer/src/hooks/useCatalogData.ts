import { useMemo } from 'react';
import type { PacpDocument, Ruleset, Table } from '@/lib/pacp-types';

export function useCatalogData(
  catalogDoc: PacpDocument | null,
  productDocs: PacpDocument[]
): { rulesets: Ruleset[]; tables: Table[] } {
  return useMemo(() => {
    const rulesets: Ruleset[] = [];
    const tables: Table[] = [];

    if (catalogDoc?.document_type === 'CATALOG' && catalogDoc.rulesets) {
      rulesets.push(...catalogDoc.rulesets);
    }
    if (catalogDoc?.document_type === 'CATALOG' && catalogDoc.tables) {
      tables.push(...catalogDoc.tables);
    }

    for (const doc of productDocs) {
      if (doc.document_type === 'PRODUCT' && doc.rulesets) {
        for (const rs of doc.rulesets) {
          if (!rulesets.some((r) => r.id === rs.id)) rulesets.push(rs);
        }
      }
      if (doc.document_type === 'PRODUCT' && doc.tables) {
        for (const t of doc.tables) {
          if (!tables.some((x) => x.id === t.id)) tables.push(t);
        }
      }
    }

    return { rulesets, tables };
  }, [catalogDoc, productDocs]);
}
