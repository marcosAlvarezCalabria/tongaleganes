import assert from "node:assert/strict";
import test from "node:test";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { authorizeAccessToken } from "../studio/auth.ts";
import { canAccessAppointment } from "../studio/use-cases.ts";

const issuer = "https://studio.cloudflareaccess.com";
const audience = "studio-crm";
const { privateKey, publicKey } = await generateKeyPair("RS256");
const publicJwk = await exportJWK(publicKey);
publicJwk.kid = "studio-key";
const keySet = createLocalJWKSet({ keys: [publicJwk] });

const staffByEmail = new Map([
  ["owner@example.com", { staffId: "owner-1", role: "owner" }],
  ["artist@example.com", { staffId: "artist-1", role: "artist", artistId: "artist-1" }],
]);

function findStaff(email) {
  return Promise.resolve(staffByEmail.get(email) ?? null);
}

function sign(email, options = {}) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "RS256", kid: "studio-key" })
    .setIssuer(issuer)
    .setAudience(options.audience ?? audience)
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? "1h")
    .sign(options.key ?? privateKey);
}

test("authorizes a verified active owner", async () => {
  assert.deepEqual(await authorizeAccessToken(await sign("owner@example.com"), { issuer, audience }, keySet, findStaff), {
    ok: true,
    value: { staffId: "owner-1", role: "owner" },
  });
});

test("maps a verified artist to its application-owned artist scope", async () => {
  assert.deepEqual(await authorizeAccessToken(await sign("artist@example.com"), { issuer, audience }, keySet, findStaff), {
    ok: true,
    value: { staffId: "artist-1", role: "artist", artistId: "artist-1" },
  });
});

test("denies a missing Access token without revealing staff data", async () => {
  assert.deepEqual(await authorizeAccessToken(null, { issuer, audience }, keySet, findStaff), {
    ok: false,
    error: { kind: "forbidden", code: "access_token_missing", message: "Staff access is required." },
  });
});

test("rejects forged, expired, and wrong-audience Access tokens", async () => {
  const forgedKey = (await generateKeyPair("RS256")).privateKey;
  for (const token of [
    await sign("owner@example.com", { key: forgedKey }),
    await sign("owner@example.com", { expiresIn: "-1h" }),
    await sign("owner@example.com", { audience: "other-audience" }),
  ]) {
    const result = await authorizeAccessToken(token, { issuer, audience }, keySet, findStaff);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, "access_token_invalid");
  }
});

test("allows owners across artists but isolates an artist to assigned records", () => {
  assert.equal(canAccessAppointment({ staffId: "owner-1", role: "owner" }, "artist-2"), true);
  assert.equal(canAccessAppointment({ staffId: "artist-1", role: "artist", artistId: "artist-1" }, "artist-1"), true);
  assert.equal(canAccessAppointment({ staffId: "artist-1", role: "artist", artistId: "artist-1" }, "artist-2"), false);
});
