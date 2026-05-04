import { renderPage } from "../browser";
import { fetchUrl } from "../utils";

export async function handleAnalyzeAccessibility(args: unknown, baseUrl: string): Promise<string> {
  const { html: htmlArg, url: urlArg } = args as { html?: string; url?: string };

  let html = htmlArg ?? "";

  if (!html && urlArg) {
    const resolved = urlArg.startsWith("http")
      ? urlArg
      : new URL(urlArg, new URL(baseUrl).origin).toString();
    const rendered = await renderPage(resolved);
    html = rendered?.html ?? (await fetchUrl(resolved)) ?? "";
  }

  if (!html) {
    return "No HTML or URL provided. Pass url to analyze accessibility.";
  }

  const issues: string[] = [];
  const ok: string[] = [];

  // --- lang attribute ---
  if (/lang\s*=\s*["'][a-z]/i.test(html)) ok.push("lang attribute present");
  else issues.push("missing lang attribute on <html>");

  // --- Landmark roles / semantic structure ---
  const hasMain = /<main[\s>]/i.test(html);
  const hasNav = /<nav[\s>]/i.test(html);
  const hasHeader = /<header[\s>]/i.test(html);
  const hasFooter = /<footer[\s>]/i.test(html);
  if (hasMain) ok.push("<main> landmark"); else issues.push("no <main> landmark");
  if (hasNav) ok.push("<nav> landmark"); else issues.push("no <nav> landmark");
  if (hasHeader) ok.push("<header>"); else issues.push("no <header>");
  if (hasFooter) ok.push("<footer>"); else issues.push("no <footer>");

  // --- Heading hierarchy ---
  const h1s = (html.match(/<h1[\s>]/gi) || []).length;
  const h2s = (html.match(/<h2[\s>]/gi) || []).length;
  if (h1s === 0) issues.push("no <h1> heading");
  else if (h1s > 1) issues.push(`multiple <h1> (${h1s})`);
  else ok.push("single <h1>");
  if (h2s > 0) ok.push(`${h2s} <h2> headings`);

  // --- Images without alt ---
  const allImgs = html.match(/<img\s[^>]*>/gi) || [];
  const imgsWithoutAlt = allImgs.filter((img) => !/alt\s*=/i.test(img));
  const decorativeImgs = allImgs.filter((img) => /alt\s*=\s*["']\s*["']/i.test(img));
  if (allImgs.length > 0) {
    if (imgsWithoutAlt.length > 0) issues.push(`${imgsWithoutAlt.length}/${allImgs.length} images missing alt`);
    else ok.push(`all ${allImgs.length} images have alt (${decorativeImgs.length} decorative)`);
  }

  // --- Form inputs without labels ---
  const inputs = html.match(/<input(?![^>]*type\s*=\s*["'](?:hidden|submit|button|reset|image)["'])[^>]*>/gi) || [];
  const inputsWithId = inputs.filter((inp) => /id\s*=/i.test(inp));
  const inputsWithAria = inputs.filter((inp) => /aria-label(ledby)?\s*=/i.test(inp));
  const labelTags = (html.match(/<label[^>]*for\s*=/gi) || []).length;
  if (inputs.length > 0) {
    const covered = inputsWithAria.length + Math.min(inputsWithId.length, labelTags);
    if (covered < inputs.length) issues.push(`${inputs.length - covered}/${inputs.length} inputs may lack labels`);
    else ok.push(`${inputs.length} inputs labelled`);
  }

  // --- Buttons without accessible name ---
  const buttons = html.match(/<button[^>]*>[\s\S]*?<\/button>/gi) || [];
  const emptyButtons = buttons.filter((btn) => {
    const inner = btn.replace(/<[^>]+>/g, "").trim();
    return inner.length === 0 && !/aria-label\s*=/i.test(btn);
  });
  if (buttons.length > 0) {
    if (emptyButtons.length > 0) issues.push(`${emptyButtons.length}/${buttons.length} buttons have no accessible name`);
    else ok.push(`${buttons.length} buttons have text or aria-label`);
  }

  // --- Links without accessible name ---
  const links = html.match(/<a\s[^>]*>[\s\S]*?<\/a>/gi) || [];
  const emptyLinks = links.filter((link) => {
    const inner = link.replace(/<[^>]+>/g, "").trim();
    return inner.length === 0 && !/aria-label\s*=/i.test(link) && !/title\s*=/i.test(link);
  });
  if (emptyLinks.length > 0) issues.push(`${emptyLinks.length} links with no accessible name (no text, no aria-label)`);
  else if (links.length > 0) ok.push(`${links.length} links have accessible names`);

  // --- Skip navigation ---
  const hasSkipLink = /<a[^>]*href\s*=\s*["']#/i.test(html);
  if (hasSkipLink) ok.push("skip link present");
  else issues.push("no skip navigation link");

  // --- ARIA usage ---
  const ariaLabelCount = (html.match(/aria-label\s*=/gi) || []).length;
  const ariaRoleCount = (html.match(/role\s*=/gi) || []).length;
  const ariaHiddenCount = (html.match(/aria-hidden\s*=\s*["']true["']/gi) || []).length;
  if (ariaLabelCount > 0) ok.push(`${ariaLabelCount} aria-label`);
  if (ariaRoleCount > 0) ok.push(`${ariaRoleCount} role=`);
  if (ariaHiddenCount > 0) ok.push(`${ariaHiddenCount} aria-hidden=true`);
  if (ariaLabelCount === 0 && ariaRoleCount === 0) issues.push("no ARIA attributes found");

  // --- tabindex abuse ---
  const badTabindex = (html.match(/tabindex\s*=\s*["'][1-9]\d*["']/gi) || []).length;
  if (badTabindex > 0) issues.push(`${badTabindex} elements with tabindex > 0 (breaks natural tab order)`);

  // --- Focus styles (inline hint) ---
  const hasFocusStyle = html.includes(":focus") || html.includes("focus-visible");
  if (hasFocusStyle) ok.push("focus styles referenced");
  else issues.push("no :focus / focus-visible styles found");

  // --- Interactive elements: disabled without aria-disabled ---
  const disabledWithoutAria = (html.match(/\bdisabled\b/gi) || []).length;
  const ariaDisabled = (html.match(/aria-disabled\s*=/gi) || []).length;
  if (disabledWithoutAria > 0 && ariaDisabled === 0) {
    issues.push(`${disabledWithoutAria} disabled element(s) without aria-disabled`);
  }

  const score = Math.max(1, 10 - Math.round(issues.length * 1.2));

  return [
    `Accessibility score: ~${score}/10`,
    issues.length > 0 ? `Issues (${issues.length}): ${issues.join("; ")}` : "No critical issues",
    ok.length > 0 ? `OK: ${ok.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
