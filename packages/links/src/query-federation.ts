import { sql } from "drizzle-orm";
import { db } from "@sill/schema";
import { getDuckDBService } from "./duckdb.js";

// ============================================================================
// SQL Dialect Abstraction Layer
// ============================================================================

export abstract class SQLDialect {
  abstract caseInsensitiveLike(field: string, pattern: string): string;
  abstract jsonArrayContains(field: string, value: string): string;
  abstract regexMatch(field: string, pattern: string): string;
  abstract currentTimestamp(): string;
  abstract intervalSubtract(interval: string): string;
  abstract coalesce(field1: string, field2: string): string;
  abstract cast(expression: string, type: string): string;
  abstract greatest(...expressions: string[]): string;
  abstract least(...expressions: string[]): string;
  abstract substring(field: string, pattern: string): string;
}

export class PostgreSQLDialect extends SQLDialect {
  caseInsensitiveLike(field: string, pattern: string): string {
    return `${field} ILIKE ${pattern}`;
  }

  jsonArrayContains(field: string, value: string): string {
    return `${field}::text ILIKE '%${value}%'`;
  }

  regexMatch(field: string, pattern: string): string {
    return `${field} ~ ${pattern}`;
  }

  currentTimestamp(): string {
    return "CURRENT_TIMESTAMP";
  }

  intervalSubtract(interval: string): string {
    return `now() - interval '${interval}'`;
  }

  coalesce(field1: string, field2: string): string {
    return `COALESCE(${field1}, ${field2})`;
  }

  cast(expression: string, type: string): string {
    return `CAST(${expression} AS ${type})`;
  }

  greatest(...expressions: string[]): string {
    return `GREATEST(${expressions.join(", ")})`;
  }

  least(...expressions: string[]): string {
    return `LEAST(${expressions.join(", ")})`;
  }

  substring(field: string, pattern: string): string {
    return `substring(${field} from ${pattern})`;
  }
}

export class DuckDBDialect extends SQLDialect {
  caseInsensitiveLike(field: string, pattern: string): string {
    return `UPPER(${field}) LIKE UPPER(${pattern})`;
  }

  jsonArrayContains(field: string, value: string): string {
    return `list_contains(${field}, '${value}')`;
  }

  regexMatch(field: string, pattern: string): string {
    return `regexp_matches(${field}, ${pattern})`;
  }

  currentTimestamp(): string {
    return "current_timestamp";
  }

  intervalSubtract(interval: string): string {
    return `current_timestamp - INTERVAL '${interval}'`;
  }

  coalesce(field1: string, field2: string): string {
    return `COALESCE(${field1}, ${field2})`;
  }

  cast(expression: string, type: string): string {
    return `CAST(${expression} AS ${type})`;
  }

  greatest(...expressions: string[]): string {
    return `GREATEST(${expressions.join(", ")})`;
  }

  least(...expressions: string[]): string {
    return `LEAST(${expressions.join(", ")})`;
  }

  substring(field: string, pattern: string): string {
    return `regexp_extract(${field}, ${pattern})`;
  }
}

// ============================================================================
// Query Builder Types and Interfaces
// ============================================================================

export type FieldType = "string" | "number" | "date" | "boolean" | "json";

export interface WhereCondition {
  field: string;
  operator:
    | "eq"
    | "ne"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "like"
    | "ilike"
    | "notLike"
    | "notIlike"
    | "in"
    | "notIn"
    | "isNull"
    | "isNotNull";
  value?: unknown;
  fieldType?: FieldType;
}

export interface OrderField {
  field: string;
  direction: "asc" | "desc";
  nulls?: "first" | "last";
}

export interface JoinClause {
  type: "inner" | "left" | "right" | "full";
  table: string;
  on: string;
  alias?: string;
}

export interface QueryBuilder {
  select(fields: string[] | Record<string, string>): QueryBuilder;
  from(table: string, alias?: string): QueryBuilder;
  join(join: JoinClause): QueryBuilder;
  where(conditions: WhereCondition[]): QueryBuilder;
  groupBy(fields: string[]): QueryBuilder;
  having(condition: string): QueryBuilder;
  orderBy(fields: OrderField[]): QueryBuilder;
  limit(count: number): QueryBuilder;
  offset(count: number): QueryBuilder;

  toPostgresSQL(): string;
  toDuckDBSQL(): string;
  getParameters(): Record<string, unknown>;
}

// ============================================================================
// Concrete Query Builder Implementation
// ============================================================================

export class FederatedQueryBuilder implements QueryBuilder {
  private selectFields: string[] | Record<string, string> = ["*"];
  private fromTable = "";
  private fromAlias?: string;
  private joinClauses: JoinClause[] = [];
  private whereConditions: WhereCondition[] = [];
  private groupByFields: string[] = [];
  private havingCondition = "";
  private orderByFields: OrderField[] = [];
  private limitCount?: number;
  private offsetCount?: number;
  private parameters: Record<string, unknown> = {};

  private pgDialect = new PostgreSQLDialect();
  private duckDialect = new DuckDBDialect();

  select(fields: string[] | Record<string, string>): QueryBuilder {
    this.selectFields = fields;
    return this;
  }

  from(table: string, alias?: string): QueryBuilder {
    this.fromTable = table;
    this.fromAlias = alias;
    return this;
  }

  join(join: JoinClause): QueryBuilder {
    this.joinClauses.push(join);
    return this;
  }

  where(conditions: WhereCondition[]): QueryBuilder {
    this.whereConditions = conditions;
    return this;
  }

  groupBy(fields: string[]): QueryBuilder {
    this.groupByFields = fields;
    return this;
  }

  having(condition: string): QueryBuilder {
    this.havingCondition = condition;
    return this;
  }

  orderBy(fields: OrderField[]): QueryBuilder {
    this.orderByFields = fields;
    return this;
  }

  limit(count: number): QueryBuilder {
    this.limitCount = count;
    return this;
  }

  offset(count: number): QueryBuilder {
    this.offsetCount = count;
    return this;
  }

  getParameters(): Record<string, unknown> {
    return this.parameters;
  }

  private buildSelect(fields: string[] | Record<string, string>): string {
    if (Array.isArray(fields)) {
      return fields.join(", ");
    }
    return Object.entries(fields)
      .map(([alias, field]) => {
        // Handle wildcard selections without alias
        if (field.endsWith(".*")) {
          return field;
        }
        // Regular field with alias
        return `${field} AS ${alias}`;
      })
      .join(", ");
  }

  private buildFrom(): string {
    return this.fromAlias
      ? `${this.fromTable} AS ${this.fromAlias}`
      : this.fromTable;
  }

  private buildJoins(): string {
    return this.joinClauses
      .map((join) => {
        const joinType = join.type.toUpperCase();
        const table = join.alias
          ? `${join.table} AS ${join.alias}`
          : join.table;
        return `${joinType} JOIN ${table} ON ${join.on}`;
      })
      .join(" ");
  }

  private buildWhere(dialect: SQLDialect): string {
    if (this.whereConditions.length === 0) return "";

    const parameterValues: unknown[] = [];
    const conditions = this.whereConditions.map((condition, index) => {
      const paramIndex = index + 1;

      switch (condition.operator) {
        case "eq":
          parameterValues.push(condition.value);
          return `${condition.field} = $${paramIndex}`;
        case "ne":
          parameterValues.push(condition.value);
          return `${condition.field} != $${paramIndex}`;
        case "gt":
          parameterValues.push(condition.value);
          return `${condition.field} > $${paramIndex}`;
        case "gte":
          parameterValues.push(condition.value);
          return `${condition.field} >= $${paramIndex}`;
        case "lt":
          parameterValues.push(condition.value);
          return `${condition.field} < $${paramIndex}`;
        case "lte":
          parameterValues.push(condition.value);
          return `${condition.field} <= $${paramIndex}`;
        case "like":
          parameterValues.push(condition.value);
          return `${condition.field} LIKE $${paramIndex}`;
        case "ilike":
          parameterValues.push(condition.value);
          return dialect.caseInsensitiveLike(condition.field, `$${paramIndex}`);
        case "notLike":
          parameterValues.push(condition.value);
          return `${condition.field} NOT LIKE $${paramIndex}`;
        case "notIlike":
          parameterValues.push(condition.value);
          return `NOT ${dialect.caseInsensitiveLike(condition.field, `$${paramIndex}`)}`;
        case "isNull":
          return `${condition.field} IS NULL`;
        case "isNotNull":
          return `${condition.field} IS NOT NULL`;
        case "in":
          parameterValues.push(condition.value);
          return `${condition.field} IN ($${paramIndex})`;
        case "notIn":
          parameterValues.push(condition.value);
          return `${condition.field} NOT IN ($${paramIndex})`;
        default:
          throw new Error(`Unsupported operator: ${condition.operator}`);
      }
    });

    // Store parameter values in order for getParameters() method
    this.parameters = parameterValues.reduce<Record<string, unknown>>(
      (acc, value, index) => {
        acc[`param_${index}`] = value;
        return acc;
      },
      {}
    );

    return `WHERE ${conditions.join(" AND ")}`;
  }

  private buildGroupBy(): string {
    return this.groupByFields.length > 0
      ? `GROUP BY ${this.groupByFields.join(", ")}`
      : "";
  }

  private buildHaving(): string {
    return this.havingCondition ? `HAVING ${this.havingCondition}` : "";
  }

  private buildOrderBy(): string {
    if (this.orderByFields.length === 0) return "";

    const orderFields = this.orderByFields.map((field) => {
      let orderStr = `${field.field} ${field.direction.toUpperCase()}`;
      if (field.nulls) {
        orderStr += ` NULLS ${field.nulls.toUpperCase()}`;
      }
      return orderStr;
    });

    return `ORDER BY ${orderFields.join(", ")}`;
  }

  private buildLimitOffset(): string {
    let result = "";
    if (this.limitCount !== undefined) {
      result += ` LIMIT ${this.limitCount}`;
    }
    if (this.offsetCount !== undefined) {
      result += ` OFFSET ${this.offsetCount}`;
    }
    return result;
  }

  private buildSQL(dialect: SQLDialect): string {
    const parts = [
      `SELECT ${this.buildSelect(this.selectFields)}`,
      `FROM ${this.buildFrom()}`,
      this.buildJoins(),
      this.buildWhere(dialect),
      this.buildGroupBy(),
      this.buildHaving(),
      this.buildOrderBy(),
      this.buildLimitOffset(),
    ].filter((part) => part.trim() !== "");

    return parts.join(" ");
  }

  toPostgresSQL(): string {
    return this.buildSQL(this.pgDialect);
  }

  toDuckDBSQL(): string {
    return this.buildSQL(this.duckDialect);
  }
}

// ============================================================================
// Data Source Router
// ============================================================================

export type DataSource = "postgres" | "duckdb" | "both";

export interface DataSourceStrategy {
  determineDataSource(queryContext: QueryContext): DataSource;
}

export interface QueryContext {
  dateRange?: {
    start: Date;
    end: Date;
  };
  tableName: string;
  userId?: string;
}

export class TimeBasedDataSourceStrategy implements DataSourceStrategy {
  determineDataSource(context: QueryContext): DataSource {
    // If no date range specified, use postgres for safety
    if (!context.dateRange) {
      return "postgres";
    }

    const now = new Date();
    const daysSinceStart =
      (now.getTime() - context.dateRange.start.getTime()) /
      (24 * 60 * 60 * 1000);

    // Recent data (< 48 hours): use PostgreSQL
    if (daysSinceStart <= 2) {
      return "postgres";
    }

    // Historical data (> 48 hours): use DuckDB if available
    if (daysSinceStart > 2) {
      return "duckdb";
    }

    // Queries spanning both recent and historical: use both
    const daysSinceEnd =
      (now.getTime() - context.dateRange.end.getTime()) / (24 * 60 * 60 * 1000);
    if (daysSinceEnd <= 2 && daysSinceStart > 2) {
      return "both";
    }

    return "postgres";
  }
}

// ============================================================================
// Federated Query Engine
// ============================================================================

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  count: number;
  source: DataSource;
  executionTime?: number;
}

export class FederatedQueryEngine {
  private dataSourceStrategy: DataSourceStrategy;
  private duckDBService = getDuckDBService();

  constructor(
    strategy: DataSourceStrategy = new TimeBasedDataSourceStrategy()
  ) {
    this.dataSourceStrategy = strategy;
  }

  async executeQuery<T = Record<string, unknown>>(
    builder: QueryBuilder,
    context: QueryContext
  ): Promise<QueryResult<T>> {
    const source = this.dataSourceStrategy.determineDataSource(context);
    const startTime = Date.now();

    try {
      switch (source) {
        case "postgres":
          return await this.executePostgresQuery<T>(builder, startTime);
        case "duckdb":
          return await this.executeDuckDBQuery<T>(builder, startTime);
        case "both":
          return await this.executeFederatedQuery<T>(
            builder,
            context,
            startTime
          );
        default:
          throw new Error(`Unsupported data source: ${source}`);
      }
    } catch (error) {
      console.error(`Query execution failed for source ${source}:`, error);
      // Fallback to postgres on error
      if (source !== "postgres") {
        return await this.executePostgresQuery<T>(builder, startTime);
      }
      throw error;
    }
  }

  private async executePostgresQuery<T>(
    builder: QueryBuilder,
    startTime: number
  ): Promise<QueryResult<T>> {
    const sqlQuery = builder.toPostgresSQL();
    const parameters = builder.getParameters();

    // Build SQL with safe parameter substitution
    const paramValues = Object.values(parameters);
    let finalQuery = sqlQuery;

    // Replace $1, $2, etc. with properly escaped values
    paramValues.forEach((value, index) => {
      const paramPlaceholder = `$${index + 1}`;

      if (value === null || value === undefined) {
        finalQuery = finalQuery.replace(paramPlaceholder, "NULL");
      } else if (typeof value === "string") {
        // Use sql.raw for string interpolation to avoid injection
        const escapedValue = value.replace(/'/g, "''");
        finalQuery = finalQuery.replace(paramPlaceholder, `'${escapedValue}'`);
      } else if (value instanceof Date) {
        finalQuery = finalQuery.replace(
          paramPlaceholder,
          `'${value.toISOString()}'`
        );
      } else if (typeof value === "number" || typeof value === "boolean") {
        finalQuery = finalQuery.replace(paramPlaceholder, String(value));
      } else {
        // For complex types, stringify and escape
        const stringValue = JSON.stringify(value).replace(/'/g, "''");
        finalQuery = finalQuery.replace(paramPlaceholder, `'${stringValue}'`);
      }
    });

    const result = await db.execute(sql.raw(finalQuery));

    return {
      rows: result.rows as T[],
      count: result.rowCount || 0,
      source: "postgres",
      executionTime: Date.now() - startTime,
    };
  }

  private async executeDuckDBQuery<T>(
    builder: QueryBuilder,
    startTime: number
  ): Promise<QueryResult<T>> {
    const sqlQuery = builder.toDuckDBSQL();
    const result = await this.duckDBService.executeCustomQuery(sqlQuery);

    return {
      rows: result.rows as T[],
      count: result.count,
      source: "duckdb",
      executionTime: Date.now() - startTime,
    };
  }

  private async executeFederatedQuery<T>(
    builder: QueryBuilder,
    _context: QueryContext,
    startTime: number
  ): Promise<QueryResult<T>> {
    // For federated queries spanning both sources, we'll execute both and merge
    // This is a simplified implementation - in production you'd want more sophisticated merging
    const [pgResult, duckResult] = await Promise.allSettled([
      this.executePostgresQuery<T>(builder, startTime),
      this.executeDuckDBQuery<T>(builder, startTime),
    ]);

    const pgRows = pgResult.status === "fulfilled" ? pgResult.value.rows : [];
    const duckRows =
      duckResult.status === "fulfilled" ? duckResult.value.rows : [];

    // Simple merge - in practice you'd need deduplication and proper ordering
    const mergedRows = [...pgRows, ...duckRows];

    return {
      rows: mergedRows,
      count: mergedRows.length,
      source: "both",
      executionTime: Date.now() - startTime,
    };
  }

  async close(): Promise<void> {
    await this.duckDBService.close();
  }
}

// ============================================================================
// Convenience Factory Functions
// ============================================================================

export function createQueryBuilder(): QueryBuilder {
  return new FederatedQueryBuilder();
}

export function createQueryEngine(
  strategy?: DataSourceStrategy
): FederatedQueryEngine {
  return new FederatedQueryEngine(strategy);
}

// Export commonly used types
