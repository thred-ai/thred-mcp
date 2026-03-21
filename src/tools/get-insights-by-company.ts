import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThredApiClient } from "../api-client.js";
import { formatConversationEntry } from "../utils/formatters.js";

export function registerGetInsightsByCompany(
  server: McpServer,
  apiClient: ThredApiClient
) {
  server.tool(
    "get_insights_by_company",
    "Retrieve all customer conversations and insights for a given company. Uses fuzzy company name matching. Returns conversations grouped by platform and date.",
    {
      companyName: z
        .string()
        .min(1)
        .describe("Company name to search for (supports fuzzy matching)"),
    },
    async ({ companyName }) => {
      try {
        const data = await apiClient.getConversationsByCompany(companyName);

        if (!data.customers || data.customers.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No conversations found for company "${data.company}".`,
              },
            ],
          };
        }

        const totalConvos = data.customers.reduce(
          (sum, c) => sum + c.conversations.length,
          0
        );

        const allConvos = data.customers.flatMap((c) =>
          c.conversations.map((conv) => ({
            conv,
            customerName: c.customer.name,
          }))
        );

        const sections = allConvos.map(({ conv, customerName }) =>
          formatConversationEntry(conv, customerName)
        );

        return {
          content: [
            {
              type: "text" as const,
              text: `## ${data.company}\n\n**${totalConvos} conversation${totalConvos !== 1 ? "s" : ""}** across ${data.customers.length} customer${data.customers.length !== 1 ? "s" : ""}\n\n---\n\n${sections.join("\n\n---\n\n")}`,
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
