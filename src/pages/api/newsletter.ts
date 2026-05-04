import type { APIContext } from "astro";

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
      ? (body as Record<string, unknown>).lang as string
      : "en";

  console.log(`[Newsletter] Processing subscription for: ${email}, lang: ${lang}`);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.log(`[Newsletter] Invalid email: ${email}`);
    return new Response(JSON.stringify({ error: "Invalid email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = import.meta.env.BREVO_API_KEY;
  const listId = import.meta.env.BREVO_LIST_ID;

  console.log(`[Newsletter] Brevo config - apiKey: ${!!apiKey}, listId: ${listId || 'none'}`);

  if (!apiKey) {
    console.log(`[Newsletter] Missing Brevo API key`);
    return new Response(
      JSON.stringify({ error: "Newsletter not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // Create or update contact in Brevo (with list assignment if configured)
  console.log(`[Newsletter] Creating/updating Brevo contact for: ${email}`);
  const contactData: { email: string; lang: string; listIds?: number[] } = { email, lang };

  if (listId) {
    contactData.listIds = [parseInt(listId)];
    console.log(`[Newsletter] Will assign contact to Brevo list: ${listId}`);
  }

  const contactRes = await fetch(
    "https://api.brevo.com/v3/contacts",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(contactData),
    },
  );

  console.log(`[Newsletter] Brevo contact creation response: ${contactRes.status} ${contactRes.statusText}`);

  // 201 = created, 204 = updated (contact exists)
  if (!contactRes.ok) {
    const err = await contactRes.text();
    console.error(`[Newsletter] Brevo contact creation failed (${contactRes.status}):`, err);
    return new Response(JSON.stringify({ error: "Subscription failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`[Newsletter] Brevo contact created/updated successfully${listId ? ` and assigned to list ${listId}` : ''}`);

  console.log(`[Newsletter] Subscription completed successfully for: ${email}`);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "newsletter_subscribed=1; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax",
    },
  });
}


