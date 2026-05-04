export async function fetchUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { 
      headers: { "User-Agent": "Mozilla/5.0 Agent-Readiness-Checker" },
      redirect: "follow"
    });
    if (res.ok) return await res.text();
    console.log(`[fetchUrl] ${url} returned ${res.status}`);
    return null;
  } catch (err) {
    console.error(`[fetchUrl] Error fetching ${url}:`, err);
    return null;
  }
}