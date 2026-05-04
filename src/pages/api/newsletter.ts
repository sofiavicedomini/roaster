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

  // 1. Create or update contact in Brevo
  console.log(`[Newsletter] Creating/updating Brevo contact for: ${email}`);
  const contactRes = await fetch(
    "https://api.brevo.com/v3/contacts",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({ email, lang }),
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

  console.log(`[Newsletter] Brevo contact created/updated successfully`);

  // 2. If a list ID is configured, add the contact to it
  if (listId) {
    console.log(`[Newsletter] Adding contact to Brevo list: ${listId}`);
    const listRes = await fetch(`https://api.brevo.com/v3/contacts/lists/${listId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        contact: { email },
        optInStatus: "subscribed"
      }),
    });

    console.log(`[Newsletter] Brevo list addition response: ${listRes.status} ${listRes.statusText}`);
    if (!listRes.ok) {
      const listErr = await listRes.text();
      console.error(`[Newsletter] Failed to add contact to list (${listRes.status}):`, listErr);
    } else {
      console.log(`[Newsletter] Contact successfully added to list`);
    }
  } else {
    console.log(`[Newsletter] No list ID configured, skipping list addition`);
  }

  console.log(`[Newsletter] Subscription completed successfully for: ${email}`);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": "newsletter_subscribed=1; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax",
    },
  });
}


