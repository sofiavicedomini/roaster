import { cacheDb } from "@/lib/redis";

export async function subscribe(email: string, locale = "en"): Promise<void> {
  await cacheDb.sadd("newsletter:subscribers", email);

  const apiKey = import.meta.env.BREVO_API_KEY;
  const listId = import.meta.env.BREVO_LIST_ID;

  if (!apiKey) {
    console.warn("[Newsletter] BREVO_API_KEY not set — contact saved to Redis only");
    return;
  }

  const contactData: {
    email: string;
    attributes: { LANGUAGE: string };
    updateEnabled: boolean;
    listIds?: number[];
  } = {
    email,
    attributes: { LANGUAGE: locale },
    updateEnabled: true,
  };

  if (!listId) {
    console.warn("[Newsletter] BREVO_LIST_ID not set — contact will be created without list assignment");
  } else {
    const parsedListId = parseInt(listId);
    if (isNaN(parsedListId)) {
      console.error(`[Newsletter] BREVO_LIST_ID="${listId}" is not a valid number — contact will be created without list assignment`);
    } else {
      contactData.listIds = [parsedListId];
      console.log(`[Newsletter] Will assign contact to Brevo list: ${parsedListId}`);
    }
  }

  const res = await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(contactData),
  });

  const body = await res.text();
  console.log(`[Newsletter] Brevo response: ${res.status} ${res.statusText} — ${body}`);

  if (!res.ok) {
    throw new Error(`Brevo API error ${res.status}: ${body}`);
  }
}
