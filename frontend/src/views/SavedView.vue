<script setup lang="ts">
import DeleteItemDialog from "../components/DeleteItemDialog.vue";
import SavedPhoto from "../components/SavedPhoto.vue";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { completeSaved, dismissSaved, getSaved, rescheduleSaved, deleteSaved } from "../api.ts";
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
const interpretationStatus = ref("");
const reminderStatus = ref("");
const relevantAt = ref("");
const collectedAt = ref("");
const newTime = ref("");
const notice = ref("");
const confirmDelete = ref(false);
const deleteError = ref("");

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
  interpretationStatus.value = item.interpretationRow?.status ?? "";
  relevantAt.value = item.reminderRow?.at ?? item.interpretationRow?.relevantAt ?? "";
  tracking.value = item.trackingRow?.tracking ?? "";
  trackingStatus.value = item.trackingRow?.status ?? "";
  reminderStatus.value = item.reminderRow?.status ?? "";
}

async function remove() {
  const session = getSession(); if (!session || loading.value) return;
  loading.value = true; deleteError.value = "";
  const result = await deleteSaved(session, collection.value);
  loading.value = false;
  if ("error" in result) { deleteError.value = result.error; return; }
  confirmDelete.value = false;
  await router.push("/saved");
}

async function reschedule() {
  const session = getSession();
  const date = new Date(newTime.value);
  if (!session) return;
  if (!newTime.value || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    error.value = "Choose a future reminder time."; return;
  }
  loading.value = true;
  const result = await rescheduleSaved(session, collection.value, tracking.value, date.toISOString());
  loading.value = false;
  if ("error" in result) { error.value = result.error; return; }
  error.value = "";
  notice.value = "Reminder time updated.";
  await load();
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
  <PageShell title="Saved for later" show-back back-to="/saved">
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <article v-if="content" class="card detail-card">
      <SavedPhoto :collection="collection" :caption="content" />
      <div class="detail-card__body"><span class="badge" :class="{'badge--due': reminderStatus === 'due'}">{{ interpretationStatus === 'rejected' ? 'Ignored' : reminderStatus === 'due' ? 'Due now' : trackingStatus || (!relevantAt ? 'Found' : 'Saved') }}</span>
        <h2 class="detail-title">{{ summary || 'Saved photo' }}</h2>
        <details class="caption-details"><summary>Photo details</summary><p class="preview-text">{{ content }}</p><p v-if="collectedAt" class="fine-print">Saved {{ new Date(collectedAt).toLocaleDateString() }}</p></details>
      </div>
    </article>
    <section v-if="trackingStatus === 'pending'" class="card reminder-card">
      <span class="eyebrow">{{ reminderStatus === 'due' ? 'Time to follow up' : 'Bring it back' }}</span>
      <h2 v-if="relevantAt" class="reminder-date">{{ new Date(relevantAt).toLocaleString(undefined, {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) }}</h2>
      <details v-if="reminderStatus === 'scheduled'" class="reschedule-details"><summary>Change time</summary><form @submit.prevent="reschedule"><label for="new-time" class="sr-only">New reminder time</label><input id="new-time" v-model="newTime" type="datetime-local" required /><button class="btn-secondary btn-block" :disabled="loading" type="submit">Update reminder</button></form></details>
      <p v-if="notice" class="success-notice" role="status">{{ notice }}</p>
      <button class="btn-primary btn-block" :disabled="loading" @click="complete">Mark complete</button><button type="button" class="btn-text btn-block" :disabled="loading" @click="dismiss">No longer interested</button>
    </section>
    <p v-if="content && interpretationStatus === 'rejected'" class="muted">You ignored this suggestion. No reminder is set.</p>
    <p v-else-if="content && !relevantAt && !tracking" class="muted">Saved without a date. No reminder is set.</p>
    <button v-if="content" class="btn-delete delete-item-link" :disabled="loading" @click="confirmDelete = true; deleteError = ''">Delete item</button>
    <DeleteItemDialog :open="confirmDelete" :title="summary || 'Saved item'" :busy="loading" :error="deleteError" @cancel="confirmDelete = false" @confirm="remove" />
  </PageShell>
</template>
