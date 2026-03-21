import { DurableObject } from "cloudflare:workers";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { ThredApiClient } from "../api-client.js";
import { registerTools } from "../tools/index.js";
import type { Bindings } from "../types/env.js";

export class McpSession extends DurableObject<Bindings> {
  private sessions = new Map<
    string,
    {
      transport: WebStandardStreamableHTTPServerTransport;
      server: McpServer;
    }
  >();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = request.headers.get("mcp-session-id");

    if (sessionId && this.sessions.has(sessionId)) {
      return this.sessions.get(sessionId)!.transport.handleRequest(request);
    }

    if (sessionId) {
      return Response.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Session not found. Please reinitialize.",
          },
          id: null,
        },
        { status: 404 }
      );
    }

    if (request.method !== "POST") {
      return Response.json(
        { error: "Method not allowed without session" },
        { status: 405 }
      );
    }

    const apiKey = this.extractApiKey(
      request.headers.get("authorization") ?? undefined,
      request.url
    );
    if (!apiKey) {
      return Response.json(
        {
          error: "Authorization required",
          message: "Pass your Thred API key as: Authorization: Bearer <key>",
        },
        { status: 401 }
      );
    }

    const client = new ThredApiClient(apiKey, this.env.THRED_BASE_URL);
    const server = new McpServer({
      name: "thred-mcp",
      version: "1.0.0",
    });
    registerTools(server, client);

    const sessions = this.sessions;
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
      onsessioninitialized: (id) => {
        sessions.set(id, { transport, server });
      },
      onsessionclosed: (id) => {
        sessions.delete(id);
      },
      enableJsonResponse: true,
    });

    await server.connect(transport);
    return transport.handleRequest(request);
  }

  private extractApiKey(
    authHeader: string | undefined,
    url: string
  ): string | undefined {
    if (authHeader?.startsWith("Bearer ")) return authHeader.substring(7);
    const parsed = new URL(url);
    return parsed.searchParams.get("apiKey") ?? undefined;
  }
}
