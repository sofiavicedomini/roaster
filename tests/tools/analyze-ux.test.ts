import { describe, test, expect } from "vitest";
import { handleAnalyzeUx } from "../../src/tools/handlers/analyze-ux";

describe("handleAnalyzeUx", () => {
  test("should detect skip links", () => {
    const html = '<a href="#main">Skip to main content</a>';
    const result = handleAnalyzeUx({ html });
    expect(result).toContain("skip link");
  });

  test("should detect focus states when present", () => {
    const html = '<style>:focus { outline: 2px solid blue; }</style>';
    const result = handleAnalyzeUx({ html });
    expect(result).toContain("focus states");
  });

  test("should detect reduced motion support", () => {
    const html = '@media (prefers-reduced-motion: reduce) { * { animation: none; } }';
    const result = handleAnalyzeUx({ html });
    expect(result).toContain("reduced motion");
  });

  test("should detect no reduced motion", () => {
    const html = '<div>Basic content</div>';
    const result = handleAnalyzeUx({ html });
    expect(result).toContain("no reduced motion");
  });

  test("should detect touch targets >=44px", () => {
    const html = '<button style="min-height: 44px;">Button</button>';
    const result = handleAnalyzeUx({ html });
    expect(result).toContain("touch targets");
  });

  test("should detect navigation", () => {
    const html = '<nav><a href="/">Home</a></nav>';
    const result = handleAnalyzeUx({ html });
    expect(result).toContain("navigation");
  });

  test("should detect form placeholders", () => {
    const html = '<input placeholder="Enter email">';
    const result = handleAnalyzeUx({ html });
    expect(result).toContain("form placeholders");
  });

  test("should return UX elements for minimal HTML", () => {
    const html = '<div>Minimal</div>';
    const result = handleAnalyzeUx({ html });
    expect(result).toContain("UX elements");
  });
});