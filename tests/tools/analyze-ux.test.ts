import { describe, test, expect } from "vitest";
import { handleAnalyzeUx } from "../../src/tools/handlers/analyze-ux";

const BASE = "https://example.com";

describe("handleAnalyzeUx", () => {
  test("should detect skip links", async () => {
    const html = '<a href="#main">Skip to main content</a>';
    const result = await handleAnalyzeUx({ html }, BASE);
    expect(result).toContain("skip link");
  });

  test("should detect focus states when present", async () => {
    const html = "<style>:focus { outline: 2px solid blue; }</style>";
    const result = await handleAnalyzeUx({ html }, BASE);
    expect(result).toContain("focus states");
  });

  test("should detect reduced motion support", async () => {
    const html =
      "@media (prefers-reduced-motion: reduce) { * { animation: none; } }";
    const result = await handleAnalyzeUx({ html }, BASE);
    expect(result).toContain("reduced motion");
  });

  test("should detect no reduced motion", async () => {
    const html = "<div>Basic content</div>";
    const result = await handleAnalyzeUx({ html }, BASE);
    expect(result).toContain("no reduced motion");
  });

  test("should detect touch targets >=44px", async () => {
    const html = '<button style="min-height: 44px;">Button</button>';
    const result = await handleAnalyzeUx({ html }, BASE);
    expect(result).toContain("touch targets");
  });

  test("should detect navigation", async () => {
    const html = '<nav><a href="/">Home</a></nav>';
    const result = await handleAnalyzeUx({ html }, BASE);
    expect(result).toContain("navigation");
  });

  test("should detect form placeholders", async () => {
    const html = '<input placeholder="Enter email">';
    const result = await handleAnalyzeUx({ html }, BASE);
    expect(result).toContain("form placeholders");
  });

  test("should return UX elements for minimal HTML", async () => {
    const html = "<div>Minimal</div>";
    const result = await handleAnalyzeUx({ html }, BASE);
    expect(result).toContain("UX elements");
  });
});
