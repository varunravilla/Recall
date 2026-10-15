import { createRouter, createWebHistory } from "vue-router";
import AddView from "./views/AddView.vue";
import InboxView from "./views/InboxView.vue";
import LibraryView from "./views/LibraryView.vue";
import PhotosPermissionView from "./views/PhotosPermissionView.vue";
import ReviewView from "./views/ReviewView.vue";
import SavedView from "./views/SavedView.vue";
import WelcomeView from "./views/WelcomeView.vue";
import { getSession, hasPhotosAccess } from "./session.ts";

function requireSession() {
  return getSession() ? true : { path: "/" };
}

/** After login, show Photos permission once before the main app (P1 flow). */
function requirePhotosOrInbox() {
  if (!getSession()) return { path: "/" };
  if (hasPhotosAccess()) return { path: "/inbox" };
  return true;
}

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: WelcomeView },
    {
      path: "/permission",
      component: PhotosPermissionView,
      beforeEnter: requirePhotosOrInbox,
    },
    { path: "/inbox", component: InboxView, beforeEnter: requireSession },
    { path: "/saved", component: LibraryView, beforeEnter: requireSession },
    { path: "/add", component: AddView, beforeEnter: requireSession },
    { path: "/review/:collection", component: ReviewView, beforeEnter: requireSession },
    { path: "/saved/:collection", component: SavedView, beforeEnter: requireSession },
  ],
});
