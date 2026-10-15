<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { completeSaved, dismissSaved, getSaved } from "../api.ts";
import PageShell from "../components/PageShell.vue";
import { getSession } from "../session.ts";

const route = useRoute();
const router = useRouter();
const collection = computed(() => String(route.params.collection));
const error = ref("");
const loading = ref(false);
const content = ref("");
const summary = ref("");
const tracking = ref("");
const trackingStatus = ref("");
const reminderStatus = ref("");
const relevantAt = ref("");
const collectedAt = ref("");

onMounted(async () => {
  await load();
});

async function load() {
  const session = getSession();
  if (!session) return;
  const data = await getSaved(session, collection.value);
  if ("error" in data) {
    error.value = data.error;
    return;
  }
  const item = data.item;
  content.value = item.content;
  collectedAt.value = item.collectedAt;
  summary.value = item.interpretationRow?.summary ?? "";
  relevantAt.value = item.interpretationRow?.relevantAt ?? "";
  tracking.value = item.trackingRow?.tracking ?? "";
  trackingStatus.value = item.trackingRow?.status ?? "";
  reminderStatus.value = item.reminderRow?.status ?? "";
}

async function complete() {
  const session = getSession();
  if (!session || !tracking.value) return;
  loading.value = true;
  const result = await completeSaved(session, collection.value, tracking.value);
  loading.value = false;
  if ("error" in result) {
    error.value = result.error;
    return;
  }
  await router.push("/saved");
}

async function dismiss() {
  const session = getSession();
  if (!session || !tracking.value) return;
  loading.value = true;
  const result = await dismissSaved(session, collection.value, tracking.value);
  loading.value = false;
  if ("error" in result) {
    error.value = result.error;
    return;
  }
  await router.push("/saved");
}
</script>

<template>
  <PageShell title="Saved item" show-back back-to="/saved">
    <p v-if="error" class="error">{{ error }}</p>
    <section v-if="content" class="card">
      <span class="badge">{{ trackingStatus || "Pending" }}</span>
      <h2 class="feed-title">{{ summary }}</h2>
      <p class="muted">Detected from your screenshots</p>
      <p class="preview-text">{{ content }}</p>
      <p v-if="collectedAt" class="muted">Collected {{ new Date(collectedAt).toLocaleString() }}</p>
    </section>

    <section v-if="summary" class="card">
      <p class="field-label">What I want to do</p>
      <div class="intent-card">{{ summary }}</div>
    </section>

    <section v-if="relevantAt || reminderStatus" class="card">
      <p class="field-label">Bring this back</p>
      <h3 v-if="summary" class="feed-title">{{ summary }}</h3>
      <p v-if="relevantAt">{{ new Date(relevantAt).toLocaleString() }}</p>
      <p v-if="reminderStatus === 'due'" class="action-link">Reminder due — {{ summary }}</p>
      <p v-else-if="reminderStatus" class="muted">Reminder: {{ reminderStatus }}</p>
    </section>

    <section v-if="trackingStatus === 'pending'" class="actions-stack">
      <button class="btn-primary btn-block" :disabled="loading" @click="complete">Mark complete</button>
      <button type="button" class="btn-text btn-block" :disabled="loading" @click="dismiss">
        No longer interested
      </button>
    </section>
  </PageShell>
</template>
