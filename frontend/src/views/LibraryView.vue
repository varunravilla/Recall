<script setup lang="ts">
import SavedPhoto from "../components/SavedPhoto.vue";
import DeleteItemDialog from "../components/DeleteItemDialog.vue";
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { deleteSaved, itemRoute, itemStatusLabel, listLibrary, type LibraryItem } from "../api.ts";
import PageShell from "../components/PageShell.vue";
import { getSession } from "../session.ts";
const items = ref<LibraryItem[]>([]);
const error = ref("");
const loading = ref(true);
const page = ref(0);
const search = ref("");
const filter = ref("all");
const selected = ref<LibraryItem | null>(null);
const deleting = ref(false);
const deleteError = ref("");
const notice = ref("");
const filtered = computed(() => items.value.filter(item => {
  const status = item.trackingRow?.status;
  const done = status === "completed" || status === "dismissed" || item.interpretationRow?.status === "rejected";
  return (filter.value === "all" || (filter.value === "done" ? done : !done)) &&
    `${item.content} ${item.interpretationRow?.summary ?? ""}`.toLowerCase().includes(search.value.trim().toLowerCase());
}));
const visibleItems = computed(() => filtered.value.slice(page.value * 24, (page.value + 1) * 24));
watch([search, filter], () => page.value = 0);
async function refresh() {
  const session = getSession(); if (!session) return;
  loading.value = true;
  const result = await listLibrary(session); loading.value = false;
  if ("error" in result) { error.value = result.error; return; }
  error.value = "";
  items.value = [...result.book.items].sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
}
function askDelete(item: LibraryItem) { selected.value = item; deleteError.value = ""; }
async function remove() {
  const session = getSession(); if (!session || !selected.value || deleting.value) return;
  deleting.value = true;
  const collection = selected.value.collection;
  const result = await deleteSaved(session, collection);
  deleting.value = false;
  if ("error" in result) { deleteError.value = result.error; return; }
  items.value = items.value.filter(item => item.collection !== collection);
  selected.value = null; notice.value = "Item deleted.";
  page.value = Math.min(page.value, Math.max(0, Math.ceil(filtered.value.length / 24) - 1));
}
onMounted(refresh);
</script>
<template>
  <PageShell title="Your collection" :subtitle="`${items.length} saved ${items.length === 1 ? 'idea' : 'ideas'}`">
    <div class="collection-tools">
      <label for="search-saved" class="sr-only">Search saved items</label>
      <input id="search-saved" v-model="search" type="search" placeholder="Find something you saved…" />
      <div class="filter-tabs" role="group" aria-label="Filter saved items"><button v-for="tab in [{id:'all',name:'All'}, {id:'todo',name:'To do'}, {id:'done',name:'Done'}]" :key="tab.id" :aria-pressed="filter === tab.id" @click="filter = tab.id">{{ tab.name }}</button></div>
    </div>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <p v-if="notice" class="success-notice" role="status">{{ notice }}</p>
    <p v-if="loading" class="muted" role="status">Loading your collection…</p>
    <section v-else-if="!filtered.length" class="empty-state"><span class="empty-glyph" aria-hidden="true">⌑</span><h2>{{ items.length ? 'Nothing matches yet' : 'Keep something worth returning to' }}</h2><p>{{ items.length ? 'Try another search or filter.' : 'Add a photo. We’ll help you remember the rest.' }}</p><RouterLink v-if="!items.length" to="/add" class="btn-primary">Add photos</RouterLink></section>
    <div class="saved-grid">
      <article v-for="row in visibleItems" :key="row.collection" class="feed-card collection-card">
        <RouterLink :to="itemRoute(row).path" class="collection-image-link" :aria-label="row.interpretationRow?.summary || 'Open saved item'"><SavedPhoto :collection="row.collection" :caption="row.content" /></RouterLink>
        <div class="collection-card__body"><div class="card-meta"><span class="badge" :class="{'badge--due': itemStatusLabel(row) === 'Due now'}">{{ itemStatusLabel(row) }}</span><span class="category-label">{{ row.interpretationRow?.kind }}</span></div>
        <h2 class="feed-title"><RouterLink :to="itemRoute(row).path">{{ row.interpretationRow?.summary || 'Saved photo' }}</RouterLink></h2>
        <p class="feed-caption caption-clamp">{{ row.content }}</p>
        <p v-if="row.reminderRow?.at || row.interpretationRow?.relevantAt" class="item-time">{{ new Date(row.reminderRow?.at || row.interpretationRow!.relevantAt!).toLocaleString(undefined, {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) }}</p>
        <div class="feed-actions"><RouterLink class="text-link" :to="itemRoute(row).path">{{ itemRoute(row).label }} →</RouterLink><button class="btn-delete" :aria-label="`Delete ${row.interpretationRow?.summary || 'saved item'}`" @click="askDelete(row)">Delete</button></div></div>
      </article>
    </div>
    <div v-if="filtered.length > 24" class="pagination"><button class="btn-secondary" :disabled="page === 0" @click="page--">Previous</button><span>{{ page + 1 }} / {{ Math.ceil(filtered.length / 24) }}</span><button class="btn-secondary" :disabled="(page + 1) * 24 >= filtered.length" @click="page++">Next</button></div>
    <DeleteItemDialog :open="!!selected" :title="selected?.interpretationRow?.summary || 'Saved item'" :busy="deleting" :error="deleteError" @cancel="selected = null" @confirm="remove" />
  </PageShell>
</template>
