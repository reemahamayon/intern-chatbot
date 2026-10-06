import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const form = document.getElementById("contactForm");
const msg = document.getElementById("formMsg");
const sendBtn = document.getElementById("cSend");
const nameInput = document.getElementById("cName");
const emailInput = document.getElementById("cEmail");
const subjectInput = document.getElementById("cSubject");
const messageInput = document.getElementById("cMessage");

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function show(type, text) {
  msg.className = "form-msg " + type;
  msg.textContent = text;
}

// If the member is logged in, fill in their name and email for them
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  if (!nameInput.value && user.displayName) nameInput.value = user.displayName;
  if (!emailInput.value && user.email) emailInput.value = user.email;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  msg.className = "form-msg";

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const subject = subjectInput.value;
  const message = messageInput.value.trim();

  if (name.length < 2) return show("error", "Please enter your name.");
  if (!EMAIL_PATTERN.test(email)) return show("error", "Please enter a valid email address.");
  if (message.length < 10) return show("error", "Your message is too short. Please add more detail.");
  if (message.length > 2000) return show("error", "Your message is too long. Please shorten it.");

  sendBtn.disabled = true;
  sendBtn.textContent = "Sending...";

  try {
    await addDoc(collection(db, "contact_messages"), {
      name: name,
      email: email,
      subject: subject,
      message: message,
      userId: auth.currentUser ? auth.currentUser.uid : null,
      createdAt: serverTimestamp()
    });
    show("success", "Thank you! Your message has been sent.");
    messageInput.value = "";
  } catch (error) {
    console.error("Contact error:", error);
    show("error", "Could not send your message. Please try again.");
  }

  sendBtn.disabled = false;
  sendBtn.textContent = "Send message";
});