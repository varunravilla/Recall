<script setup lang="ts">
import { getSession } from "./session.ts";
import { useRoute } from "vue-router";
const route = useRoute();
import { RouterView } from "vue-router";
</script>

<template>
  <RouterView v-slot="{ Component }">
    <KeepAlive :key="route.path === '/' ? 'signed-out' : (getSession() ?? 'signed-out')" include="AddView"><component :is="Component" /></KeepAlive>
  </RouterView>
</template>
