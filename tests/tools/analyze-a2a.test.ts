import { describe, test, expect, vi, beforeEach } from "vitest";
import { handleAnalyzeA2A } from "../../src/tools/handlers/analyze-a2a";

vi.mock("../../src/tools/utils", () => ({
  fetchUrl: vi.fn(),
}));

import { fetchUrl } from "../../src/tools/utils";

describe("handleAnalyzeA2A", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should detect valid A2A manifest", async () => {
    const content = JSON.stringify({
      agentId: "agent-001",
      name: "My Assistant",
      version: "1.0.0",
      capabilities: ["chat", "tools"],
      endpoints: [{ url: "https://example.com/a2a", protocol: "http" }],
    });
    vi.mocked(fetchUrl).mockResolvedValueOnce(content);

    const result = await handleAnalyzeA2A({}, "https://example.com");
    
    expect(result).toContain("VALID");
    expect(result).toContain("agentId");
  });

  test("should handle missing manifest", async () => {
    vi.mocked(fetchUrl).mockResolvedValueOnce("");

    const result = await handleAnalyzeA2A({}, "https://example.com");
    
    expect(result).toContain("not found");
  });

  test("should detect invalid JSON response", async () => {
    vi.mocked(fetchUrl).mockResolvedValueOnce("not json");

    const result = await handleAnalyzeA2A({}, "https://example.com");
    
    expect(result).toContain("invalid JSON");
  });

  test("should detect minimal but valid manifest", async () => {
    const content = JSON.stringify({ name: "Agent" });
    vi.mocked(fetchUrl).mockResolvedValueOnce(content);

    const result = await handleAnalyzeA2A({}, "https://example.com");
    
    expect(result).toContain("VALID");
  });
});