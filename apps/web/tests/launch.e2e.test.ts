/** End-to-end checks for what the app stores and uptime monitors need: health check, public legal pages and security headers. */
import { describe, expect, it } from "vitest";

const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";

describe("launch readiness", () => {
  it("reports the database as up on the health check", async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, database: "up" });
  });

  it.each([
    ["/privacy", "Privacy policy"],
    ["/terms", "Terms of use"],
    ["/delete-account", "Delete your MoneyMania account"],
  ])("serves %s without signing in", async (path, heading) => {
    const res = await fetch(`${base}${path}`, { redirect: "manual" });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(heading);
  });

  it("sends security headers", async () => {
    const res = await fetch(`${base}/`);
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("strict-transport-security")).toContain("max-age=");
    expect(res.headers.get("x-powered-by")).toBeNull();
  });
});
