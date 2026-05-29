import { getTableColumns, sql } from "drizzle-orm";
import {
  type PgTable,
  type PgUpdateSetSource,
  getTableConfig,
} from "drizzle-orm/pg-core";

/**
 * Drizzle helper for `INSERT … ON CONFLICT DO UPDATE` clauses: produces a
 * `SET col = COALESCE(excluded.col, table.col)` row for every non-default,
 * non-`id` column on the table. Used by upserts that want to keep existing
 * values when the incoming row leaves them null.
 */
export function conflictUpdateSetAllColumns<TTable extends PgTable>(
  table: TTable,
): PgUpdateSetSource<TTable> {
  const columns = getTableColumns(table);
  const { name: tableName } = getTableConfig(table);
  const conflictUpdateSet = Object.entries(columns).reduce(
    (acc, [columnName, columnInfo]) => {
      if (!columnInfo.default && columnInfo.name !== "id") {
        // @ts-ignore
        acc[columnName] = sql.raw(
          `COALESCE(excluded."${columnInfo.name}", ${tableName}."${columnInfo.name}")`,
        );
      }
      return acc;
    },
    {},
  ) as PgUpdateSetSource<TTable>;
  return conflictUpdateSet;
}
