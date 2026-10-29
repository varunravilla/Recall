import { expect, test } from "bun:test";
import { createGeminiAnalyzer, exclusionReason, resolvePartialDate, parseAnalysis, PhotoImportError, type PhotoAnalysis } from "../../src/photos/gemini.ts";
export const now = new Date("2026-10-18T16:00:00Z");
export const future: PhotoAnalysis = { actionable: true, caption: "The Late Train concert in Cambridge on November 15, 2026.", kind: "event", summary: "Buy The Late Train tickets", relevantAt: "2026-11-01T10:00:00-05:00", expiresAt: "2026-11-14T23:00:00-05:00", dateConfidence: "explicit", reason: "Ticket sales have not opened yet." };
for (const kind of ["event", "place", "product"] as const) test(`yearless ${kind} is kept even when an inferred month/day fell earlier this year`, () => {
  const raw = { ...future, kind, caption: "October 1 launch", dateYearMissing: true,
    relevantAt: "2026-10-01T10:00:00Z", expiresAt: "2026-10-01T23:00:00Z" };
  const parsed = resolvePartialDate(parseAnalysis(raw), now, "UTC");
  expect(parsed.relevantAt).toBe("2027-10-01T00:00:00.000Z"); expect(parsed.expiresAt).toBe("2027-10-01T23:59:59.000Z");
  expect(parsed.caption).toBe("October 1 launch"); expect(parsed.dateConfidence).toBe("inferred");
  expect(exclusionReason(parsed, now)).toBeNull();
});
test("an explicit past year still expires and missing-year metadata cannot revive unrelated content", () => {
  expect(exclusionReason({ ...future, dateYearMissing: false, expiresAt: "2025-10-01T00:00:00Z" }, now)).toContain("expired");
  expect(exclusionReason({ ...future, dateYearMissing: true, actionable: false, reason: "Private document" }, now)).toBe("Private document");
  expect(() => parseAnalysis({ ...future, dateYearMissing: "true" })).toThrow(PhotoImportError);
});
test("single-image analyzer resolves next occurrence in the user timezone", async () => {
  const fetcher = async (_url: unknown, init?: RequestInit) => {
    const prompt = JSON.parse(String(init?.body)).systemInstruction.parts[0].text;
    expect(prompt).toContain("Do not infer a year");
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ ...future, dateYearMissing: true, relevantAt: "2026-10-01T10:00:00", expiresAt: "2026-10-01T23:00:00" }) }] } }] });
  };
  const result = await createGeminiAnalyzer({ apiKey: "synthetic", fetcher })({ imageData: "aA==", mimeType: "image/png", now, timezone: "America/New_York" });
  expect(result.relevantAt).toBe("2027-10-01T04:00:00.000Z"); expect(result.expiresAt).toBe("2027-10-02T03:59:59.000Z");
  expect(exclusionReason(result, now)).toBeNull();
});
test("filter rejects expired, irrelevant, uncertain, missing, invalid, past, and incoherent dates", () => {
  expect(exclusionReason(future, now)).toBeNull();
  for (const patch of [
    { actionable: false }, { dateConfidence: "uncertain" }, { caption: " " }, { relevantAt: null },
    { relevantAt: "2026-01-01T10:00:00Z" }, { relevantAt: "2026-11-01T10:00:00" },
    { expiresAt: "2026-10-01T10:00:00Z" }, { expiresAt: null }, { expiresAt: "garbage" }, { relevantAt: "2026-11-31T10:00:00Z" }, { relevantAt: "2026-11-01T25:00:00Z" },
    { relevantAt: "2026-11-15T10:00:00Z" }, { relevantAt: "2040-01-01T10:00:00Z" },
  ]) expect(exclusionReason({ ...future, ...patch } as PhotoAnalysis, now)).toBeString();
  expect(exclusionReason({ ...future, kind: "place", expiresAt: null, dateConfidence: "inferred" }, now)).toBeNull();
  expect(exclusionReason({ ...future, expiresAt: now.toISOString() }, now)).toContain("expired");
});
test("strict response parser refuses malformed or unsupported AI output", () => {
  for (const value of [null, {}, { ...future, kind: "note" }, { ...future, actionable: "true" }, { ...future, summary: "x".repeat(241) }, { ...future, expiresAt: undefined }])
    expect(() => parseAnalysis(value)).toThrow(PhotoImportError);
});
test("Gemini receives image, server time, timezone, structured schema, and a server-only key", async () => {
  let captured: RequestInit | undefined;
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    expect(String(input)).toContain("gemini-3.5-flash-lite:generateContent"); captured = init;
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ ...future, relevantAt: "2026-11-01T10:00:00", expiresAt: "2026-11-14T23:00:00" }) }] } }] });
  });
  expect(await createGeminiAnalyzer({ apiKey: "test-key", fetcher })({ imageData: "aGVsbG8=", mimeType: "image/png", now, timezone: "America/New_York" })).toEqual({ ...future, relevantAt: "2026-11-01T15:00:00.000Z", expiresAt: "2026-11-15T04:00:00.000Z" });
  expect((captured?.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
  const body = JSON.parse(String(captured?.body));
  expect(body.systemInstruction.parts[0].text).toContain(now.toISOString());
  expect(body.systemInstruction.parts[0].text).toContain("America/New_York");
  expect(body.systemInstruction.parts[0].text).toContain("Explicit past years must not roll forward");
  expect(body.contents[0].parts[0].inlineData).toEqual({ mimeType: "image/png", data: "aGVsbG8=" });
  expect(String(captured?.body)).not.toContain("test-key");
});
test("provider errors never expose key or raw response, and quota errors are retryable", async () => {
  const input = { imageData: "aA==", mimeType: "image/png", now, timezone: "UTC" };
  for (const status of [403, 429, 500]) {
    const fetcher = (async () => new Response("sensitive-provider-details", { status, headers: { "Retry-After": "90" } }));
    try { await createGeminiAnalyzer({ apiKey: "secret-value", fetcher })(input); throw new Error("Expected refusal"); }
    catch (error) {
      expect(error).toBeInstanceOf(PhotoImportError);
      expect(String(error)).not.toContain("secret-value"); expect(String(error)).not.toContain("sensitive-provider-details");
      if (status === 429) expect((error as PhotoImportError).retryAfter).toBe(90);
    }
  }
  for (const body of [{ candidates: [] }, { candidates: [{ finishReason: "MAX_TOKENS" }] }, { candidates: [{ finishReason: "STOP", content: { parts: [{ text: "not json" }] } }] }]) {
    const fetcher = (async () => Response.json(body));
    await expect(createGeminiAnalyzer({ apiKey: "test", fetcher })(input)).rejects.toBeInstanceOf(PhotoImportError);
  }
});

 test("undated useful finds are accepted without invented dates, expired items still skip", () => {
  for (const kind of ["event", "product", "place"] as const) {
    const found = { ...future, kind, relevantAt: null, expiresAt: null, dateConfidence: "uncertain" as const };
    expect(exclusionReason(found, now)).toBeNull();
    expect(exclusionReason({ ...found, expiresAt: "2020-01-01T00:00:00Z" }, now)).toContain("expired");
    expect(exclusionReason({ ...found, actionable: false }, now)).toBeString();
  }
});

test("bad supplied wall times never turn into accepted undated finds", async () => {
  for (const times of [
    { relevantAt: "nonsense", expiresAt: null },
    { relevantAt: null, expiresAt: "2026-11-01T01:30:00" },
    { relevantAt: "2027-03-14T02:30:00", expiresAt: null },
  ]) {
    const fetcher = async () => Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ ...future, ...times }) }] } }] });
    const analyze = createGeminiAnalyzer({ apiKey: "test", fetcher });
    await expect(analyze({ imageData: "aA==", mimeType: "image/png", now, timezone: "America/New_York" })).rejects.toBeInstanceOf(PhotoImportError);
  }
});

test("multi-image request uses explicit ids and parses reversed independent results", async () => {
  const { createGeminiBatchAnalyzer } = await import("../../src/photos/gemini.ts");
  let captured: any;
  const analyze = createGeminiBatchAnalyzer({ apiKey: "test-key", fetcher: async (_, init) => {
    captured = JSON.parse(String(init?.body));
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ results: ["b", "a"].map(id => ({ ...future, id, caption: id, relevantAt: null, expiresAt: null })) }) }] } }] });
  } });
  const results = await analyze({ images: [{ id: "a", mimeType: "image/png", imageData: "aA==" }, { id: "b", mimeType: "image/png", imageData: "aQ==" }], now, timezone: "UTC" });
  expect(results.map(r => [r.id, r.analysis.caption])).toEqual([["b", "b"], ["a", "a"]]);
  expect(captured.contents[0].parts.map((p: any) => p.text ?? p.inlineData.data)).toEqual(["Image id: a", "aA==", "Image id: b", "aQ=="]);
  expect(captured.generationConfig.responseSchema.properties.results.items.properties.id).toBeDefined();
});
test("missing, duplicate, foreign ids and malformed analysis never match to the wrong image", async () => {
  const { parseBatch } = await import("../../src/photos/gemini.ts");
  for (const results of [[], [{ ...future, id: "a" }], [{ ...future, id: "a" }, { ...future, id: "a" }], [{ ...future, id: "a" }, { ...future, id: "foreign" }], [{ ...future, id: "a" }, { id: "b" }]])
    expect(() => parseBatch({ results }, ["a", "b"])).toThrow(PhotoImportError);
});
test("provider retry hints support RetryInfo, not just numeric headers", async () => {
  const analyze = createGeminiAnalyzer({ apiKey: "test", fetcher: async () => Response.json({ error: { details: [{ retryDelay: "12.5s" }] } }, { status: 429 }) });
  try { await analyze({ imageData: "aA==", mimeType: "image/png", now, timezone: "UTC" }); throw new Error("Expected quota refusal"); }
  catch (error) { expect(error).toBeInstanceOf(PhotoImportError); expect((error as PhotoImportError).retryAfter).toBe(13); }
});

test("provider supports ten independent photos and refuses an eleventh before sending", async () => {
  const { createGeminiBatchAnalyzer } = await import("../../src/photos/gemini.ts");
  let calls = 0;
  const analyze = createGeminiBatchAnalyzer({ apiKey: "test", fetcher: async (_, init) => {
    calls++;
    const body = JSON.parse(String(init?.body));
    expect(body.contents[0].parts.filter((p: any) => p.inlineData)).toHaveLength(10);
    return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ results: Array.from({ length: 10 }, (_, i) => ({ ...future, id: String(i), relevantAt: null, expiresAt: null })) }) }] } }] });
  } });
  const images = Array.from({ length: 10 }, (_, i) => ({ id: String(i), imageData: "aA==", mimeType: "image/png" }));
  expect(await analyze({ images, now, timezone: "UTC" })).toHaveLength(10);
  await expect(analyze({ images: [...images, { ...images[0]!, id: "extra" }], now, timezone: "UTC" })).rejects.toBeInstanceOf(PhotoImportError);
  expect(calls).toBe(1);
});

for (const [label, date, expected] of [
  ["Halloween offers", { month: 10, day: 31, year: null }, "2026-10-31T04:00:00.000Z"],
  ["November food offers", { month: 11, day: 16, year: null }, "2026-11-16T05:00:00.000Z"],
  ["month and year", { month: 11, day: null, year: 2026 }, "2026-11-01T04:00:00.000Z"],
  ["current month", { month: 10, day: null, year: 2026 }, "2026-10-29T03:11:00.000Z"],
  ["past month without year", { month: 9, day: null, year: null }, "2027-09-01T04:00:00.000Z"],
  ["leap day", { month: 2, day: 29, year: null }, "2028-02-29T05:00:00.000Z"],
] as const) test(`partial date: ${label}`, () => {
  const clock = new Date("2026-10-29T03:10:00Z");
  const result = resolvePartialDate({ ...future, visibleDate: date, dateYearMissing: date.year === null }, clock, "America/New_York");
  expect(result.relevantAt).toBe(expected);
  expect(result.dateConfidence).toBe("inferred");
  expect(exclusionReason(result, clock)).toBeNull();
});
test("explicit expired months are not rolled forward; invalid source dates are rejected", () => {
  expect(resolvePartialDate({ ...future, visibleDate: { month: 9, day: null, year: 2026 } }, now, "UTC").actionable).toBe(false);
  expect(() => parseAnalysis({ ...future, visibleDate: { month: 2, day: 30, year: null } })).toThrow(PhotoImportError);
});
