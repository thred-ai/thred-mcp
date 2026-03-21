import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThredApiClient } from "../api-client.js";
import { formatConversationEntry } from "../utils/formatters.js";

export function registerGetRecentCustomers(
  server: McpServer,
  apiClient: ThredApiClient
) {
  server.tool(
    "get_recent_customers",
    "Retrieve recent customer conversations, optionally filtered by AI platforms. Results are formatted as a flat list of conversations sorted by most recent activity, each labeled with the platform and date.",
    {
      platforms: z
        .array(z.string())
        .optional()
        .describe(
          "Filter by AI platform(s) (e.g. chatgpt, claude, gemini, pplx). Only include if the user asks about specific platforms."
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe(
          "Number of customers to return (default 3, max 50)."
        ),
    },
    async ({ platforms, limit }) => {
      try {
        const results = await apiClient.getRecentConversations(limit, platforms);

        if (!results || results.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No recent conversations found.",
              },
            ],
          };
        }

        const allConvos = results.flatMap((r) =>
          r.conversations.map((conv) => ({
            conv,
            customerName: r.customer.name,
            company: r.customer.company,
          }))
        );

        const sections = allConvos.map(({ conv, customerName, company }) => {
          const name = company ? `${customerName} (${company})` : customerName;
          return formatConversationEntry(conv, name);
        });

        return {
          content: [
            {
              type: "text" as const,
              text: sections.join("\n\n---\n\n"),
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
