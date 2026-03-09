import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ThredApiClient } from "../api-client.js";

export function registerCheckBackendHealth(
  server: McpServer,
  apiClient: ThredApiClient
) {
  server.tool(
    "check_backend_health",
    "Check whether the Thred backend service is reachable and healthy.",
    {},
    async () => {
      try {
        const result = await apiClient.healthCheck();
        return {
          content: [
            {
              type: "text" as const,
              text: `Backend is healthy. Status: ${result.status}`,
            },
          ],
        };
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Backend health check failed: ${message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
