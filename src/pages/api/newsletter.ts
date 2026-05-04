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

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "Invalid email" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const accessToken = import.meta.env.HUBSPOT_ACCESS_TOKEN;
  const listId = import.meta.env.HUBSPOT_LIST_ID;

  if (!accessToken) {
    return new Response(
      JSON.stringify({ error: "Newsletter not configured" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // 1. Create or update contact in HubSpot CRM
  const contactRes = await fetch(
    "https://api.hubapi.com/crm/v3/objects/contacts",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ properties: { email } }),
    },
  );

  // 409 = contact already exists — that's fine
  if (!contactRes.ok && contactRes.status !== 409) {
    const err = await contactRes.text();
    console.error("[Newsletter] HubSpot contact creation failed:", err);
    return new Response(JSON.stringify({ error: "Subscription failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. If a list ID is configured, add the contact to it
  if (listId) {
    const vid =
      contactRes.status === 409
        ? await getContactVid(email, accessToken)
        : (await contactRes.json()).id;

    if (vid) {
      await fetch(`https://api.hubapi.com/contacts/v1/lists/${listId}/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ vids: [vid] }),
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function getContactVid(
  email: string,
  token: string,
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.id ?? null;
  } catch {
    return null;
  }
}
