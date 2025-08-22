import type { Context } from "@netlify/edge-functions";

export default async (request: Request, context: Context) => {

  request.headers.set("User-Agent", "XSRF");

  // By returning nothing (or undefined), we pass the modified request
  // on to the next step, which is your redirect rule.
  return;
};