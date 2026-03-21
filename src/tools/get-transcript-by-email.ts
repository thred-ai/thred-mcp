import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThredApiClient } from "../api-client.js";
import { formatConversationsResponse } from "../utils/formatters.js";

export function registerGetTranscriptByEmail(
  server: McpServer,
  apiClient: ThredApiClient
) {
  server.tool(
    "get_transcript_by_email",
    "Retrieve all conversations for a customer by their email address. Returns conversations grouped by platform and date with insights and queries.",
    {
      email: z
        .string()
        .email()
        .describe("Customer email address"),
    },
    async ({ email }) => {
      try {
        const data = await apiClient.getConversationsByEmail(email);

        return {
          content: [
            {
              type: "text" as const,
              text: formatConversationsResponse(data),
            },
          ],
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
