<script setup lang="ts">
import { useRouter } from "vue-router";
import { grantPhotosAccess, getUser } from "../session.ts";

const router = useRouter();

function allow() {
  grantPhotosAccess();
  void router.replace("/inbox");
}

function notNow() {
  void router.replace("/inbox");
}

function cancel() {
  void router.replace("/");
}
</script>

<template>
  <div class="phone-frame welcome">
    <header class="welcome-header"><h1 class="brand-large">Recall.</h1><p class="muted">Your photos, a little more useful.</p></header>
    <section class="card"><h2>Choose what to remember</h2><p>Pick photos to save the things you want to return to.</p><button class="btn-primary btn-block" @click="allow">Get started</button></section>
  </div>
</template>
