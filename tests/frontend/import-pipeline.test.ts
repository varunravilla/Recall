import { expect, test } from "bun:test";
import { runImportPipeline } from "../../frontend/src/importPipeline.ts";
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(r => resolve = r); return { promise, resolve }; };

test("prepares one batch ahead during AI and sends batches in order", async () => {
  const firstSend = deferred(); const aheadReady = deferred();
  let prepared = 0; const sent: number[] = [];
  const work = runImportPipeline<number>({
    prepare: async () => { const id = ++prepared; if (id === 2) aheadReady.resolve(); return id <= 3 ? [id] : []; },
    send: async batch => { sent.push(batch[0]!); if (batch[0] === 1) await firstSend.promise; },
    wait: async () => {}, stopped: () => false, restore: () => {},
  });
  await aheadReady.promise;
  expect(prepared).toBe(2); expect(sent).toEqual([1]);
  firstSend.resolve(); await work;
  expect(sent).toEqual([1, 2, 3]);
});
test("pause finishes the active request and restores prefetched files", async () => {
  let stop = false; let cursor = 0;
  const aheadReady = deferred(); const finish = deferred();
  const states = new Map<number, string>();
  const work = runImportPipeline<number>({
    prepare: async () => { const id = ++cursor; states.set(id, "prepared"); if (id === 2) aheadReady.resolve(); return [id]; },
    send: async batch => { await finish.promise; states.set(batch[0]!, "saved"); },
    wait: async () => {}, stopped: () => stop,
    restore: batch => { for (const id of batch) if (states.get(id) === "prepared") states.set(id, "queued"); },
  });
  await aheadReady.promise; stop = true; finish.resolve(); await work;
  expect(cursor).toBe(2); expect(states.get(1)).toBe("saved"); expect(states.get(2)).toBe("queued");
});
test("a failed request restores current and prefetched batches without discarding photos", async () => {
  let cursor = 0; const restored = new Set<number>();
  await expect(runImportPipeline<number>({
    prepare: async () => [++cursor], send: async () => { throw new Error("network failed"); },
    wait: async () => {}, stopped: () => false, restore: batch => batch.forEach(id => restored.add(id)),
  })).rejects.toThrow("network failed");
  expect([...restored].sort()).toEqual([1, 2]); expect(cursor).toBe(2);
});
test("pause during quota wait sends nothing and restores already prepared photos", async () => {
  let stop = false; let sent = 0; const restored = new Set<number>();
  await runImportPipeline<number>({
    prepare: async () => [1], send: async () => { sent++; }, wait: async () => { stop = true; },
    stopped: () => stop, restore: batch => batch.forEach(id => restored.add(id)),
  });
  expect(sent).toBe(0); expect([...restored]).toEqual([1]);
});
