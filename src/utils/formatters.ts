import { ConversationMessage, CustomerChatResponse } from "../api-client.js";

export function formatTranscript(conversation: ConversationMessage[]): string {
  if (conversation.length === 0) return "No conversation messages found.";

  return conversation
    .map((msg) => {
      const label = msg.role === "user" ? "User" : "Assistant";
      return `${label}:\n${msg.content}`;
    })
    .join("\n\n---\n\n");
}

export function formatCustomerSummary(data: CustomerChatResponse): string {
  const lines: string[] = [];

  if (data.name) lines.push(`**Name:** ${data.name}`);
  if (data.email) lines.push(`**Email:** ${data.email}`);
  if (data.company) lines.push(`**Company:** ${data.company}`);
  if (data.platform) lines.push(`**Platform:** ${data.platform}`);
  lines.push(`**Status:** ${data.status}`);

  if (data.progress !== undefined) {
    lines.push(`**Progress:** ${data.progress}%`);
  }
  if (data.link) {
    lines.push(`**Link:** ${data.link}`);
  }
  if (data.summary) {
    lines.push(`\n**Summary:**\n${data.summary}`);
  }
  if (data.productsDiscussed && data.productsDiscussed.length > 0) {
    lines.push(
      `\n**Products Discussed:**\n${data.productsDiscussed.map((p) => `- ${p}`).join("\n")}`
    );
  }
  if (data.suggestions && data.suggestions.length > 0) {
    lines.push(
      `\n**Suggestions:**\n${data.suggestions.map((s) => `- ${s}`).join("\n")}`
    );
  }
  if (data.insights) {
    const { mainConcerns, buyingSignals, competitorsConsidered } =
      data.insights;
    if (mainConcerns.length > 0) {
      lines.push(
        `\n**Main Concerns:**\n${mainConcerns.map((c) => `- ${c.signal} (priority ${c.priority})`).join("\n")}`
      );
    }
    if (buyingSignals.length > 0) {
      lines.push(
        `\n**Buying Signals:**\n${buyingSignals.map((s) => `- ${s.signal} (priority ${s.priority})`).join("\n")}`
      );
    }
    if (competitorsConsidered.length > 0) {
      lines.push(
        `\n**Competitors Considered:**\n${competitorsConsidered.map((c) => `- ${c.signal}`).join("\n")}`
      );
    }
  }

  return lines.join("\n");
}
