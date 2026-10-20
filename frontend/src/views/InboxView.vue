<script setup lang="ts">
import SavedPhoto from "../components/SavedPhoto.vue";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { listInbox, rejectReview, sweepTick, type DueRow, type ForReviewRow } from "../api.ts";
import { RouterLink } from "vue-router";
import PageShell from "../components/PageShell.vue";
import { getSession } from "../session.ts";

const forReview = ref<ForReviewRow[]>([]);
const due = ref<DueRow[]>([]);
const error = ref("");
const reviewLimit = ref(24);
const dueLimit = ref(24);
const ignoring = ref("");
let refreshing = false;
let timer: ReturnType<typeof setInterval> | undefined;

const itemCount = computed(() => forReview.value.length + due.value.length);

async function refresh() {
  const session = getSession();
  if (!session || refreshing) return;
  refreshing = true;
  await sweepTick(session);
  const result = await listInbox(session);
  refreshing = false;
  if ("error" in result) {
    error.value = result.error;
    return;
  }
  error.value = "";
  forReview.value = result.book.forReview.filter((row) =>
    row.proposal.some((p) => p.status === "proposed"),
  );
  due.value = result.book.due.filter((row) => row.details?.reminderStatus === "due");
}

async function ignore(collection: string, interpretation: string) {
  const session = getSession();
  if (!session) return;
  ignoring.value = collection;
  const result = await rejectReview(session, collection, interpretation);
  ignoring.value = "";
  if ("error" in result) { error.value = result.error; return; }
  await refresh();
}

onMounted(() => {
  void refresh();
  timer = setInterval(() => void refresh(), 4000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <PageShell title="A little nudge" :subtitle="itemCount ? `${itemCount} things worth coming back to` : 'Good things, at the right time.'">
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <section v-if="!itemCount && !error" class="empty-state"><span class="empty-glyph" aria-hidden="true">↗</span><h2>Make room for a good find</h2><p>Save a photo. We’ll bring it back when it matters.</p><RouterLink to="/add" class="btn-primary">Add photos</RouterLink></section>
    <template v-if="due.length">
      <div class="section-heading"><h2>Ready now</h2><span class="section-count">{{ due.length }}</span></div>
      <article v-for="row in due.slice(0, dueLimit)" :key="row.tracking" class="feed-card feed-card--due">
        <SavedPhoto :collection="row.details.collection" :caption="row.details.summary" compact />
        <span class="badge badge--due">Time to follow up</span><h3 class="feed-title">{{ row.details.summary }}</h3><p class="item-time">{{ new Date(row.details.at).toLocaleString(undefined, {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) }}</p>
        <div class="feed-actions"><RouterLink class="text-link" :to="`/saved/${row.details.collection}`">Open item →</RouterLink></div>
      </article>
      <button v-if="due.length > dueLimit" class="btn-secondary btn-block" @click="dueLimit += 24">Show more</button>
    </template>
    <template v-if="forReview.length">
      <div class="section-heading"><h2>For review</h2><span class="section-count">{{ forReview.length }}</span></div>
      <article v-for="row in forReview.slice(0, reviewLimit)" :key="row.collection" class="feed-card">
        <SavedPhoto :collection="row.collection" :caption="row.content" compact />
        <span class="badge badge--suggested">New find</span><h3 class="feed-title">{{ row.proposal.find(p => p.status === 'proposed')?.summary }}</h3><p class="feed-caption caption-clamp">{{ row.content }}</p>
        <div class="feed-actions"><RouterLink class="text-link" :to="`/review/${row.collection}`">Review →</RouterLink><button class="btn-text" :disabled="ignoring === row.collection" @click="ignore(row.collection, row.proposal.find(p => p.status === 'proposed')!.interpretation)">{{ ignoring === row.collection ? 'Skipping…' : 'Skip' }}</button></div>
      </article>
      <button v-if="forReview.length > reviewLimit" class="btn-secondary btn-block" @click="reviewLimit += 24">Show more</button>
    </template>
  </PageShell>
</template>
