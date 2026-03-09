import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ThredApiClient } from "../api-client.js";
import { registerGetTranscriptByEmail } from "./get-transcript-by-email.js";
import { registerGetTranscriptById } from "./get-transcript-by-id.js";
import { registerGetCustomerInsights } from "./get-customer-insights.js";
import { registerGetInsightsByCompany } from "./get-insights-by-company.js";
import { registerGetRecentCustomers } from "./get-recent-customers.js";
import { registerCheckBackendHealth } from "./check-backend-health.js";

export function registerTools(
  server: McpServer,
  apiClient: ThredApiClient
) {
  registerGetTranscriptByEmail(server, apiClient);
  registerGetTranscriptById(server, apiClient);
  registerGetCustomerInsights(server, apiClient);
  registerGetInsightsByCompany(server, apiClient);
  registerGetRecentCustomers(server, apiClient);
  registerCheckBackendHealth(server, apiClient);
}
