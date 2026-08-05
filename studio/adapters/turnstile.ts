export async function verifyTurnstile(token: string, secret: string, remoteIp?: string) {
  const body = new URLSearchParams({ response: token, secret });
  if (remoteIp) body.set("remoteip", remoteIp);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  return response.ok && (await response.json() as { success?: boolean }).success === true;
}
