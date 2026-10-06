import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvKGD80rml_rFVqUFYu9uTBq77ajx6bD4",
  authDomain: "intern-chatbot-b76a4.firebaseapp.com",
  projectId: "intern-chatbot-b76a4",
  storageBucket: "intern-chatbot-b76a4.firebasestorage.app",
  messagingSenderId: "540128431010",
  appId: "1:540128431010:web:47aa181d3d0f68fe1a80fb"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();