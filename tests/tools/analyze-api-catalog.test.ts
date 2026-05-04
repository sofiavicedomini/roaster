import { describe, test, expect, vi, beforeEach } from "vitest";
import { handleAnalyzeApiCatalog } from "../../src/tools/handlers/analyze-api-catalog";

vi.mock("../../src/tools/utils", () => ({
  fetchUrl: vi.fn(),
}));

import { fetchUrl } from "../../src/tools/utils";

describe("handleAnalyzeApiCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should detect valid API catalog", async () => {
    const content = JSON.stringify({
      title: "My API",
      description: "API Description",
      version: "1.0.0",
      apis: [
        { title: "Users API", url: "/api/users" },
        { title: "Posts API", url: "/api/posts" },
      ],
    });
    vi.mocked(fetchUrl).mockResolvedValueOnce(content);

    const result = await handleAnalyzeApiCatalog({}, "https://example.com");

    expect(result).toContain("VALID");
    expect(result).toContain("title");
    expect(result).toContain("apis:");
  });

  test("should handle missing catalog", async () => {
    vi.mocked(fetchUrl).mockResolvedValueOnce("");

    const result = await handleAnalyzeApiCatalog({}, "https://example.com");

    expect(result).toContain("not found");
  });

  test("should detect invalid JSON response", async () => {
    vi.mocked(fetchUrl).mockResolvedValueOnce("not valid json");

    const result = await handleAnalyzeApiCatalog({}, "https://example.com");

    expect(result).toContain("invalid JSON");
  });

  test("should detect OpenAPI spec", async () => {
    const content = JSON.stringify({
      openapi: "3.0.0",
      paths: {},
    });
    vi.mocked(fetchUrl).mockResolvedValueOnce(content);

    const result = await handleAnalyzeApiCatalog({}, "https://example.com");

    expect(result).toContain("VALID");
  });
});
