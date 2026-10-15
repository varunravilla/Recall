<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { listInbox, rejectReview, sweepTick, type DueRow, type ForReviewRow } from "../api.ts";
import { RouterLink } from "vue-router";
import PageShell from "../components/PageShell.vue";
import { getSession, hasPhotosAccess } from "../session.ts";

const forReview = ref<ForReviewRow[]>([]);
const due = ref<DueRow[]>([]);
const error = ref("");
let timer: ReturnType<typeof setInterval> | undefined;

const itemCount = computed(() => forReview.value.length + due.value.length);

async function refresh() {
  const session = getSession();
  if (!session) return;
  await sweepTick(new Date().toISOString());
  const result = await listInbox(session);
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
  await rejectReview(session, collection, interpretation);
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
  <PageShell
    title="Action Inbox"
    :subtitle="`${itemCount} item${itemCount === 1 ? '' : 's'} · refreshes every few seconds`"
  >
    <p v-if="error" class="error">{{ error }}</p>

    <section v-if="hasPhotosAccess()" class="card card--scanning">
      <p class="scanning-pulse">Scanning Photos for new screenshots</p>
      <p class="muted fine-print">New detections show up here. Web demo: use Add to paste a caption.</p>
    </section>
    <section v-else class="card card--warn">
      <p>Allow Photos access so Recall can detect screenshots.</p>
      <RouterLink to="/permission" class="text-link">Set up Photos permission →</RouterLink>
    </section>

    <h2 class="section-title">Suggested</h2>
    <p v-if="forReview.length === 0" class="muted">Nothing waiting for review. Check Saved for earlier items.</p>
    <article v-for="row in forReview" :key="row.collection" class="feed-card">
      <span class="badge badge--suggested">Suggested</span>
      <h3 class="feed-title">{{ row.proposal.find((p) => p.status === 'proposed')?.summary }}</h3>
      <p class="feed-caption">{{ row.content }}</p>
      <p v-for="p in row.proposal.filter((x) => x.status === 'proposed')" :key="p.interpretation" class="action-link">
        {{ p.summary }}
        <span v-if="p.relevantAt" class="muted"> · {{ new Date(p.relevantAt).toLocaleString() }}</span>
      </p>
      <div class="feed-actions">
        <RouterLink class="btn-primary" :to="`/review/${row.collection}`">Review</RouterLink>
        <button
          type="button"
          class="btn-text"
          @click="ignore(row.collection, row.proposal[0]!.interpretation)"
        >
          Ignore
        </button>
      </div>
    </article>

    <h2 class="section-title">Due now</h2>
    <p v-if="due.length === 0" class="muted">No reminders due yet.</p>
    <article v-for="row in due" :key="row.tracking" class="feed-card feed-card--due">
      <span class="badge badge--due">Due</span>
      <h3 class="feed-title">{{ row.details.summary }}</h3>
      <p class="feed-caption">Reminder · {{ new Date(row.details.at).toLocaleString() }}</p>
      <RouterLink class="btn-primary" :to="`/saved/${row.details.collection}`">Open saved item</RouterLink>
    </article>
  </PageShell>
</template>
