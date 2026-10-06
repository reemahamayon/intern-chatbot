import { auth, googleProvider } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const googleBtn = document.getElementById("googleBtn");
const forgotLink = document.getElementById("forgotLink");
const msgBox = document.getElementById("formMsg");

let working = false;

function getNextUrl() {
  const next = new URLSearchParams(window.location.search).get("next");
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/chat";
}

function showMsg(type, text) {
  msgBox.className = "form-msg " + type;
  msgBox.textContent = text;
}

function clearMsg() {
  msgBox.className = "form-msg";
  msgBox.textContent = "";
}

function friendlyError(error) {
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try logging in instead.";
    case "auth/weak-password":
      return "Your password is too weak. Use at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "The Google window was closed before finishing. Please try again.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Please allow pop-ups and try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Network problem. Please check your internet connection.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function setLoading(button, loading, label) {
  if (!button) return;
  button.disabled = loading;
  button.dataset.label = button.dataset.label || button.textContent;
  button.textContent = loading ? label : button.dataset.label;
}

// Already logged in? Skip the form.
onAuthStateChanged(auth, (user) => {
  if (user && !working) {
    window.location.replace(getNextUrl());
  }
});

if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMsg();

    const name = document.getElementById("sName").value.trim();
    const email = document.getElementById("sEmail").value.trim();
    const password = document.getElementById("sPassword").value;
    const confirm = document.getElementById("sConfirm").value;
    const button = document.getElementById("sSubmit");

    if (name.length < 2) return showMsg("error", "Please enter your full name.");
    if (password.length < 6) return showMsg("error", "Password must be at least 6 characters.");
    if (password !== confirm) return showMsg("error", "The two passwords do not match.");

    working = true;
    setLoading(button, true, "Creating account...");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      window.location.replace(getNextUrl());
    } catch (error) {
      working = false;
      setLoading(button, false);
      showMsg("error", friendlyError(error));
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearMsg();

    const email = document.getElementById("lEmail").value.trim();
    const password = document.getElementById("lPassword").value;
    const button = document.getElementById("lSubmit");

    if (!email || !password) return showMsg("error", "Please enter your email and password.");

    working = true;
    setLoading(button, true, "Logging in...");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.replace(getNextUrl());
    } catch (error) {
      working = false;
      setLoading(button, false);
      showMsg("error", friendlyError(error));
    }
  });
}

if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    clearMsg();
    working = true;
    try {
      await signInWithPopup(auth, googleProvider);
      window.location.replace(getNextUrl());
    } catch (error) {
      working = false;
      showMsg("error", friendlyError(error));
    }
  });
}

if (forgotLink) {
  forgotLink.addEventListener("click", async (event) => {
    event.preventDefault();
    clearMsg();
    const email = document.getElementById("lEmail").value.trim();
    if (!email) return showMsg("error", "Type your email above first, then click Forgot password.");
    try {
      await sendPasswordResetEmail(auth, email);
      console.log("Reset request accepted for:", email);
      showMsg("success", "If an email/password account exists for " + email + ", a reset link has been sent. Check your inbox and spam folder.");
    } catch (error) {
      console.error("Reset error:", error.code, error.message);
      if (error.code === "auth/invalid-email") return showMsg("error", "Please enter a valid email address.");
      if (error.code === "auth/too-many-requests") return showMsg("error", "Too many attempts. Please wait a few minutes and try again.");
      if (error.code === "auth/network-request-failed") return showMsg("error", "Network problem. Please check your internet connection.");
      showMsg("error", "Could not send the reset email. Please try again.");
    }
  });
}