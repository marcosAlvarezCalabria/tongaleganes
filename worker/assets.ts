type AssetsFetcher = { fetch(request: Request): Promise<Response> };

export function fetchOptimizedAsset(assets: AssetsFetcher | undefined, path: string, origin: string) {
  const target = new URL(path, origin);
  if (target.pathname === "/_vinext/image") return Promise.resolve(new Response("Invalid image source.", { status: 400 }));
  if (!assets) return Promise.resolve(new Response("Asset service unavailable.", { status: 503 }));
  return assets.fetch(new Request(target));
}
