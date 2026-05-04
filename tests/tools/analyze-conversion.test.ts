import { describe, test, expect } from "vitest";
import { handleAnalyzeConversion } from "../../src/tools/handlers/analyze-conversion";

const BASE = "https://example.com";

describe("handleAnalyzeConversion", () => {
  test("should detect form action attribute", async () => {
    const html = '<form action="/submit" method="post">';
    const result = await handleAnalyzeConversion({ html }, BASE);
    expect(result).toContain("form action defined");
  });

  test("should detect missing form action", async () => {
    const html = '<form method="post">';
    const result = await handleAnalyzeConversion({ html }, BASE);
    expect(result).toContain("form action missing");
  });

  test("should detect valid input types", async () => {
    const html = `
      <input type="email" name="email">
      <input type="tel" name="phone">
      <input type="number" name="qty">
    `;
    const result = await handleAnalyzeConversion({ html }, BASE);
    expect(result).toContain("valid input types");
  });

  test("should detect no valid input types", async () => {
    const html = '<input type="text" name="name">';
    const result = await handleAnalyzeConversion({ html }, BASE);
    expect(result).toContain("no valid input types");
  });

  test("should detect required validation", async () => {
    const html = '<input type="email" required pattern="[a-z]+">';
    const result = await handleAnalyzeConversion({ html }, BASE);
    expect(result).toContain("required validation");
  });

  test("should detect no required validation", async () => {
    const html = '<input type="text" name="name">';
    const result = await handleAnalyzeConversion({ html }, BASE);
    expect(result).toContain("no required validation");
  });

  test("should detect CTA styled", async () => {
    const html = '<button style="background: #ff0000; color: #fff;">Submit</button>';
    const result = await handleAnalyzeConversion({ html }, BASE);
    expect(result).toContain("CTA styled");
  });

  test("should detect CTA not styled", async () => {
    const html = '<button>Submit</button>';
    const result = await handleAnalyzeConversion({ html }, BASE);
    expect(result).toContain("CTA not styled");
  });

  test("should detect trust signals", async () => {
    const html = '<div class="trust-badge">SSL Secured</div>';
    const result = await handleAnalyzeConversion({ html }, BASE);
    expect(result).toContain("trust signals");
  });

  test("should detect no trust signals", async () => {
    const html = '<form><input></form>';
    const result = await handleAnalyzeConversion({ html }, BASE);
    expect(result).toContain("no trust signals");
  });

  test("should detect email capture", async () => {
    const html = '<input name="email" value="test@example.com">';
    const result = await handleAnalyzeConversion({ html }, BASE);
    expect(result).toContain("email capture");
  });

  test("should detect forms", async () => {
    const html = '<form><input></form>';
    const result = await handleAnalyzeConversion({ html }, BASE);
    expect(result).toContain("has forms");
  });

  test("should count CTAs", async () => {
    const html = '<button>Submit</button><a class="btn">Click</a>';
    const result = await handleAnalyzeConversion({ html }, BASE);
    expect(result).toContain("CTAs found");
  });
});
