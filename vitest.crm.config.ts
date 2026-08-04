import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { exportJWK, generateKeyPair } from "jose";
import path from "node:path";
import { defineConfig } from "vitest/config";

const pair = await generateKeyPair("RS256", { extractable: true });
const publicJwk = { ...(await exportJWK(pair.publicKey)), kid: "test-only-crm-key", alg: "RS256", use: "sig" };
const privateJwk = await exportJWK(pair.privateKey);

export default defineConfig(async () => ({
  resolve: { alias: { "@": path.resolve(".") } },
  plugins: [cloudflareTest({ wrangler: { configPath: "./tests/crm-workerd.wrangler.json" }, miniflare: {
    d1Databases: ["DB"],
    bindings: { TEST_MIGRATIONS: await readD1Migrations("./drizzle"), TEST_PRIVATE_JWK: JSON.stringify(privateJwk), CF_ACCESS_TEAM_DOMAIN: "access.test", CF_ACCESS_AUD: "crm-test" },
    outboundService: (request) => new URL(request.url).pathname === "/cdn-cgi/access/certs"
      ? Response.json({ keys: [publicJwk] }) : new Response("blocked", { status: 502 }),
  } })],
  test: { include: ["tests/crm-*.test.ts"], setupFiles: ["tests/crm-workerd.setup.ts"] },
}));
