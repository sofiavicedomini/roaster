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

  const accessToken = import.meta.env.HUBSPOT_ACCESS_TOKEN;
  const listId = import.meta.env.HUBSPOT_LIST_ID;

  console.log(`[Newsletter] HubSpot config - token: ${!!accessToken}, listId: ${listId || 'none'}`);

  if (!accessToken) {
    console.log(`[Newsletter] Missing HubSpot access token`);
    return new Response(
      JSON.stringify({ error: "Newsletter not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // 1. Create or update contact in HubSpot CRM
  console.log(`[Newsletter] Creating/updating HubSpot contact for: ${email}`);
  const contactRes = await fetch(
    "https://api.hubapi.com/crm/v3/objects/contacts",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ properties: { email, language: lang } }),
    },
  );

  console.log(`[Newsletter] HubSpot contact creation response: ${contactRes.status} ${contactRes.statusText}`);

  // 409 = contact already exists — that's fine
  if (!contactRes.ok && contactRes.status !== 409) {
    const err = await contactRes.text();
    console.error(`[Newsletter] HubSpot contact creation failed (${contactRes.status}):`, err);
    return new Response(JSON.stringify({ error: "Subscription failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`[Newsletter] HubSpot contact created/updated successfully`);

  // 2. If a list ID is configured, add the contact to it
  if (listId) {
    console.log(`[Newsletter] Adding contact to HubSpot list: ${listId}`);
    const vid =
      contactRes.status === 409
        ? await getContactVid(email, accessToken)
        : (await contactRes.json()).id;

    console.log(`[Newsletter] Contact VID: ${vid}`);

    if (vid) {
      const listRes = await fetch(`https://api.hubapi.com/contacts/v1/lists/${listId}/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ vids: [vid] }),
      });

      console.log(`[Newsletter] HubSpot list addition response: ${listRes.status} ${listRes.statusText}`);
      if (!listRes.ok) {
        const listErr = await listRes.text();
        console.error(`[Newsletter] Failed to add contact to list (${listRes.status}):`, listErr);
      } else {
        console.log(`[Newsletter] Contact successfully added to list`);
      }
    } else {
      console.error(`[Newsletter] Could not get contact VID for list addition`);
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

async function getContactVid(
  email: string,
  token: string,
): Promise<string | null> {
  try {
    console.log(`[Newsletter] Getting VID for existing contact: ${email}`);
    const res = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    console.log(`[Newsletter] Get VID response: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      console.error(`[Newsletter] Failed to get contact VID (${res.status})`);
      return null;
    }
    const data = await res.json();
    const vid = data.id ?? null;
    console.log(`[Newsletter] Retrieved VID: ${vid}`);
    return vid;
  } catch (error) {
    console.error(`[Newsletter] Error getting contact VID:`, error);
    return null;
  }
}
