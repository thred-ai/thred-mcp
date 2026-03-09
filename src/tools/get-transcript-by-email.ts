import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThredApiClient } from "../api-client.js";
import { formatTranscript, formatCustomerSummary } from "../utils/formatters.js";

export function registerGetTranscriptByEmail(
  server: McpServer,
  apiClient: ThredApiClient
) {
  server.tool(
    "get_transcript_by_email",
    "Retrieve the conversation transcript for a Thred customer by their email address. Returns the full conversation in chronological order with user queries and assistant responses.",
    { email: z.string().email().describe("Customer email address") },
    async ({ email }) => {
      try {
        const data = await apiClient.getCustomerByEmail(email);

        if (!data.conversation || data.conversation.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No conversation transcript found for ${email}. Chat status: ${data.status}`,
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
              text: `## Conversation Transcript for ${email}\n\n${summary}\n\n---\n\n## Transcript\n\n${transcript}`,
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
