import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const request = new Request("http://localhost/", { headers: { accept: "text/html" } });
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const context = { waitUntil() {}, passThroughOnException() {} };

  return typeof worker === "function" ? worker(request, env, context) : worker.fetch(request, env, context);
}

test("renders the Tonga Tattoo landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="es"/i);
  assert.match(html, /Tonga Tattoo .* Estudio de tatuajes en Legan.s/i);
  assert.match(html, /Tu historia/);
  assert.match(html, /Trabajos que/);
  assert.match(html, /C\/ San Nicasio, 7/);
  assert.equal((html.match(/href="\/book"/g) ?? []).length, 4);
  assert.match(html, /id="site-navigation"/);
  assert.match(html, /aria-controls="site-navigation"/);
  assert.match(html, /instagram\.com\/tongaleganes/);
  assert.match(html, /instagram\.com\/_nuria_cordoba/);
  assert.match(html, /facebook\.com\/NuriaCordobaTorrente/);
  assert.doesNotMatch(html, /me gusta/i);
  assert.ok((html.match(/data-parallax=/g) ?? []).length >= 10);
  assert.match(html, /manifesto-backdrop/);
  assert.match(html, /reviews-backdrop/);
  assert.match(html, /nuria-cordoba\.jpg/);
  assert.match(html, /Quiero dar las GRACIAS/);
  assert.match(html, /Una nota de Nuria/);
  assert.match(html, /Conoce[\s\S]*el estudio/);
  assert.match(html, /conoce-el-estudio\.mp4/);
  assert.doesNotMatch(html, /autoplay/);
  assert.match(html, /nuria-01\.jpg/);
  assert.match(html, /nuria-05\.jpg/);
  assert.doesNotMatch(html, /data-scroll-frame/);
  assert.doesNotMatch(html, /\/frames\/hero\//);
  assert.doesNotMatch(html, /victor-proceso\.mp4|data-scroll-video/);
  assert.match(html, /data-parallax/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
  assert.equal(existsSync(new URL("../public/frames/hero", import.meta.url)), false);
});