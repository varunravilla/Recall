<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from "vue-router";
import { clearSession, getUser } from "../session.ts";
defineProps<{ title: string; subtitle?: string; showBack?: boolean; backTo?: string }>();
const route = useRoute();
const router = useRouter();
function logout() { clearSession(); void router.push("/"); }
</script>
<template>
  <div class="page-shell">
    <a href="#main-content" class="skip-link">Skip to content</a>
    <header class="page-header">
      <div class="brand-row">
        <RouterLink to="/inbox" class="wordmark" aria-label="Recall home">Recall<span class="brand-dot" aria-hidden="true">.</span></RouterLink>
        <div v-if="getUser()" class="account-menu"><span>{{ getUser() }}</span><button type="button" class="btn-text" @click="logout">Log out</button></div>
      </div>
      <div class="heading-row">
        <RouterLink v-if="showBack" :to="backTo ?? '/inbox'" class="back-link" aria-label="Back">←</RouterLink>
        <div><h1 class="page-title">{{ title }}</h1><p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p></div>
      </div>
    </header>
    <main id="main-content" class="page-body" tabindex="-1"><slot /></main>
    <nav v-if="getUser() && route.path !== '/'" class="bottom-nav" aria-label="Main navigation">
      <RouterLink to="/inbox" class="nav-item" active-class="nav-item--active"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16l2 12v4H2v-4L4 4Zm-2 12h6l2 3h4l2-3h6M7 8h10M7 12h10" /></svg><span>Inbox</span></RouterLink>
      <RouterLink to="/saved" class="nav-item" active-class="nav-item--active"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4V3Z" /></svg><span>Saved</span></RouterLink>
      <RouterLink to="/add" class="nav-item" active-class="nav-item--active"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M12 7v10M7 12h10"/></svg><span>Add photos</span></RouterLink>
    </nav>
  </div>
</template>
