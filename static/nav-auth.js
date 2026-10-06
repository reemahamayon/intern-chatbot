import { auth } from "./firebase-init.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const desktopBox = document.getElementById("authDesktop");
const mobileBox = document.getElementById("authMobile");

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function guestHtml() {
  return '<a href="/login" class="btn btn-ghost">Log in</a>' +
         '<a href="/signup" class="btn btn-primary">Sign up</a>';
}

function userHtml(user) {
  const fullName = user.displayName || (user.email ? user.email.split("@")[0] : "Member");
  const firstName = fullName.split(" ")[0];
  const initial = firstName.charAt(0).toUpperCase();
  return '<span class="user-chip">' +
           '<span class="user-avatar">' + escapeHtml(initial) + "</span>" +
           '<span class="user-name">' + escapeHtml(firstName) + "</span>" +
         "</span>" +
         '<button type="button" class="btn btn-outline logout-btn">Log out</button>';
}

function render(user) {
  const html = user ? userHtml(user) : guestHtml();
  [desktopBox, mobileBox].forEach((box) => {
    if (!box) return;
    box.innerHTML = html;
    box.classList.remove("pending");
  });
}

[desktopBox, mobileBox].forEach((box) => {
  if (!box) return;
  box.addEventListener("click", async (event) => {
    if (event.target.classList.contains("logout-btn")) {
      await signOut(auth);
      window.location.href = "/";
    }
  });
});

onAuthStateChanged(auth, (user) => {
  render(user);
  window.currentUser = user;
  window.dispatchEvent(new CustomEvent("auth-changed", { detail: user }));
});