import { FormattedConversation, ConversationsResponse } from "../api-client.js";

export function formatConversationEntry(conv: FormattedConversation, customerName?: string): string {
  const lines: string[] = [];

  lines.push(`### ${conv.label}`);
  if (customerName) {
    lines.push(`**${customerName}**`);
  }

  if (conv.summary) {
    lines.push(`\n${conv.summary}`);
  }

  const { buyingSignals, mainConcerns, competitorsConsidered } = conv.insights;

  if (buyingSignals.length > 0) {
    lines.push(`\n**Buying Signals:**`);
    for (const s of buyingSignals) {
      lines.push(`- ${s.signal} (${s.priority} priority)`);
    }
  }

  if (mainConcerns.length > 0) {
    lines.push(`\n**Concerns:**`);
    for (const s of mainConcerns) {
      lines.push(`- ${s.signal} (${s.priority} priority)`);
    }
  }

  if (competitorsConsidered.length > 0) {
    lines.push(`\n**Competitors Discussed:**`);
    for (const s of competitorsConsidered) {
      lines.push(`- ${s.signal}`);
    }
  }

  if (conv.queries.length > 0) {
    lines.push(`\n**Queries:**`);
    for (const q of conv.queries) {
      lines.push(`- ${q.time}: "${q.query}"`);
    }
  }

  lines.push(`\n[View transcript](${conv.link})`);

  return lines.join("\n");
}

export function formatConversationsResponse(data: ConversationsResponse): string {
  if (data.conversations.length === 0) {
    return `No completed conversations found for ${data.customer.name}.`;
  }

  const sections = data.conversations.map((conv) =>
    formatConversationEntry(conv)
  );

  const header = [
    `**${data.customer.name}**`,
    data.customer.company ? `Company: ${data.customer.company}` : null,
    `Email: ${data.customer.email}`,
  ].filter(Boolean).join(" | ");

  return `${header}\n\n---\n\n${sections.join("\n\n---\n\n")}`;
}
