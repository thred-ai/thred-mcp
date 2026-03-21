import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThredApiClient } from "../api-client.js";
import { formatConversationsResponse } from "../utils/formatters.js";

export function registerGetTranscriptById(
  server: McpServer,
  apiClient: ThredApiClient
) {
  server.tool(
    "get_transcript_by_id",
    "Retrieve all conversations for a customer by their customer ID. Returns conversations grouped by platform and date with insights and queries.",
    {
      customerId: z
        .string()
        .min(1)
        .describe("Thred customer ID"),
    },
    async ({ customerId }) => {
      try {
        const data = await apiClient.getConversationsById(customerId);

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
