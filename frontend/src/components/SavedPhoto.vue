<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { getSession } from "../session.ts";
const props = defineProps<{ collection: string; caption?: string; compact?: boolean }>();
const url = ref("");
let controller: AbortController | undefined;
function release() { if (url.value) URL.revokeObjectURL(url.value); url.value = ""; }
watch(() => props.collection, async collection => {
  controller?.abort(); release();
  const session = getSession();
  if (!session || !collection) return;
  const current = new AbortController(); controller = current;
  try {
    const response = await fetch("/api/recall/photos/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session, collection }), signal: current.signal });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) return;
    const blob = await response.blob();
    if (!current.signal.aborted) url.value = URL.createObjectURL(blob);
  } catch { /* Text-only captures and failed image fetches retain their caption. */ }
}, { immediate: true });
onBeforeUnmount(() => { controller?.abort(); release(); });
</script>
<template>
  <img v-if="url" :src="url" :alt="caption || 'Saved photo'" :class="compact ? 'saved-photo saved-photo--compact' : 'saved-photo'" loading="lazy" />
</template>
