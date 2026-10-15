export interface Recognition {
  kind: string;
  summary: string;
  relevantAt?: string;
}

export function recognizeCaption(content: string): Recognition {
  const lower = content.trim().toLowerCase();
  if (/ticket|concert|show|on sale|presale/.test(lower)) {
    return {
      kind: "buy",
      summary: "Buy tickets",
      relevantAt: new Date(Date.now() + 60_000).toISOString(),
    };
  }
  if (/restaurant|reservation|dinner|brunch|caf[eé]/.test(lower)) {
    return { kind: "place", summary: "Try this place" };
  }
  if (/buy|product|\$|price|amazon|shop/.test(lower)) {
    return { kind: "product", summary: "Consider this product" };
  }
  return { kind: "note", summary: "Follow up on this screenshot" };
}
