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
  const contactData: {
    email: string;
    attributes: { LANGUAGE: string };
    updateEnabled: boolean;
    listIds?: number[];
  } = {
    email,
    attributes: { LANGUAGE: lang },
    updateEnabled: true,
  };

  if (!listId) {
    console.warn(`[Newsletter] BREVO_LIST_ID not set — contact will be created without list assignment`);
  } else {
    const parsedListId = parseInt(listId);
    if (isNaN(parsedListId)) {
      console.error(`[Newsletter] BREVO_LIST_ID="${listId}" is not a valid number — contact will be created without list assignment`);
    } else {
      contactData.listIds = [parsedListId];
      console.log(`[Newsletter] Will assign contact to Brevo list: ${parsedListId}`);
    }
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

  const responseBody = await contactRes.text();
  console.log(`[Newsletter] Brevo response: ${contactRes.status} ${contactRes.statusText} — ${responseBody}`);

  // 201 = created, 204 = updated (contact exists)
  if (!contactRes.ok) {
    console.error(`[Newsletter] Brevo contact creation failed (${contactRes.status}):`, responseBody);
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


