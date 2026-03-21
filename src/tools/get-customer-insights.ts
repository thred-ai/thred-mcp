import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThredApiClient } from "../api-client.js";
import { formatConversationsResponse } from "../utils/formatters.js";

export function registerGetCustomerInsights(
  server: McpServer,
  apiClient: ThredApiClient
) {
  server.tool(
    "get_customer_insights",
    "Retrieve insights, buying signals, concerns, and competitors for a Thred customer. Lookup by email or customer ID.",
    {
      email: z
        .string()
        .email()
        .optional()
        .describe("Customer email address"),
      customerId: z
        .string()
        .min(1)
        .optional()
        .describe("Thred customer ID"),
    },
    async ({ email, customerId }) => {
      try {
        if (!email && !customerId) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Please provide either an email or customerId.",
              },
            ],
            isError: true,
          };
        }

        const data = email
          ? await apiClient.getConversationsByEmail(email)
          : await apiClient.getConversationsById(customerId!);

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
