import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { handleAnalyzeOauth } from "../../src/tools/handlers/analyze-oauth";

vi.mock("../../src/tools/utils", () => ({
  fetchUrl: vi.fn(),
}));

import { fetchUrl } from "../../src/tools/utils";

describe("handleAnalyzeOauth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should detect valid OAuth discovery", async () => {
    const content = JSON.stringify({
      issuer: "https://auth.example.com",
      authorization_endpoint: "https://auth.example.com/authorize",
      token_endpoint: "https://auth.example.com/token",
      grant_types_supported: ["authorization_code", "client_credentials"],
      scopes_supported: ["openid", "email", "profile"],
    });
    vi.mocked(fetchUrl).mockResolvedValueOnce(content);

    const result = await handleAnalyzeOauth({}, "https://example.com");
    
    expect(result).toContain("VALID");
    expect(result).toContain("auth_endpoint ✓");
    expect(result).toContain("token_endpoint ✓");
    expect(result).toContain("grants");
  });

  test("should handle missing OAuth discovery", async () => {
    vi.mocked(fetchUrl).mockResolvedValueOnce("");

    const result = await handleAnalyzeOauth({}, "https://example.com");
    
    expect(result).toContain("not found");
  });

  test("should detect invalid JSON response", async () => {
    vi.mocked(fetchUrl).mockResolvedValueOnce("{ invalid json");

    const result = await handleAnalyzeOauth({}, "https://example.com");
    
    expect(result).toContain("invalid JSON");
  });

  test("should detect incomplete OAuth config", async () => {
    const content = JSON.stringify({
      issuer: "https://auth.example.com",
    });
    vi.mocked(fetchUrl).mockResolvedValueOnce(content);

    const result = await handleAnalyzeOauth({}, "https://example.com");
    
    expect(result).toContain("INCOMPLETE");
  });

  test("should detect dynamic client registration", async () => {
    const content = JSON.stringify({
      authorization_endpoint: "https://auth.example.com/authorize",
      token_endpoint: "https://auth.example.com/token",
      registration_endpoint: "https://auth.example.com/register",
    });
    vi.mocked(fetchUrl).mockResolvedValueOnce(content);

    const result = await handleAnalyzeOauth({}, "https://example.com");
    
    expect(result).toContain("dynamic_registration ✓");
  });
});