import { ConversationMessage, CustomerChatResponse } from "../api-client.js";

export function formatTranscript(conversation: ConversationMessage[]): string {
  if (conversation.length === 0) return "No conversation messages found.";

  const hasTimestamps = conversation.some((m) => m.createdAt);
  if (!hasTimestamps) {
    return conversation
      .map((msg) => {
        const label = msg.role === "user" ? "User" : "Assistant";
        return `${label}:\n${msg.content}`;
      })
      .join("\n\n---\n\n");
  }

  const dayMap = new Map<string, { label: string; messages: ConversationMessage[] }>();

  for (const msg of conversation) {
    const ts = msg.createdAt ?? Date.now();
    const d = new Date(ts);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

    if (!dayMap.has(key)) {
      const label = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(d);
      dayMap.set(key, { label, messages: [] });
    }
    dayMap.get(key)!.messages.push(msg);
  }

  return Array.from(dayMap.values())
    .map((group) => {
      const msgs = group.messages
        .map((msg) => {
          const role = msg.role === "user" ? "User" : "Assistant";
          const time = msg.createdAt
            ? new Date(msg.createdAt).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
              })
            : "";
          const prefix = time ? `${role} (${time})` : role;
          return `${prefix}:\n${msg.content}`;
        })
        .join("\n\n---\n\n");
      return `**${group.label}**\n\n${msgs}`;
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
    const priorityLabel = (p: number) =>
      p >= 0.7 ? "high" : p >= 0.4 ? "medium" : "low";
    if (mainConcerns.length > 0) {
      lines.push(
        `\n**Main Concerns:**\n${mainConcerns.map((c) => `- ${c.signal} (${priorityLabel(c.priority)} priority)`).join("\n")}`
      );
    }
    if (buyingSignals.length > 0) {
      lines.push(
        `\n**Buying Signals:**\n${buyingSignals.map((s) => `- ${s.signal} (${priorityLabel(s.priority)} priority)`).join("\n")}`
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

const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT Search",
  gemini: "Gemini Search",
  pplx: "Perplexity Search",
  claude: "Claude Search",
};

export function platformLabel(platform?: string): string {
  return PLATFORM_LABELS[platform || "chatgpt"] || `${platform} Search`;
}

export interface ConversationEntry {
  label: string;
  customer: CustomerChatResponse;
}

/**
 * Flatten conversations into a list of entries labeled
 * "[Platform] Search on [Date]", sorted by most recent turn first.
 * Matches the frontend's AI Search History flat list.
 */
export function flattenConversations(
  conversations: CustomerChatResponse[]
): ConversationEntry[] {
  return conversations
    .map((conv) => {
      const ts = conv.createdAt ?? Date.now();
      const dateLabel = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(new Date(ts));

      const latestTurn = Math.max(
        ...(conv.conversation || []).map((m) => m.createdAt ?? 0),
        ts
      );

      return {
        label: `${platformLabel(conv.platform)} on ${dateLabel}`,
        customer: conv,
        _sortKey: latestTurn,
      };
    })
    .sort((a, b) => b._sortKey - a._sortKey)
    .map(({ label, customer }) => ({ label, customer }));
}
