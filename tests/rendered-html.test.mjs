import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the Tonga Tattoo landing page", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html[^>]*lang="es"/i);
  assert.match(html, /Tonga Tattoo \| Estudio de tatuajes en Leganés/i);
  assert.match(html, /Tu historia/);
  assert.match(html, /Trabajos que/);
  assert.match(html, /C\/ San Nicasio, 7/);
  assert.match(html, /wa\.me\/34600037560/);
  assert.match(html, /instagram\.com\/tongaleganes/);
  assert.match(html, /instagram\.com\/_nuria_cordoba/);
  assert.match(html, /facebook\.com\/NuriaCordobaTorrente/);
  assert.doesNotMatch(html, /me gusta/i);
  assert.match(html, /data-scroll-hero/);
  assert.match(html, /data-scroll-frame/);
  assert.match(html, /\/frames\/hero\/frame-001\.webp/);
  assert.doesNotMatch(html, /victor-proceso\.mp4|data-scroll-video/);
  assert.match(html, /data-parallax/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});
