<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
const props = defineProps<{ open: boolean; title: string; busy: boolean; error?: string }>();
const emit = defineEmits<{ confirm: []; cancel: [] }>();
const dialog = ref<HTMLDialogElement>();
watch(() => props.open, async open => {
  await nextTick();
  if (open && !dialog.value?.open) dialog.value?.showModal();
  else if (!open && dialog.value?.open) dialog.value?.close();
});
function cancel() { if (!props.busy) emit("cancel"); }
</script>
<template>
  <Teleport to="body">
    <dialog ref="dialog" class="delete-dialog" aria-labelledby="delete-heading" @cancel.prevent="cancel">
      <span class="dialog-eyebrow">Remove from Recall</span>
      <h2 id="delete-heading">Delete this item?</h2>
      <p class="dialog-item-title">{{ title }}</p>
      <p class="muted">Its photo, saved details, and reminders will be deleted. This can’t be undone.</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="dialog-actions">
        <button class="btn-secondary" type="button" autofocus :disabled="busy" @click="cancel">Keep item</button>
        <button class="btn-danger" type="button" :disabled="busy" @click="emit('confirm')">{{ busy ? 'Deleting…' : 'Delete item' }}</button>
      </div>
    </dialog>
  </Teleport>
</template>
