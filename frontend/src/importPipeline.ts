/** One batch in flight and at most one prepared ahead. Never pre-load a library. */
export async function runImportPipeline<T>(options: {
  prepare: () => Promise<T[]>;
  send: (batch: T[]) => Promise<void>;
  wait: () => Promise<void>;
  stopped: () => boolean;
  restore: (batch: T[]) => void;
}) {
  let ahead: Promise<T[]> | undefined;
  let current: T[] = [];
  // Attach rejection handling immediately: preparation can fail while send awaits.
  const prepare = () => options.prepare().then(batch => ({ batch }), error => ({ batch: [] as T[], error }));
  let pending = prepare();
  try {
    while (!options.stopped()) {
      let prepared = await pending;
      if ("error" in prepared) throw prepared.error;
      // The ahead batch may have been empty before the user added more files
      // during the active request. Recheck the live queue before finishing.
      if (!prepared.batch.length && !options.stopped()) {
        pending = prepare();
        prepared = await pending;
        if ("error" in prepared) throw prepared.error;
      }
      current = prepared.batch;
      if (!current.length) break;
      if (options.stopped()) break;
      await options.wait();
      if (options.stopped()) break;
      const next = prepare();
      // Keep a settled promise for cleanup, including on network errors or pause.
      ahead = next.then(result => result.batch);
      await options.send(current);
      current = [];
      pending = next;
      ahead = undefined;
      if (options.stopped()) {
        break;
      }
    }
  } finally {
    options.restore(current);
    if (ahead) options.restore(await ahead);
    else {
      const prepared = await pending;
      options.restore(prepared.batch);
    }
  }
}
