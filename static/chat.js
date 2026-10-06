import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const messagesEl = document.getElementById("messages");
const form = document.getElementById("chatForm");
const input = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChat");
const gate = document.getElementById("chatGate");

const MAX_SAVED = 60;

let currentUser = null;
let history = [];
let busy = false;

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatBot(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function firstName() {
  if (!currentUser) return "";
  const full = currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : "");
  return full.split(" ")[0];
}

function welcomeText() {
  const name = firstName();
  return (name ? "Hi " + name + "! " : "Hi! ") +
    "I'm Intern Helper. Ask me anything about your tasks, submissions, deadlines or internship policies.";
}

function historyRef() {
  return doc(db, "users", currentUser.uid, "chat", "history");
}

async function saveHistory() {
  if (!currentUser) return;
  try {
    await setDoc(historyRef(), {
      messages: history.slice(-MAX_SAVED),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Could not save chat history:", error);
  }
}

async function loadHistory() {
  try {
    const snap = await getDoc(historyRef());
    if (!snap.exists()) return [];
    const saved = snap.data().messages;
    if (!Array.isArray(saved)) return [];
    return saved.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string");
  } catch (error) {
    console.error("Could not load chat history:", error);
    return [];
  }
}

function addMessage(role, text, sources, isError) {
  const row = document.createElement("div");
  row.className = "msg " + role + (isError ? " error" : "");

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "You" : "IH";

  const body = document.createElement("div");
  const bubble = document.createElement("div");
  bubble.className = "text";
  if (role === "user") {
    bubble.textContent = text;
  } else {
    bubble.innerHTML = formatBot(text);
  }
  body.appendChild(bubble);

  if (sources && sources.length) {
    const wrap = document.createElement("div");
    wrap.className = "sources";
    sources.forEach((s) => {
      const tag = document.createElement("span");
      tag.textContent = s.type + ": " + s.title;
      wrap.appendChild(tag);
    });
    body.appendChild(wrap);
  }

  row.appendChild(avatar);
  row.appendChild(body);
  messagesEl.appendChild(row);
  scrollToBottom();
}

function showTyping() {
  const row = document.createElement("div");
  row.className = "msg bot";
  row.id = "typingRow";
  row.innerHTML =
    '<div class="avatar">IH</div><div><div class="text"><span class="typing"><i></i><i></i><i></i></span></div></div>';
  messagesEl.appendChild(row);
  scrollToBottom();
}

function hideTyping() {
  const row = document.getElementById("typingRow");
  if (row) row.remove();
}

function setComposerEnabled(enabled) {
  input.disabled = !enabled;
  sendBtn.disabled = !enabled;
  newChatBtn.disabled = !enabled;
}

function autoGrow() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 140) + "px";
}

function renderAll() {
  messagesEl.innerHTML = "";
  if (history.length === 0) {
    addMessage("bot", welcomeText());
    return;
  }
  history.forEach((turn) => {
    addMessage(turn.role === "user" ? "user" : "bot", turn.content);
  });
}

async function sendMessage(text) {
  text = (text || "").trim();
  if (!text || busy || !currentUser) return;

  const prior = history.slice(-6);
  addMessage("user", text);
  history.push({ role: "user", content: text });
  input.value = "";
  autoGrow();
  busy = true;
  sendBtn.disabled = true;
  showTyping();

  try {
    const token = await currentUser.getIdToken();
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ message: text, history: prior })
    });
    const data = await response.json();
    hideTyping();

    if (!response.ok) {
      history.pop();
      addMessage("bot", data.error || "Something went wrong. Please try again.", null, true);
    } else {
      addMessage("bot", data.reply, data.sources);
      history.push({ role: "assistant", content: data.reply });
      saveHistory();
    }
  } catch (error) {
    hideTyping();
    history.pop();
    addMessage("bot", "Could not reach the server. Please check your connection.", null, true);
  }

  busy = false;
  sendBtn.disabled = false;
  input.focus();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage(input.value);
  }
});

input.addEventListener("input", autoGrow);

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => sendMessage(chip.getAttribute("data-q")));
});

newChatBtn.addEventListener("click", async () => {
  history = [];
  await saveHistory();
  renderAll();
  input.focus();
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (!user) {
    history = [];
    messagesEl.innerHTML = "";
    setComposerEnabled(false);
    gate.classList.add("show");
    return;
  }

  gate.classList.remove("show");
  setComposerEnabled(false);
  messagesEl.innerHTML = '<div class="chat-loading">Loading your chat...</div>';
  history = await loadHistory();
  renderAll();
  setComposerEnabled(true);
  input.focus();
});