import { fetchUrl } from "../utils";

export async function handleAnalyzeAccessibility(args: unknown, baseUrl: string): Promise<string> {
  const { html, url } = args as { html?: string; url?: string };
  
  let htmlContent = html;
  
  if (!htmlContent && url) {
    const resolved = url.startsWith("http") ? url : new URL(url, new URL(baseUrl).origin).toString();
    htmlContent = await fetchUrl(resolved) ?? undefined;
  }
  
  if (!htmlContent) {
    return "No HTML provided or URL not reachable. Use scrape_url first to fetch the homepage.";
  }
  
  const issues: string[] = [];
  // Case-insensitive and more robust checks
  const lowerHtml = htmlContent.toLowerCase();
  const hasAria = lowerHtml.includes('aria-');
  const hasRoles = lowerHtml.includes('role=');
  const hasAriaLabel = /aria-label\s*=/i.test(htmlContent);
  const hasAriaLabelledby = /aria-labelledby\s*=/i.test(htmlContent);
  const hasAriaDescribedby = /aria-describedby\s*=/i.test(htmlContent);
  const hasAlt = /alt\s*=/i.test(htmlContent);
  const hasLang = /lang\s*=/i.test(htmlContent);
  const hasHeadings = /<h[1-6][\s>]/i.test(htmlContent);
  const hasButtons = /<button[\s>]/i.test(htmlContent);
  const hasInputs = /<input[\s/>]/i.test(htmlContent);
  const hasLabels = /<label[\s>]/i.test(htmlContent);
  
  if (!hasAria) issues.push("no ARIA attributes found");
  else {
    if (!hasAriaLabel) issues.push("no aria-label found");
    if (!hasAriaLabelledby) issues.push("no aria-labelledby found");
    if (!hasAriaDescribedby) issues.push("no aria-describedby found");
  }
  
  if (!hasRoles) issues.push("no ARIA roles found");
  if (!hasAlt && /<img/i.test(htmlContent)) issues.push("images without alt text");
  if (!hasLang) issues.push("missing lang attribute on html");
  if (!hasHeadings) issues.push("no heading elements (h1-h6) found");
  if (!hasButtons) issues.push("no button elements found");
  if (!hasLabels && hasInputs) issues.push("form inputs without labels");
  
  const specificIssues: string[] = [];
  // Check for links without proper labels
  if (/<a[\s>]/i.test(htmlContent) && !hasAriaLabel && !/href\s*=/i.test(htmlContent)) {
    specificIssues.push("links without proper href or aria-label");
  }
  if (htmlContent.includes('disabled') && !/aria-disabled\s*=/i.test(htmlContent)) {
    specificIssues.push("disabled elements without aria-disabled");
  }
  
  const allIssues = [...issues, ...specificIssues];
  
  void allIssues.length;
  
  return allIssues.length > 0 
    ? `Accessibility issues found (${allIssues.length}): ${allIssues.join(", ")}. Summary: ARIA=${hasAria}, roles=${hasRoles}, aria-label=${hasAriaLabel}, headings=${hasHeadings}, buttons=${hasButtons}, labels=${hasLabels}, lang=${hasLang}`
    : `Accessibility OK. ARIA present: ${hasAria}, roles: ${hasRoles}, aria-label: ${hasAriaLabel}, aria-labelledby: ${hasAriaLabelledby}, aria-describedby: ${hasAriaDescribedby}, headings: ${hasHeadings}, buttons: ${hasButtons}, labels: ${hasLabels}, lang: ${hasLang}. No critical issues found.`;
}