<script setup lang="ts">
import DeleteItemDialog from "../components/DeleteItemDialog.vue";
import { deleteSaved } from "../api.ts";
import SavedPhoto from "../components/SavedPhoto.vue";
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
const confirmDelete = ref(false);
const deleteError = ref("");

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
  if (!summary.value.trim() || !relevantAtLocal.value || !Number.isFinite(new Date(relevantAtLocal.value).getTime())) {
    error.value = "Enter an action and a valid reminder time."; return;
  }
  loading.value = true;
  const at = toIsoFromLocal(relevantAtLocal.value);
  const edited = await reviseReview({ session, collection: collection.value,
    interpretation: interpretation.value, kind: kind.value, summary: summary.value, relevantAt: at });
  if ("error" in edited) { loading.value = false; error.value = edited.error; return; }
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

async function remove() {
  const session = getSession(); if (!session || loading.value) return;
  loading.value = true; deleteError.value = "";
  const result = await deleteSaved(session, collection.value);
  loading.value = false;
  if ("error" in result) { deleteError.value = result.error; return; }
  confirmDelete.value = false;
  await router.push("/saved");
}
</script>

<template>
  <PageShell title="Make it yours" show-back back-to="/inbox">
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <section v-if="content" class="card preview-card">
      <SavedPhoto :collection="collection" :caption="content" />
      <details class="caption-details"><summary>Photo details</summary><p class="preview-text">{{ content }}</p></details>
    </section>

    <section v-if="content" class="card">
      <span class="eyebrow">Suggested for you</span>
      <div class="field-row">
        <label for="kind" class="field-name">Type</label>
        <select id="kind" v-model="kind"><option value="event">Event</option><option value="place">Place</option><option value="product">Product</option></select>
      </div>
      <div class="field-row">
        <label for="summary" class="field-name">Action</label>
        <input id="summary" v-model="summary" maxlength="240" />
      </div>
      <div class="field-row">
        <label for="time" class="field-name">Relevant time</label>
        <input id="time" v-model="relevantAtLocal" type="datetime-local" />
      </div>
      <p class="fine-print">Check the details. We’ll remind you when it’s time.</p>
      <button class="btn-primary btn-block" :disabled="loading" @click="confirm">Save reminder</button>
      <button type="button" class="btn-text btn-block" :disabled="loading" @click="reject">Ignore</button>
    </section>
    <button v-if="content" class="btn-delete delete-item-link" :disabled="loading" @click="confirmDelete = true; deleteError = ''">Delete item</button>
    <DeleteItemDialog :open="confirmDelete" :title="summary || 'Saved item'" :busy="loading" :error="deleteError" @cancel="confirmDelete = false" @confirm="remove" />
  </PageShell>
</template>
