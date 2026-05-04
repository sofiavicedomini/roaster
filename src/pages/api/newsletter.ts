import type { APIContext } from "astro";
import { subscribe } from "@/lib/newsletter";

export async function POST({ request }: APIContext) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const email =
    typeof (body as Record<string, unknown>).email === "string"
      ? ((body as Record<string, unknown>).email as string).trim().toLowerCase()
      : "";
  const lang =
    typeof (body as Record<string, unknown>).lang === "string"
      ? ((body as Record<string, unknown>).lang as string)
      : "en";

  console.log(`[Newsletter] Processing subscription for: ${email}, lang: ${lang}`);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log(`[Newsletter] Invalid email: ${email}`);
    return new Response(JSON.stringify({ error: "Invalid email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await subscribe(email, lang);
    console.log(`[Newsletter] Subscription completed successfully for: ${email}`);
  } catch (e) {
    console.error("[Newsletter] Subscription failed:", e);
    return new Response(JSON.stringify({ error: "Subscription failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "newsletter_subscribed=1; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax",
    },
  });
}
