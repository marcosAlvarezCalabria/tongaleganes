export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
}

export interface D1DatabasePort {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown>;
}

export function createD1BatchWriter(database: D1DatabasePort) {
  return {
    execute(statements: Array<{ query: string; values?: unknown[] }>) {
      return database.batch(statements.map(({ query, values = [] }) => database.prepare(query).bind(...values)));
    },
  };
}
