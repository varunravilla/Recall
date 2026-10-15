<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { clearSession, ensureSession, getSession, getUser, hasPhotosAccess } from "../session.ts";

const router = useRouter();
const name = ref("");
const error = ref("");
const loading = ref(false);

onMounted(() => {
  name.value = getUser() ?? "";
  if (getSession() && getUser()) {
    void router.replace(hasPhotosAccess() ? "/inbox" : "/permission");
  }
});

async function logIn() {
  error.value = "";
  loading.value = true;
  const sessionResult = await ensureSession(name.value);
  loading.value = false;
  if ("error" in sessionResult) {
    error.value = sessionResult.error;
    return;
  }
  await router.push("/permission");
}

function logout() {
  clearSession();
  name.value = "";
}
</script>

<template>
  <div class="phone-frame welcome">
    <header class="welcome-header">
      <h1 class="brand-large">Recall</h1>
      <p class="muted">Log in to continue.</p>
    </header>

    <section class="card">
      <label class="field-label">Your name</label>
      <input v-model="name" placeholder="name" autocomplete="name" @keyup.enter="logIn" />
      <button class="btn-primary btn-block" :disabled="loading" @click="logIn">Log in</button>
      <p v-if="getSession()" class="muted">Signed in as {{ getUser() }}.</p>
      <button v-if="getSession()" type="button" class="btn-text btn-block" @click="logout">Log out</button>
      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </div>
</template>
