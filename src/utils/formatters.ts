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

export interface PlatformGroup {
  platform: string;
  conversations: CustomerChatResponse[];
}

export interface DayGroup {
  date: number;
  label: string;
  platforms: PlatformGroup[];
}

const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT Search",
  gemini: "Gemini Search",
  pplx: "Perplexity Search",
  claude: "Claude Search",
};

function platformLabel(platform?: string): string {
  return PLATFORM_LABELS[platform || "chatgpt"] || `${platform} Search`;
}

/**
 * Group conversations by calendar day then by platform within each day.
 * Matches the frontend's AI Search History grouping.
 */
export function groupConversationsByDay(
  conversations: CustomerChatResponse[]
): DayGroup[] {
  const dayMap = new Map<string, { date: number; label: string; platMap: Map<string, CustomerChatResponse[]> }>();

  for (const conv of conversations) {
    const ts = conv.createdAt ?? Date.now();
    const d = new Date(ts);
    const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

    if (!dayMap.has(dayKey)) {
      const date = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const label = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(d);
      dayMap.set(dayKey, { date, label, platMap: new Map() });
    }

    const day = dayMap.get(dayKey)!;
    const plat = conv.platform || "chatgpt";
    if (!day.platMap.has(plat)) {
      day.platMap.set(plat, []);
    }
    day.platMap.get(plat)!.push(conv);
  }

  return Array.from(dayMap.values())
    .sort((a, b) => b.date - a.date)
    .map(({ date, label, platMap }) => ({
      date,
      label,
      platforms: Array.from(platMap.entries())
        .sort(([, a], [, b]) => {
          const latestTurn = (convs: CustomerChatResponse[]) =>
            Math.max(...convs.flatMap((c) =>
              (c.conversation || []).map((m) => m.createdAt ?? 0)
            ), 0);
          return latestTurn(b) - latestTurn(a);
        })
        .map(([platform, conversations]) => ({ platform, conversations })),
    }));
}

export { platformLabel };
