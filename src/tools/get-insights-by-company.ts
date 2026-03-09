import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThredApiClient } from "../api-client.js";
import { formatTranscript, formatCustomerSummary } from "../utils/formatters.js";

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

        const customerSections = data.results.map((customer) => {
          const label = customer.name ?? customer.email ?? "Unknown";
          const header = `### ${label}`;
          const summary = formatCustomerSummary(customer);
          const hasTranscript =
            customer.conversation && customer.conversation.length > 0;
          const transcript = hasTranscript
            ? `\n\n#### Transcript\n\n${formatTranscript(customer.conversation!)}`
            : "";
          return `${header}\n\n${summary}${transcript}`;
        });

        return {
          content: [
            {
              type: "text" as const,
              text: `## Company: ${data.company}\n\n**Total conversations:** ${data.results.length}\n\n---\n\n${customerSections.join("\n\n---\n\n")}`,
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
