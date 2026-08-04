declare module "cloudflare:workers" {
  export const env: {
    CF_ACCESS_AUD?: string;
    CF_ACCESS_TEAM_DOMAIN?: string;
    DB: {
      prepare(query: string): {
        bind(...values: unknown[]): { first<T>(): Promise<T | null> };
      };
    };
  };
}
