<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { clearSession, ensureSession, getSession, getUser, hasPhotosAccess } from "../session.ts";

const router = useRouter();
const name = ref("");
const password = ref("");
const register = ref(false);
const error = ref("");
const loading = ref(false);

onMounted(() => {
  name.value = getUser() ?? "";
  if (getSession() && getUser()) {
    void router.replace("/inbox");
  }
});

async function logIn() {
  error.value = "";
  loading.value = true;
  const sessionResult = await ensureSession(name.value, password.value, register.value);
  loading.value = false;
  if ("error" in sessionResult) {
    error.value = sessionResult.error;
    return;
  }
  await router.push("/inbox");
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
      <p class="muted">For the things you want to come back to.</p>
    </header>

    <form class="card" @submit.prevent="logIn">
      <label for="username" class="field-label">Username</label>
      <input id="username" v-model="name" placeholder="maya" autocomplete="username" required minlength="3" maxlength="40" />
      <label for="password" class="field-label">Password</label>
      <input id="password" v-model="password" type="password" :autocomplete="register ? 'new-password' : 'current-password'" required minlength="12" maxlength="128" aria-describedby="password-help" />
      <p id="password-help" class="muted">Passwords need at least 12 characters.</p>
      <button type="submit" class="btn-primary btn-block" :disabled="loading">{{ loading ? 'Please wait…' : register ? 'Create account' : 'Log in' }}</button>
      <button type="button" class="btn-text btn-block" @click="register = !register">{{ register ? 'Already have an account? Log in' : 'New here? Create an account' }}</button>
      <p v-if="getSession()" class="muted">Signed in as {{ getUser() }}.</p>
      <button v-if="getSession()" type="button" class="btn-text btn-block" @click="logout">Log out</button>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </form>
  </div>
</template>
