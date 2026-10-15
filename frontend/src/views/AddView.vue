<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import { addCaption } from "../api.ts";
import PageShell from "../components/PageShell.vue";
import { recognizeCaption } from "../recognize.ts";
import { getSession, hasPhotosAccess } from "../session.ts";

const router = useRouter();
const caption = ref("");
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  const text = caption.value.trim();
  if (!text) {
    error.value = "Paste the text from a screenshot caption.";
    return;
  }
  const session = getSession();
  if (!session) {
    error.value = "Log in first.";
    return;
  }
  if (!hasPhotosAccess()) {
    error.value = "Allow Photos access first.";
    return;
  }
  loading.value = true;
  const rec = recognizeCaption(text);
  const added = await addCaption({
    session,
    item: crypto.randomUUID(),
    content: text,
    collectedAt: new Date().toISOString(),
    kind: rec.kind,
    summary: rec.summary,
    relevantAt: rec.relevantAt ?? new Date(Date.now() + 60_000).toISOString(),
  });
  loading.value = false;
  if ("error" in added) {
    error.value = added.error;
    return;
  }
  caption.value = "";
  await router.push(`/review/${added.collection}`);
}
</script>

<template>
  <PageShell
    title="New screenshot"
    :subtitle="
      hasPhotosAccess()
        ? 'Recall is scanning your library. Paste a caption here to simulate a newly detected screenshot.'
        : 'Photos access is required before Recall can scan.'
    "
  >
    <section v-if="!hasPhotosAccess()" class="card card--warn">
      <p>Turn on Photos access so Recall can watch for screenshots.</p>
      <RouterLink to="/permission" class="btn-primary btn-block">Photos permission</RouterLink>
    </section>

    <section v-else class="card">
      <p class="scanning-pulse muted">Scanning Photos for new screenshots…</p>
      <p class="fine-print">
        In the real app, new items appear in your inbox automatically. In this web demo, paste
        caption text below to simulate that detection.
      </p>
      <label class="field-label">Caption from screenshot</label>
      <textarea v-model="caption" rows="6" placeholder="Paste caption text…" />
      <button class="btn-primary btn-block" :disabled="loading" @click="submit">
        Simulate detected screenshot
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </PageShell>
</template>
