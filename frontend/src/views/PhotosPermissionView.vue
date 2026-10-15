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
  <div class="phone-frame permission-page">
    <header class="permission-header">
      <button type="button" class="btn-text" @click="cancel">Cancel</button>
      <span class="permission-header-title">Photos Permission</span>
      <span class="header-spacer" />
    </header>

    <h1 class="permission-headline">Turn screenshots into actions</h1>
    <p class="permission-lead">
      Recall finds new screenshots in your Photos library and brings them back when they become
      useful.
    </p>

    <div class="sample-card" aria-hidden="true">
      <div class="sample-card__label">northside.live</div>
      <div class="sample-card__title">FALL CONCERT</div>
      <p class="sample-card__meta">Tickets · Fri Oct 9 · 10 AM</p>
    </div>

    <p class="permission-lock muted">
      <span aria-hidden="true">🔒</span>
      Recall uses photo access to detect screenshots you save.
    </p>

    <p class="web-demo-note muted">
      <strong>Web MVP:</strong> After you allow access, Recall watches for new screenshots. This
      demo cannot read your real Photos library — use <strong>Add</strong> to paste a caption and
      simulate a detected screenshot.
    </p>

    <div class="permission-actions">
      <button type="button" class="btn-primary btn-block" @click="allow">Allow Photos Access</button>
      <button type="button" class="btn-secondary btn-block" @click="notNow">Not now</button>
    </div>

    <p v-if="getUser()" class="muted permission-user">Logged in as {{ getUser() }}</p>
  </div>
</template>
