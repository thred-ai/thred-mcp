import * as Sentry from "@sentry/cloudflare";
import { Hono } from "hono";
import type { Bindings } from "./types/env.js";

export { McpSession } from "./durable-objects/mcp-session.js";

type Env = { Bindings: Bindings };

const app = new Hono<Env>();

function extractApiKey(
  authHeader: string | undefined,
  url: string
): string | undefined {
  if (authHeader?.startsWith("Bearer ")) return authHeader.substring(7);
  const parsed = new URL(url);
  return parsed.searchParams.get("apiKey") ?? undefined;
}

app.all("/v1", async (c) => {
  const apiKey = extractApiKey(
    c.req.header("authorization") ?? undefined,
    c.req.url
  );

  if (!apiKey) {
    return c.json(
      {
        error: "Authorization required",
        message: "Pass your Thred API key as: Authorization: Bearer <key>",
      },
      401
    );
  }

  const id = c.env.MCP_SESSION.idFromName(apiKey);
  const stub = c.env.MCP_SESSION.get(id);

  return stub.fetch(c.req.raw);
});

app.get("/health", (c) => {
  return c.json({ status: "ok", transport: "http" });
});

app.get("/", (c) => {
  return c.json({
    service: "Thred MCP Server",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/health",
      mcp: "POST /v1",
    },
  });
});

app.notFound((c) => {
  return c.json(
    {
      error: "Not found",
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
    404
  );
});

export default Sentry.withSentry(
  (env: Bindings) => ({
    dsn: "https://a4db5264ff0594adbc1ee0d6c0fe926a@o4511067975712768.ingest.us.sentry.io/4511078437093376",
    sendDefaultPii: true,
  }),
  app as unknown as ExportedHandler<Bindings>
);
