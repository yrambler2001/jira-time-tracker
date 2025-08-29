import type { Context } from "@netlify/edge-functions";

const matchURL = (url: string) => {
  // const url = "https://jira.abc.me/proxy/ab-cd_ef/rest/api/3/myself";
  const regex = /\/proxy\/([^/]+)(\/rest\/.*)/;
  const match = url.match(regex);

  if (match) {
    const first = match[1]; // "ab-cd_ef"
    const origin = `https://${first}.atlassian.net`;
    const path = match[2]; // "/rest/api/3/myself"
    return new URL(origin + path);
  }
};

export default async (request: Request, context: Context) => {
  const targetUrl = matchURL(request.url);

  // Create a new request to the target URL
  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: "follow",
  });

  // Set the custom User-Agent header
  proxyRequest.headers.set("User-Agent", "XSRF");

  // Fetch the data from the target URL
  const response = await fetch(proxyRequest);

  // Return the response from the target URL
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};