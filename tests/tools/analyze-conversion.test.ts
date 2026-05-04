import { describe, test, expect } from "vitest";
import { handleAnalyzeConversion } from "../../src/tools/handlers/analyze-conversion";

describe("handleAnalyzeConversion", () => {
  test("should detect form action attribute", () => {
    const html = '<form action="/submit" method="post">';
    const result = handleAnalyzeConversion({ html });
    expect(result).toContain("form action defined");
  });

  test("should detect missing form action", () => {
    const html = '<form method="post">';
    const result = handleAnalyzeConversion({ html });
    expect(result).toContain("form action missing");
  });

  test("should detect valid input types", () => {
    const html = `
      <input type="email" name="email">
      <input type="tel" name="phone">
      <input type="number" name="qty">
    `;
    const result = handleAnalyzeConversion({ html });
    expect(result).toContain("valid input types");
  });

  test("should detect no valid input types", () => {
    const html = '<input type="text" name="name">';
    const result = handleAnalyzeConversion({ html });
    expect(result).toContain("no valid input types");
  });

  test("should detect required validation", () => {
    const html = '<input type="email" required pattern="[a-z]+">';
    const result = handleAnalyzeConversion({ html });
    expect(result).toContain("required validation");
  });

  test("should detect no required validation", () => {
    const html = '<input type="text" name="name">';
    const result = handleAnalyzeConversion({ html });
    expect(result).toContain("no required validation");
  });

  test("should detect CTA styled", () => {
    const html = '<button style="background: #ff0000; color: #fff;">Submit</button>';
    const result = handleAnalyzeConversion({ html });
    expect(result).toContain("CTA styled");
  });

  test("should detect CTA not styled", () => {
    const html = '<button>Submit</button>';
    const result = handleAnalyzeConversion({ html });
    expect(result).toContain("CTA not styled");
  });

  test("should detect trust signals", () => {
    const html = '<div class="trust-badge">SSL Secured</div>';
    const result = handleAnalyzeConversion({ html });
    expect(result).toContain("trust signals");
  });

  test("should detect no trust signals", () => {
    const html = '<form><input></form>';
    const result = handleAnalyzeConversion({ html });
    expect(result).toContain("no trust signals");
  });

  test("should detect email capture", () => {
    const html = '<input name="email" value="test@example.com">';
    const result = handleAnalyzeConversion({ html });
    expect(result).toContain("email capture");
  });

  test("should detect forms", () => {
    const html = '<form><input></form>';
    const result = handleAnalyzeConversion({ html });
    expect(result).toContain("has forms");
  });

  test("should count CTAs", () => {
    const html = '<button>Submit</button><a class="btn">Click</a>';
    const result = handleAnalyzeConversion({ html });
    expect(result).toContain("CTAs found");
  });
});