#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { ThredApiClient } from "./api-client.js";
import { registerTools } from "./tools/index.js";

const BASE_URL = process.env.THRED_BASE_URL;
const TRANSPORT = process.env.TRANSPORT ?? "stdio"; // "stdio" | "http"

// In stdio mode, the API key comes from the env var (single user).
// In HTTP mode, each client sends their own key via Authorization header.
const STATIC_API_KEY = process.env.THRED_API_KEY;

if (TRANSPORT === "stdio" && !STATIC_API_KEY) {
  console.error(
    "THRED_API_KEY environment variable is required in stdio mode."
  );
  process.exit(1);
}

// --- Server factory ----------------------------------------------------

function createServer(apiClient: ThredApiClient): McpServer {
  const server = new McpServer({
    name: "thred-mcp",
    version: "1.0.0",
  });

  registerTools(server, apiClient);

  return server;
}

// --- Start -------------------------------------------------------------

async function startStdio() {
  const client = new ThredApiClient(STATIC_API_KEY!, BASE_URL);
  const server = createServer(client);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

async function startHttp() {
  const app = express();
  app.use(express.json());

  const sessions = new Map<
    string,
    { transport: StreamableHTTPServerTransport; server: McpServer }
  >();

  function extractApiKey(req: express.Request): string | undefined {
    const auth = req.headers.authorization;
    if (auth?.startsWith("Bearer ")) return auth.substring(7);
    const queryKey = req.query["apiKey"] as string | undefined;
    if (queryKey) return queryKey;
    return undefined;
  }

  app.post("/v1", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    const apiKey = extractApiKey(req);
    if (!apiKey) {
      res.status(401).json({
        error: "Authorization required",
        message: "Pass your Thred API key as: Authorization: Bearer <key>",
      });
      return;
    }

    const client = new ThredApiClient(apiKey, BASE_URL);
    const server = createServer(client);

    let capturedSessionId: string | undefined;
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => {
        capturedSessionId = randomUUID();
        return capturedSessionId;
      },
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    if (capturedSessionId) {
      sessions.set(capturedSessionId, { transport, server });
    }
  });

  app.get("/v1", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !sessions.has(sessionId)) {
      res.status(400).json({ error: "Invalid or missing session ID" });
      return;
    }
    await sessions.get(sessionId)!.transport.handleRequest(req, res);
  });

  app.delete("/v1", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId)!;
      await session.transport.handleRequest(req, res);
      sessions.delete(sessionId);
    } else {
      res.status(400).json({ error: "Invalid or missing session ID" });
    }
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", transport: "http" });
  });

  const port = parseInt(process.env.PORT ?? "3000", 10);
  app.listen(port, () => {
    console.log(`Thred MCP server (HTTP) listening on port ${port}`);
  });
}

async function main() {
  if (TRANSPORT === "http") {
    await startHttp();
  } else {
    await startStdio();
  }
}

main().catch((error) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});
