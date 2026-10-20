<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink, onBeforeRouteLeave } from "vue-router";
import PageShell from "../components/PageShell.vue";
import { ImportFailure, importPhoto, importPhotos, photoStatus, preparePhoto, validateSourcePhoto, type ImportResult } from "../photos.ts";
import { runImportPipeline } from "../importPipeline.ts";
import { getSession } from "../session.ts";
type Entry = { id: number; file: File; state: "queued" | "processing" | "failed" | ImportResult["status"]; message: string; retrySingle?: boolean; result?: ImportResult };
const entries = ref<Entry[]>([]);
const consent = ref(false);
const batchSize = ref(10);
const waiting = ref("");
const running = ref(false);
const starting = ref(false);
const paused = ref(false);
const error = ref("");
const configured = ref<boolean | null>(null);
const timezone = ref(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York");
const page = ref(0);
const visible = computed(() => entries.value.slice(page.value * 30, (page.value + 1) * 30));
const counts = computed(() => ({
  added: entries.value.filter(e => e.state === "added").length,
  skipped: entries.value.filter(e => e.state === "skipped" || e.state === "duplicate").length,
  failed: entries.value.filter(e => e.state === "failed").length,
  queued: entries.value.filter(e => e.state === "queued").length,
}));
let nextId = 0;
let controller: AbortController | undefined;
let stop = false;
let wake: (() => void) | undefined;
let resumeAfter = 0;
async function checkStatus() {
  try { const status = await photoStatus(); configured.value = status.configured; if (typeof status.batchSize === "number" && Number.isInteger(status.batchSize) && status.batchSize >= 1 && status.batchSize <= 10) batchSize.value = status.batchSize; resumeAfter = Math.max(resumeAfter, Date.now() + (status.nextRequestInMs ?? 0)); error.value = ""; }
  catch (failure) { configured.value = null; error.value = failure instanceof Error ? failure.message : "Could not reach the server."; }
}
onMounted(checkStatus);
function selectFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  const selected = Array.from(input.files ?? []);
  const known = new Set(entries.value.map(e => `${e.file.name}:${e.file.size}:${e.file.lastModified}`));
  const firstNewIndex = entries.value.length;
  for (const file of selected) {
    const identity = `${file.name}:${file.size}:${file.lastModified}`;
    if (known.has(identity)) continue;
    known.add(identity);
    const invalid = validateSourcePhoto(file);
    entries.value.push({ id: nextId++, file, state: invalid ? "skipped" : "queued", message: invalid ?? "Ready to import" });
  }
  if (entries.value.length > firstNewIndex) {
    page.value = Math.floor(firstNewIndex / 30);
    if (!running.value && !starting.value) { paused.value = false; error.value = ""; }
  }
  input.value = "";
}
function pause() { stop = true; paused.value = true; wake?.(); }
onBeforeRouteLeave(() => {
  // Pause after the active request; keep the queue in memory using KeepAlive.
  if (running.value || starting.value) pause();
});
onBeforeUnmount(() => { stop = true; wake?.(); controller?.abort(); });
type Prepared = { entry: Entry; image: Blob };
function restore(batch: Prepared[]) {
  for (const { entry } of batch) if (entry.state === "processing") { entry.state = "queued"; entry.message = "Ready to continue"; }
}
async function waitForQuota() {
  while (!stop && Date.now() < resumeAfter) {
    waiting.value = `Continuing shortly · ${Math.ceil((resumeAfter - Date.now()) / 1000)}s`;
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => { wake = undefined; resolve(); }, Math.min(1000, resumeAfter - Date.now()));
      wake = () => { clearTimeout(timer); wake = undefined; resolve(); };
    });
  }
  waiting.value = "";
}
async function prepareBatch(): Promise<Prepared[]> {
  const batch: Prepared[] = [];
  for (const entry of entries.value) {
    if (stop || batch.length === batchSize.value) break;
    if (entry.state !== "queued") continue;
    if (entry.retrySingle && batch.length) break;
    entry.state = "processing"; entry.message = "Preparing photo…";
    try {
      const image = await preparePhoto(entry.file);
      if (stop) { entry.state = "queued"; entry.message = "Paused"; break; }
      entry.message = "Ready to import";
      batch.push({ entry, image });
      if (entry.retrySingle) break;
    } catch (failure) {
      entry.state = "failed"; entry.message = failure instanceof Error ? failure.message : "Could not prepare this photo.";
    }
  }
  return batch;
}
async function sendBatch(batch: Prepared[]) {
  let quotaRetries = 0;
  while (!stop) {
    await waitForQuota(); if (stop) return;
    for (const { entry } of batch) entry.message = "Finding the details…";
    controller = new AbortController();
    try {
      if (batch.length === 1 && batch[0]!.entry.retrySingle) {
        const { entry, image } = batch[0]!;
        entry.result = await importPhoto(image, timezone.value, controller.signal);
        entry.state = entry.result.status; entry.message = entry.result.reason;
      } else {
        const response = await importPhotos(batch.map(p => ({ id: String(p.entry.id), image: p.image })), timezone.value, controller.signal);
        resumeAfter = Math.max(resumeAfter, Date.now() + response.nextRequestInMs);
        const byId = new Map(response.results.map(result => [result.id, result]));
        for (const { entry } of batch) {
          const result = byId.get(String(entry.id))!;
          entry.state = result.status; entry.message = result.reason;
          if (result.status === "failed") entry.retrySingle = true;
          else entry.result = result;
        }
      }
      return;
    } catch (failure) {
      const message = failure instanceof ImportFailure && failure.status === 503 ? "Photo analysis is unavailable. Your waiting photos are preserved." : failure instanceof Error ? failure.message : "Could not analyze these photos.";
      if (failure instanceof ImportFailure && failure.status === 429) {
        resumeAfter = Date.now() + Math.max(1, failure.retryAfter) * 1000;
        if (++quotaRetries <= 2 && !stop) continue;
        error.value = "Import paused. Please try again later; your selected photos are still here.";
        stop = true; paused.value = true; return;
      }
      if (failure instanceof ImportFailure && [401, 403, 404, 409, 413, 503].includes(failure.status)) {
        error.value = message; stop = true; paused.value = true; return;
      }
      for (const { entry } of batch) { entry.state = "failed"; entry.retrySingle = true; entry.message = message; }
      error.value = message; stop = true; paused.value = true;
      return;
    }
  }
}
async function processQueue() {
  if (running.value || starting.value) return;
  if (!consent.value) { error.value = "Allow photo analysis below to start importing."; return; }
  stop = false; starting.value = true;
  try { await checkStatus(); } finally { starting.value = false; }
  if (stop || running.value) return;
  if (configured.value !== true) {
    if (configured.value === false) error.value = "Photo analysis is offline. Please try again later.";
    return;
  }
  paused.value = false; running.value = true; error.value = "";
  try {
    await runImportPipeline({ prepare: prepareBatch, send: sendBatch, wait: waitForQuota, stopped: () => stop, restore });
  } catch (failure) { error.value = failure instanceof Error ? failure.message : "Import paused. Your waiting photos are preserved."; paused.value = true; }
  finally { running.value = false; controller = undefined; waiting.value = ""; }
}
function retryFailed() {
  for (const entry of entries.value) if (entry.state === "failed") { entry.retrySingle = true; entry.state = "queued"; entry.message = "Ready to retry"; }
  void processQueue();
}
function clearQueue() { entries.value = []; page.value = 0; }
</script>

<template>
  <PageShell title="Keep the good finds" subtitle="A photo now. Something to come back to later.">
    <section class="card import-card">
      <label class="photo-dropzone">
        <input id="selected-photos" class="sr-only" type="file" accept="image/*" multiple @change="selectFiles" />
        <span class="photo-picker-icon" aria-hidden="true"><svg viewBox="0 0 32 32"><rect x="3" y="3" width="26" height="26" rx="7"/><circle cx="11" cy="11" r="3"/><path d="m4 24 9-9 6 6 4-4 6 7"/></svg></span>
        <strong>{{ entries.length ? 'Add more photos' : 'Choose photos' }}</strong><span>Screenshots, places, little possibilities.</span>
        <span class="picker-cta">Browse photos <span aria-hidden="true">↗</span></span>
      </label>
      <label class="folder-picker"><input class="sr-only" id="photo-library" type="file" webkitdirectory multiple @change="selectFiles" /><span aria-hidden="true">＋</span> Add a folder instead</label>
      <details class="import-details"><summary>Import options</summary>
        <label for="import-timezone" class="field-label">Timezone</label><input id="import-timezone" v-model="timezone" :disabled="running || starting" />
        <p class="fine-print">Export Apple Photos to a folder first. If a photo won’t open, export JPEG.</p>
        <p class="fine-print">Keep this tab open. Leaving this screen pauses importing; refreshing clears waiting photos. Saved items stay safe.</p>
      </details>
      <p v-if="configured === false" class="error" role="alert">Photo analysis is offline. <button class="btn-text" @click="checkStatus">Try again</button></p>
    </section>
    <section v-if="entries.length" class="card import-progress" aria-label="Import progress">
      <div class="section-heading"><h2>{{ running ? 'Finding the useful ones…' : paused ? 'Import paused' : counts.queued ? 'Ready when you are' : 'All sorted' }}</h2><span class="count-label">{{ entries.length }} photos</span></div>
      <progress :value="entries.filter(e => !['queued', 'processing'].includes(e.state)).length" :max="entries.length" aria-label="Photos processed" />
      <p class="progress-summary" role="status" aria-live="polite">{{ counts.added }} added · {{ counts.skipped }} skipped<span v-if="counts.failed"> · {{ counts.failed }} need a retry</span><span v-if="counts.queued"> · {{ counts.queued }} waiting</span></p>
      <div v-if="!running && (counts.queued || counts.failed)" class="import-start-controls">
        <label class="consent-label"><input v-model="consent" type="checkbox" :disabled="starting" aria-describedby="gemini-consent-help" /><span>Allow photo analysis</span></label>
        <p id="gemini-consent-help" class="fine-print">Photos are sent to Google for analysis. Its free service may use uploads to improve AI. <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer">Privacy details ↗</a></p>
        <p v-if="!consent" id="import-start-help" class="fine-print" role="status">Check the box above to enable importing.</p>
        <p v-else-if="configured === false" id="import-start-help" class="fine-print" role="status">Analysis is unavailable. Try again to recheck the connection; your selected photos will stay here.</p>
      </div>
      <button v-if="!running && counts.queued" class="btn-primary btn-block" :disabled="!consent || starting" :aria-describedby="!consent || configured === false ? 'import-start-help' : undefined" @click="processQueue">{{ starting ? 'Checking connection…' : configured === false ? 'Try again' : paused ? 'Continue import' : 'Find my saves' }}</button>
      <p v-if="waiting" class="fine-print" role="status">{{ waiting }}</p>
      <button v-if="running" class="btn-secondary btn-block" @click="pause">Pause import</button>
      <button v-if="counts.failed && !running" class="btn-secondary btn-block" :disabled="!consent || starting" @click="retryFailed">Retry photos</button>
      <button v-if="!running" class="btn-text btn-block" :disabled="starting" @click="clearQueue">Clear this list</button>
    </section>
    <p v-if="error" class="error" role="alert">{{ error }} <RouterLink v-if="!getSession()" to="/">Log in again</RouterLink></p>
    <article v-for="entry in visible" :key="entry.id" class="feed-card import-result">
      <span class="badge" :class="{ 'badge--suggested': entry.state === 'added' }">{{ entry.state === 'added' ? (entry.result?.relevantAt ? 'Ready to review' : 'Found') : entry.state }}</span>
      <h2 class="feed-title">{{ entry.result?.summary || entry.file.name }}</h2>
      <p v-if="entry.state !== 'added'" class="muted">{{ entry.message }}</p>
      <p v-if="entry.result?.relevantAt" class="item-time">{{ new Date(entry.result.relevantAt).toLocaleString() }}</p>
      <RouterLink v-if="entry.result?.collection" class="text-link" :to="entry.state === 'added' ? (entry.result.relevantAt ? `/review/${entry.result.collection}` : `/saved/${entry.result.collection}`) : '/saved'">{{ entry.state === 'added' && entry.result.relevantAt ? 'Review →' : 'View saved →' }}</RouterLink>
    </article>
    <div v-if="entries.length > 30" class="pagination"><button class="btn-secondary" :disabled="page === 0" @click="page--">Previous</button><span>{{ page + 1 }} / {{ Math.ceil(entries.length / 30) }}</span><button class="btn-secondary" :disabled="(page + 1) * 30 >= entries.length" @click="page++">Next</button></div>
  </PageShell>
</template>
