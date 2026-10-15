<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { confirmReview, getReview, rejectReview, reviseReview } from "../api.ts";
import PageShell from "../components/PageShell.vue";
import { getSession } from "../session.ts";

const route = useRoute();
const router = useRouter();
const collection = computed(() => String(route.params.collection));
const error = ref("");
const loading = ref(false);
const kind = ref("");
const summary = ref("");
const relevantAtLocal = ref("");
const interpretation = ref("");
const content = ref("");
const status = ref("");

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoFromLocal(local: string): string {
  if (!local) return new Date(Date.now() + 60_000).toISOString();
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? new Date(Date.now() + 60_000).toISOString() : d.toISOString();
}

onMounted(async () => {
  const session = getSession();
  if (!session) return;
  const data = await getReview(session, collection.value);
  if ("error" in data) {
    error.value = data.error;
    return;
  }
  if (data.error) {
    error.value = data.error;
    return;
  }
  kind.value = data.kind;
  summary.value = data.summary;
  relevantAtLocal.value = toLocalInput(data.relevantAt ?? new Date(Date.now() + 60_000).toISOString());
  interpretation.value = data.interpretation;
  content.value = data.content;
  status.value = data.status;
});

async function confirm() {
  const session = getSession();
  if (!session) return;
  loading.value = true;
  const at = toIsoFromLocal(relevantAtLocal.value);
  const result = await confirmReview({
    session,
    collection: collection.value,
    interpretation: interpretation.value,
    at,
  });
  loading.value = false;
  if ("error" in result) {
    error.value = result.error;
    return;
  }
  await router.push(`/saved/${collection.value}`);
}

async function reject() {
  const session = getSession();
  if (!session) return;
  loading.value = true;
  const result = await rejectReview(session, collection.value, interpretation.value);
  loading.value = false;
  if ("error" in result) {
    error.value = result.error;
    return;
  }
  await router.push("/inbox");
}

async function saveEdits() {
  const session = getSession();
  if (!session) return;
  loading.value = true;
  const result = await reviseReview({
    session,
    collection: collection.value,
    interpretation: interpretation.value,
    kind: kind.value,
    summary: summary.value,
    relevantAt: toIsoFromLocal(relevantAtLocal.value),
  });
  loading.value = false;
  if ("error" in result) {
    error.value = result.error;
  }
}
</script>

<template>
  <PageShell title="Review" show-back back-to="/inbox">
    <p v-if="error" class="error">{{ error }}</p>
    <section v-if="content" class="card preview-card">
      <p class="field-label">Screenshot caption</p>
      <p class="preview-text">{{ content }}</p>
    </section>

    <section v-if="content" class="card">
      <p class="field-label">Recall found</p>
      <div class="field-row">
        <span class="field-name">Type</span>
        <input v-model="kind" />
      </div>
      <div class="field-row">
        <span class="field-name">Action</span>
        <input v-model="summary" />
      </div>
      <div class="field-row">
        <span class="field-name">Relevant time</span>
        <input v-model="relevantAtLocal" type="datetime-local" />
      </div>
      <p class="muted">Status: {{ status }}</p>
      <p class="fine-print">Recall can make mistakes. Confirm what you want to remember.</p>
      <button class="btn-primary btn-block" :disabled="loading" @click="confirm">Confirm</button>
      <button class="btn-secondary btn-block" :disabled="loading" @click="saveEdits">Edit details</button>
      <button type="button" class="btn-text btn-block" :disabled="loading" @click="reject">Ignore</button>
    </section>
  </PageShell>
</template>
