import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { handleAnalyzeLlmsTxt } from "../../src/tools/handlers/analyze-llms-txt";

vi.mock("../../src/tools/utils", () => ({
  fetchUrl: vi.fn(),
}));

import { fetchUrl } from "../../src/tools/utils";

describe("handleAnalyzeLlmsTxt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("should prefer llms-full.txt when both exist", async () => {
    vi.mocked(fetchUrl)
      .mockResolvedValueOnce("llms-full content with instructions")
      .mockResolvedValueOnce("llms content");

    const result = await handleAnalyzeLlmsTxt({}, "https://example.com");
    
    expect(result).toContain("llms-full.txt");
    expect(result).toContain("✓");
  });

  test("should use llms-full.txt when available", async () => {
    vi.mocked(fetchUrl)
      .mockResolvedValueOnce("Some content")
      .mockResolvedValueOnce("llms content here");

    const result = await handleAnalyzeLlmsTxt({}, "https://example.com");
    
    expect(result).toContain("llms-full.txt");
    expect(result).toContain("✓");
  });

  test("should use available file when only one exists", async () => {
    vi.mocked(fetchUrl)
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("llms content");

    const result = await handleAnalyzeLlmsTxt({}, "https://example.com");
    
    expect(result).not.toContain("not found");
  });

  test("should detect instructions in content", async () => {
    const content = "## Instructions\nSystem prompt here";
    vi.mocked(fetchUrl)
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce(content);

    const result = await handleAnalyzeLlmsTxt({}, "https://example.com");
    
    expect(result).toContain("instructions");
  });

  test("should detect API endpoints", async () => {
    const content = "## API\n/v1/chat endpoint";
    vi.mocked(fetchUrl)
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce(content);

    const result = await handleAnalyzeLlmsTxt({}, "https://example.com");
    
    expect(result).toContain("API");
  });
});