import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThredApiClient } from "../api-client.js";
import { formatTranscript, formatCustomerSummary, flattenConversations } from "../utils/formatters.js";

export function registerGetInsightsByCompany(
  server: McpServer,
  apiClient: ThredApiClient
) {
  server.tool(
    "get_insights_by_company",
    "Retrieve all customer conversations and insights for a given company. Uses fuzzy company name matching. Returns a summary of each customer's conversation status, insights, and key signals.",
    {
      companyName: z
        .string()
        .min(1)
        .describe("Company name to search for (supports fuzzy matching)"),
    },
    async ({ companyName }) => {
      try {
        const data = await apiClient.getCustomersByCompany(companyName);

        if (!data.results || data.results.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No customer conversations found for company "${data.company}".`,
              },
            ],
          };
        }

        const entries = flattenConversations(data.results);

        const sections = entries.map((entry) => {
          const name = entry.customer.name ?? entry.customer.email ?? "Unknown";
          const summary = formatCustomerSummary(entry.customer);
          const hasTranscript =
            entry.customer.conversation && entry.customer.conversation.length > 0;
          const transcript = hasTranscript
            ? `\n\n#### Transcript\n\n${formatTranscript(entry.customer.conversation!)}`
            : "";
          return `### ${entry.label}\n**${name}**\n\n${summary}${transcript}`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `## Company: ${data.company}\n\n**Total conversations:** ${data.results.length}\n\n---\n\n${sections.join("\n\n---\n\n")}`,
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
