<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { itemRoute, itemStatusLabel, listLibrary, type LibraryItem } from "../api.ts";
import PageShell from "../components/PageShell.vue";
import { getSession } from "../session.ts";

const items = ref<LibraryItem[]>([]);
const error = ref("");
const loading = ref(true);

async function refresh() {
  const session = getSession();
  if (!session) return;
  loading.value = true;
  const result = await listLibrary(session);
  loading.value = false;
  if ("error" in result) {
    error.value = result.error;
    return;
  }
  error.value = "";
  items.value = [...result.book.items].sort(
    (a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime(),
  );
}

onMounted(() => void refresh());
</script>

<template>
  <PageShell title="Saved" subtitle="Everything you collected stays in MongoDB until you remove it.">
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="loading" class="muted">Loading…</p>
    <p v-else-if="items.length === 0" class="muted">No screenshots yet. Add a caption from the Add tab.</p>

    <article v-for="row in items" :key="row.collection" class="feed-card">
      <div class="feed-card__main">
        <span class="badge">{{ itemStatusLabel(row) }}</span>
        <h2 class="feed-title">{{ row.interpretationRow?.summary ?? "Screenshot" }}</h2>
        <p class="feed-caption">{{ row.content }}</p>
        <p v-if="row.interpretationRow?.relevantAt" class="muted">
          {{ new Date(row.interpretationRow.relevantAt).toLocaleString() }}
        </p>
      </div>
      <div class="feed-actions">
        <RouterLink class="btn-primary" :to="itemRoute(row).path">{{ itemRoute(row).label }}</RouterLink>
      </div>
    </article>
  </PageShell>
</template>
