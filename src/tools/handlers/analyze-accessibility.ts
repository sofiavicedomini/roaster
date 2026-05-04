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
  const hasAria = htmlContent.includes('aria-');
  const hasRoles = htmlContent.includes('role="');
  const hasAriaLabel = htmlContent.match(/aria-label/i);
  const hasAriaLabelledby = htmlContent.match(/aria-labelledby/i);
  const hasAriaDescribedby = htmlContent.match(/aria-describedby/i);
  const hasAriaHidden = htmlContent.match(/aria-hidden/i);
  const hasAriaRequired = htmlContent.match(/aria-required/i);
  const hasAlt = htmlContent.includes('alt="');
  const hasLang = htmlContent.includes("lang=");
  const hasHeadings = htmlContent.match(/<h[1-6][^>]*>/i);
  const hasButtons = htmlContent.match(/<button/i);
  const hasInputs = htmlContent.match(/<input/i);
  const hasLabels = htmlContent.match(/<label/i);
  
  if (!hasAria) issues.push("no ARIA attributes");
  else {
    if (!hasAriaLabel) issues.push("no aria-label");
    if (!hasAriaLabelledby) issues.push("no aria-labelledby");
    if (!hasAriaDescribedby) issues.push("no aria-describedby");
  }
  
  if (!hasRoles) issues.push("no ARIA roles");
  if (!hasAlt) issues.push("missing alt text on images");
  if (!hasLang) issues.push("missing lang attribute");
  if (!hasHeadings) issues.push("no headings");
  if (!hasButtons) issues.push("no button elements");
  if (!hasLabels && hasInputs) issues.push("form inputs without labels");
  
  const specificIssues: string[] = [];
  if (htmlContent.includes('<a ') && htmlContent.includes('">') && !htmlContent.match(/<a[^>]*aria-label/i)) {
    specificIssues.push("links without aria-label");
  }
  if (htmlContent.includes('disabled') && !htmlContent.includes('aria-disabled')) {
    specificIssues.push("disabled without aria-disabled");
  }
  
  const allIssues = [...issues, ...specificIssues];
  
  return allIssues.length > 0 
    ? `Accessibility issues: ${allIssues.join(", ")}. ARIA present: ${hasAria}, roles: ${hasRoles}, aria-label: ${!!hasAriaLabel}, aria-labelledby: ${!!hasAriaLabelledby}, aria-describedby: ${!!hasAriaDescribedby}, aria-hidden: ${!!hasAriaHidden}, aria-required: ${!!hasAriaRequired}`
    : `Accessibilty OK. Has ARIA: ${hasAria}, roles: ${hasRoles}, aria-label: ${!!hasAriaLabel}, headings: ${hasHeadings ? "yes" : "no"}, buttons: ${hasButtons ? "yes" : "no"}, labels: ${!!hasLabels}.`;
}