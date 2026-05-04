import { fetchUrl } from "../utils";

export async function handleAnalyzeAgentSkills(args: unknown, baseUrl: string): Promise<string> {
  const { url: targetUrl } = args as { url?: string };
  const origin = targetUrl ? new URL(targetUrl).origin : baseUrl ? new URL(baseUrl).origin : "";
  const skillsUrl = `${origin}/.agentskills`;
  
  const content = await fetchUrl(skillsUrl);
  if (!content) return `Agent Skills not found at ${skillsUrl}`;
  
  const lower = content.toLowerCase();
  const lines = content.split("\n").filter(l => l.trim());
  
  const checks: string[] = [];
  if (lower.includes("skill") || lower.includes("capability")) checks.push("skills listed");
  if (lower.includes("tool") || lower.includes("function")) checks.push("tools listed");
  if (lower.includes("protocol")) checks.push("protocols listed");
  if (lower.includes("endpoint")) checks.push("endpoints listed");
  if (lower.includes("mcp")) checks.push("MCP listed");
  if (lower.includes("api")) checks.push("APIs listed");
  
  const skillCount = (lower.match(/skill|capability/gi) || []).length;
  const toolCount = (lower.match(/tool|function/gi) || []).length;
  
  checks.push(`skills: ${skillCount}, tools: ${toolCount}, lines: ${lines.length}`);
  
  const status = skillCount > 0 || toolCount > 0 ? "VALID" : "EMPTY";
  
  return `${status} Agent Skills (${content.length} bytes). ${checks.join(", ")}`;
}