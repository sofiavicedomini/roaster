import { describe, test, expect, vi, beforeEach } from "vitest";
import { handleAnalyzeAgentCard } from "../../src/tools/handlers/analyze-agent-card";

vi.mock("../../src/tools/utils", () => ({
  fetchUrl: vi.fn(),
}));

import { fetchUrl } from "../../src/tools/utils";

describe("handleAnalyzeAgentCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should detect valid Agent Card", async () => {
    const content = JSON.stringify({
      name: "My Agent",
      version: "1.0.0",
      description: "A helpful agent",
      skills: ["search", "compute"],
      endpoints: [{ url: "https://agent.example.com/v1", protocol: "http" }],
    });
    vi.mocked(fetchUrl).mockResolvedValueOnce(content);

    const result = await handleAnalyzeAgentCard({}, "https://example.com");
    
    expect(result).toContain("VALID");
    expect(result).toContain("name");
    expect(result).toContain("skills:");
  });

  test("should handle missing Agent Card", async () => {
    vi.mocked(fetchUrl).mockResolvedValueOnce("");

    const result = await handleAnalyzeAgentCard({}, "https://example.com");
    
    expect(result).toContain("not found");
  });

  test("should detect invalid JSON response", async () => {
    vi.mocked(fetchUrl).mockResolvedValueOnce("{ invalid");

    const result = await handleAnalyzeAgentCard({}, "https://example.com");
    
    expect(result).toContain("invalid JSON");
  });

  test("should detect incomplete Agent Card", async () => {
    const content = JSON.stringify({ name: "Agent" });
    vi.mocked(fetchUrl).mockResolvedValueOnce(content);

    const result = await handleAnalyzeAgentCard({}, "https://example.com");
    
    expect(result).toContain("INCOMPLETE");
  });
});