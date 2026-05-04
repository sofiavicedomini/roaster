export interface ExtractedPage {
  title: string;
  description: string;
  canonical: string;
  og: Record<string, string>;
  twitterCard: Record<string, string>;
  jsonLd: string[];
  headings: Array<{ level: number; text: string }>;
  text: string;
  links: Array<{ href: string; text: string }>;
  images: Array<{ src: string; alt: string }>;
  forms: Array<{ action: string; method: string; inputs: string[] }>;
  externalScripts: string[];
  stylesheets: string[];
}

function stripTags(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, "i"));
  return m ? m[1].trim() : "";
}

function innerText(html: string, tag: string): string {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? stripTags(m[1]).substring(0, 200) : "";
}

export function extractPageContent(html: string): ExtractedPage {
  const title = innerText(html, "title");

  const descMatch = html.match(
    /<meta\s[^>]*name\s*=\s*["']description["'][^>]*>/i,
  );
  const description = descMatch ? attr(descMatch[0], "content") : "";

  const canonicalMatch = html.match(
    /<link\s[^>]*rel\s*=\s*["']canonical["'][^>]*>/i,
  );
  const canonical = canonicalMatch ? attr(canonicalMatch[0], "href") : "";

  const og: Record<string, string> = {};
  for (const m of html.matchAll(
    /<meta\s[^>]*property\s*=\s*["'](og:[^"']+)["'][^>]*>/gi,
  )) {
    const key = attr(m[0], "property");
    const val = attr(m[0], "content");
    if (key && val) og[key] = val.substring(0, 300);
  }

  const twitterCard: Record<string, string> = {};
  for (const m of html.matchAll(
    /<meta\s[^>]*name\s*=\s*["'](twitter:[^"']+)["'][^>]*>/gi,
  )) {
    const key = attr(m[0], "name");
    const val = attr(m[0], "content");
    if (key && val) twitterCard[key] = val.substring(0, 300);
  }

  const jsonLd: string[] = [];
  for (const m of html.matchAll(
    /<script\s[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    jsonLd.push(m[1].trim().substring(0, 1000));
  }

  const headings: Array<{ level: number; text: string }> = [];
  for (const m of html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    headings.push({
      level: parseInt(m[1]),
      text: stripTags(m[2]).substring(0, 120),
    });
    if (headings.length >= 20) break;
  }

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  const text = stripTags(bodyHtml).substring(0, 6000);

  const links: Array<{ href: string; text: string }> = [];
  for (const m of html.matchAll(
    /<a\s[^>]*href\s*=\s*["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    links.push({
      href: m[1].substring(0, 200),
      text: stripTags(m[2]).substring(0, 80),
    });
    if (links.length >= 30) break;
  }

  const images: Array<{ src: string; alt: string }> = [];
  for (const m of html.matchAll(/<img\s[^>]*>/gi)) {
    const src = attr(m[0], "src") || attr(m[0], "data-src");
    const alt = attr(m[0], "alt");
    if (src) {
      images.push({ src: src.substring(0, 200), alt: alt.substring(0, 100) });
      if (images.length >= 30) break;
    }
  }

  const forms: Array<{ action: string; method: string; inputs: string[] }> = [];
  for (const m of html.matchAll(/<form([\s\S]*?)<\/form>/gi)) {
    const formTag = m[0].substring(0, 300);
    const action = attr(formTag, "action");
    const method = attr(formTag, "method") || "get";
    const inputs: string[] = [];
    for (const inp of m[0].matchAll(/<input\s[^>]*>/gi)) {
      const name = attr(inp[0], "name") || attr(inp[0], "type") || "input";
      inputs.push(name);
      if (inputs.length >= 10) break;
    }
    forms.push({ action, method, inputs });
    if (forms.length >= 5) break;
  }

  const externalScripts: string[] = [];
  for (const m of html.matchAll(
    /<script\s[^>]*src\s*=\s*["']([^"']+)["'][^>]*>/gi,
  )) {
    externalScripts.push(m[1].substring(0, 200));
    if (externalScripts.length >= 20) break;
  }

  const stylesheets: string[] = [];
  for (const m of html.matchAll(
    /<link\s[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi,
  )) {
    const href = attr(m[0], "href");
    if (href) {
      stylesheets.push(href.substring(0, 200));
      if (stylesheets.length >= 10) break;
    }
  }

  return {
    title,
    description,
    canonical,
    og,
    twitterCard,
    jsonLd,
    headings,
    text,
    links,
    images,
    forms,
    externalScripts,
    stylesheets,
  };
}

export function formatExtractedPage(e: ExtractedPage): string {
  const parts: string[] = [];

  parts.push(`=== PAGE CONTENT ===`);
  parts.push(`Title: ${e.title || "(none)"}`);
  parts.push(`Description: ${e.description || "(none)"}`);
  if (e.canonical) parts.push(`Canonical: ${e.canonical}`);

  if (Object.keys(e.og).length > 0) {
    parts.push(`\n--- Open Graph ---`);
    for (const [k, v] of Object.entries(e.og)) parts.push(`${k}: ${v}`);
  }

  if (Object.keys(e.twitterCard).length > 0) {
    parts.push(`\n--- Twitter Card ---`);
    for (const [k, v] of Object.entries(e.twitterCard))
      parts.push(`${k}: ${v}`);
  }

  if (e.jsonLd.length > 0) {
    parts.push(`\n--- Structured Data (JSON-LD) ---`);
    e.jsonLd.forEach((j, i) => parts.push(`[${i + 1}] ${j}`));
  }

  if (e.headings.length > 0) {
    parts.push(`\n--- Headings ---`);
    e.headings.forEach((h) => parts.push(`H${h.level}: ${h.text}`));
  }

  if (e.text) {
    parts.push(`\n--- Visible Text (first 6000 chars) ---`);
    parts.push(e.text);
  }

  if (e.links.length > 0) {
    parts.push(`\n--- Links (first ${e.links.length}) ---`);
    e.links.forEach((l) => parts.push(`[${l.text}] ${l.href}`));
  }

  if (e.images.length > 0) {
    parts.push(`\n--- Images (first ${e.images.length}) ---`);
    e.images.forEach((img) => parts.push(`src=${img.src} alt="${img.alt}"`));
  }

  if (e.forms.length > 0) {
    parts.push(`\n--- Forms ---`);
    e.forms.forEach((f) =>
      parts.push(
        `action="${f.action}" method="${f.method}" inputs=[${f.inputs.join(", ")}]`,
      ),
    );
  }

  if (e.externalScripts.length > 0) {
    parts.push(`\n--- External Scripts (${e.externalScripts.length}) ---`);
    e.externalScripts.forEach((s) => parts.push(s));
  }

  if (e.stylesheets.length > 0) {
    parts.push(`\n--- Stylesheets (${e.stylesheets.length}) ---`);
    e.stylesheets.forEach((s) => parts.push(s));
  }

  return parts.join("\n");
}
