import { describe, expect, it } from "vitest";
import { retentionDeadline } from "../studio/adapters/media";

describe("media retention", () => {
  it("expires pending and rejected media after 30 days and revoked media after 7 days", () => {
    const updated = "2026-08-01T00:00:00.000Z";
    expect(retentionDeadline("pending", updated)).toBe("2026-08-31T00:00:00.000Z");
    expect(retentionDeadline("rejected", updated)).toBe("2026-08-31T00:00:00.000Z");
    expect(retentionDeadline("revoked", updated)).toBe("2026-08-08T00:00:00.000Z");
    expect(retentionDeadline("approved", updated)).toBeNull();
  });
});
