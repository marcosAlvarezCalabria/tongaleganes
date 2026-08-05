import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { forbiddenResult, type DomainResult } from "./domain.ts";
import type { Actor } from "./ports.ts";

export type AccessConfig = { issuer: string; audience: string };
export type ActiveStaff = Actor;
export type StaffLookup = (email: string) => Promise<ActiveStaff | null>;

const accessRequiredMessage = "Staff access is required.";
const accessRequired = <T>(code: string): DomainResult<T> => forbiddenResult(code, accessRequiredMessage);

export function createAccessKeySet(config: AccessConfig) {
  return createRemoteJWKSet(new URL("/cdn-cgi/access/certs", config.issuer));
}

export function getAccessConfig(values: { CF_ACCESS_TEAM_DOMAIN?: string; CF_ACCESS_AUD?: string }): AccessConfig | null {
  if (!values.CF_ACCESS_TEAM_DOMAIN || !values.CF_ACCESS_AUD) return null;
  return { issuer: `https://${values.CF_ACCESS_TEAM_DOMAIN}`, audience: values.CF_ACCESS_AUD };
}

export async function authorizeAccessToken(
  token: string | null,
  config: AccessConfig,
  keySet: JWTVerifyGetKey,
  findStaff: StaffLookup,
): Promise<DomainResult<Actor>> {
  if (!token) return accessRequired("access_token_missing");

  try {
    const { payload } = await jwtVerify(token, keySet, {
      algorithms: ["RS256"],
      audience: config.audience,
      issuer: config.issuer,
    });
    if (typeof payload.email !== "string") return accessRequired("access_token_invalid");

    const staff = await findStaff(payload.email);
    return staff ? { ok: true, value: staff } : accessRequired("access_token_invalid");
  } catch {
    return accessRequired("access_token_invalid");
  }
}
