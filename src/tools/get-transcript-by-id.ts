import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThredApiClient } from "../api-client.js";
import { formatTranscript, formatCustomerSummary } from "../utils/formatters.js";

export function registerGetTranscriptById(
  server: McpServer,
  apiClient: ThredApiClient
) {
  server.tool(
    "get_transcript_by_id",
    "Retrieve the conversation transcript for a Thred customer by their customer ID. Returns the full conversation in chronological order with user queries and assistant responses.",
    { customerId: z.string().min(1).describe("Thred customer ID") },
    async ({ customerId }) => {
      try {
        const data = await apiClient.getCustomerById(customerId);

        if (!data.conversation || data.conversation.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No conversation transcript found for customer ${customerId}. Chat status: ${data.status}`,
              },
            ],
          };
        }

        const transcript = formatTranscript(data.conversation);
        const summary = formatCustomerSummary(data);

        return {
          content: [
            {
              type: "text" as const,
              text: `## Conversation Transcript for Customer ${customerId}\n\n${summary}\n\n---\n\n## Transcript\n\n${transcript}`,
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
