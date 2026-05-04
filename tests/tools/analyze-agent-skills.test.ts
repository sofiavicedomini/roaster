import { describe, test, expect, vi, beforeEach } from "vitest";
import { handleAnalyzeAgentSkills } from "../../src/tools/handlers/analyze-agent-skills";

vi.mock("../../src/tools/utils", () => ({
  fetchUrl: vi.fn(),
}));

import { fetchUrl } from "../../src/tools/utils";

describe("handleAnalyzeAgentSkills", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("should detect valid Agent Skills", async () => {
    const content = `# Agent Skills

## Capabilities
- Web search
- File processing
- Code execution

## Tools
- browser.use
- filesystem.read`;
    vi.mocked(fetchUrl).mockResolvedValueOnce(content);

    const result = await handleAnalyzeAgentSkills({}, "https://example.com");

    expect(result).toContain("VALID");
    expect(result).toContain("skills");
  });

  test("should handle missing skills", async () => {
    vi.mocked(fetchUrl).mockResolvedValueOnce("");

    const result = await handleAnalyzeAgentSkills({}, "https://example.com");

    expect(result).toContain("not found");
  });

  test("should count skills and tools", async () => {
    const content = "skill one\nskill two\nskill three\ntool one\ntool two";
    vi.mocked(fetchUrl).mockResolvedValueOnce(content);

    const result = await handleAnalyzeAgentSkills({}, "https://example.com");

    expect(result).toContain("skills:");
  });
});
