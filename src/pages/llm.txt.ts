import type { APIContext } from "astro";

export async function GET({ request }: APIContext) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const llmsUrl = new URL("/llms.txt", baseUrl).toString();

  return new Response(null, {
    status: 301,
    headers: {
      Location: llmsUrl,
    },
  });
}
