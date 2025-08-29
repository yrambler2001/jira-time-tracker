import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  // Extract the target URL from the path
  const targetUrl = path.replace('/proxy/', 'https://');

  // Create a new request to the target URL
  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow'
  });

  // Set the custom User-Agent header
  proxyRequest.headers.set("User-Agent", "XSRF");

  // Fetch the data from the target URL
  const response = await fetch(proxyRequest);

  // Return the response from the target URL
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
};