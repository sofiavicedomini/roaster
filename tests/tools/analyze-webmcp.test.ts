import { describe, test, expect, vi, beforeEach } from "vitest";
import { handleAnalyzeWebmcp } from "../../src/tools/handlers/analyze-webmcp";

vi.mock("../../src/tools/utils", () => ({
  fetchUrl: vi.fn(),
}));

import { fetchUrl } from "../../src/tools/utils";

describe("handleAnalyzeWebmcp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should detect valid WebMCP", async () => {
    const content = JSON.stringify({
      name: "WebMCP Server",
      version: "1.0.0",
      mcpServers: {
        tools: { url: "https://example.com/tools", transport: "http" },
      },
    });
    vi.mocked(fetchUrl).mockResolvedValueOnce(content);

    const result = await handleAnalyzeWebmcp({}, "https://example.com");
    
    expect(result).toContain("VALID");
    expect(result).toContain("mcpServers");
  });

  test("should handle missing WebMCP", async () => {
    vi.mocked(fetchUrl).mockResolvedValueOnce("");

    const result = await handleAnalyzeWebmcp({}, "https://example.com");
    
    expect(result).toContain("not found");
  });

  test("should detect invalid JSON response", async () => {
    vi.mocked(fetchUrl).mockResolvedValueOnce("{ invalid");

    const result = await handleAnalyzeWebmcp({}, "https://example.com");
    
    expect(result).toContain("invalid JSON");
  });

  test("should detect empty config", async () => {
    const content = JSON.stringify({ name: "Empty" });
    vi.mocked(fetchUrl).mockResolvedValueOnce(content);

    const result = await handleAnalyzeWebmcp({}, "https://example.com");
    
    expect(result).toContain("EMPTY");
  });
});