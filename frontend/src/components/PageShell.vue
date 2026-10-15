<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from "vue-router";
import { clearSession, getUser } from "../session.ts";

defineProps<{
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
}>();

const route = useRoute();
const router = useRouter();

function logout() {
  clearSession();
  void router.push("/");
}
</script>

<template>
  <div class="page-shell">
    <header class="page-header">
      <div class="header-row">
        <RouterLink v-if="showBack" :to="backTo ?? '/inbox'" class="back-link" aria-label="Back">
          ‹
        </RouterLink>
        <div v-else class="back-spacer" />
        <h1 class="page-title">{{ title }}</h1>
        <div class="back-spacer" />
      </div>
      <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      <div v-if="getUser() && !showBack" class="signed-in-row">
        <p class="signed-in">Signed in as {{ getUser() }}</p>
        <button type="button" class="btn-text btn-logout" @click="logout">Log out</button>
      </div>
    </header>

    <div class="page-body">
      <slot />
    </div>

    <nav v-if="getUser() && route.path !== '/'" class="bottom-nav">
      <RouterLink to="/inbox" class="nav-item" active-class="nav-item--active">Inbox</RouterLink>
      <RouterLink to="/saved" class="nav-item" active-class="nav-item--active">Saved</RouterLink>
      <RouterLink to="/add" class="nav-item" active-class="nav-item--active">Add</RouterLink>
    </nav>
  </div>
</template>
