import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ThredApiClient } from "../api-client.js";
import { formatCustomerSummary } from "../utils/formatters.js";

export function registerGetCustomerInsights(
  server: McpServer,
  apiClient: ThredApiClient
) {
  server.tool(
    "get_customer_insights",
    "Retrieve insights, buying signals, concerns, and suggestions for a Thred customer. Lookup by email or customer ID.",
    {
      email: z
        .string()
        .email()
        .optional()
        .describe("Customer email address (provide email or customerId)"),
      customerId: z
        .string()
        .optional()
        .describe("Thred customer ID (provide email or customerId)"),
    },
    async ({ email, customerId }) => {
      if (!email && !customerId) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Provide either an email or customerId.",
            },
          ],
          isError: true,
        };
      }

      try {
        const data = email
          ? await apiClient.getCustomerByEmail(email)
          : await apiClient.getCustomerById(customerId!);

        const label = email ?? customerId;
        const summary = formatCustomerSummary(data);

        return {
          content: [
            {
              type: "text" as const,
              text: `## Customer Insights for ${label}\n\n${summary}`,
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
