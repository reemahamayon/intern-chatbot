import json
import os
import time
import urllib.request

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from groq import Groq

from retrieval import KB_PATH, format_context, search_knowledge

load_dotenv()

app = Flask(__name__)
CORS(app)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL_NAME = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
FIREBASE_API_KEY = os.getenv("FIREBASE_API_KEY")

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

TOKEN_CACHE_SECONDS = 300
RATE_LIMIT = 15
RATE_WINDOW_SECONDS = 60

_token_cache = {}
_rate_log = {}

SYSTEM_PROMPT = """You are the Intern Helper, a friendly and professional assistant \
that answers questions from interns about internship tasks, submissions and policies.

Rules:
- Answer using the KNOWLEDGE provided below whenever it is relevant.
- If the knowledge does not cover the question, say honestly that you are not sure \
and suggest the intern contact their mentor or support team. Never invent policies, \
deadlines or rules.
- Keep answers clear, short and encouraging. Use simple steps when explaining a process.
- Reply in the same language the intern writes in.
- If the question has nothing to do with the internship, politely bring the \
conversation back to internship topics.
"""


def load_kb():
    """Read the knowledge base file fresh, so edits show up immediately."""
    with open(KB_PATH, encoding="utf-8") as f:
        return json.load(f)


def verify_user(req):
    """Check the Firebase login token and return the user's id, or None."""
    header = req.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None

    token = header[7:].strip()
    if not token or not FIREBASE_API_KEY:
        return None

    now = time.time()
    cached = _token_cache.get(token)
    if cached and cached["expires"] > now:
        return cached["uid"]

    url = (
        "https://identitytoolkit.googleapis.com/v1/accounts:lookup?key="
        + FIREBASE_API_KEY
    )
    body = json.dumps({"idToken": token}).encode("utf-8")
    lookup = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(lookup, timeout=8) as response:
            data = json.loads(response.read().decode("utf-8"))
        users = data.get("users") or []
        if not users:
            return None
        uid = users[0].get("localId")
    except Exception as error:
        print("Login check failed:", error)
        return None

    _token_cache[token] = {"uid": uid, "expires": now + TOKEN_CACHE_SECONDS}
    if len(_token_cache) > 500:
        for key in [k for k, v in _token_cache.items() if v["expires"] <= now]:
            _token_cache.pop(key, None)
    return uid


def too_many_requests(uid):
    """Allow only a few messages per minute for each member."""
    now = time.time()
    recent = [t for t in _rate_log.get(uid, []) if now - t < RATE_WINDOW_SECONDS]
    if len(recent) >= RATE_LIMIT:
        _rate_log[uid] = recent
        return True
    recent.append(now)
    _rate_log[uid] = recent
    return False


# ---------- Pages ----------
@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat")
def chat_page():
    return render_template("chat.html")


@app.route("/faqs")
def faqs_page():
    return render_template("faqs.html", faqs=load_kb().get("faqs", []))


@app.route("/guidelines")
def guidelines_page():
    return render_template(
        "guidelines.html", guidelines=load_kb().get("task_guidelines", [])
    )


@app.route("/policies")
def policies_page():
    return render_template("policies.html", policies=load_kb().get("policies", []))


@app.route("/contact")
def contact_page():
    return render_template("contact.html")


@app.route("/login")
def login_page():
    return render_template("login.html")


@app.route("/signup")
def signup_page():
    return render_template("signup.html")


# ---------- API ----------
@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": MODEL_NAME, "key_loaded": bool(client)})


@app.route("/api/chat", methods=["POST"])
def chat():
    uid = verify_user(request)
    if not uid:
        return jsonify({"error": "Please log in to use the chat."}), 401

    if too_many_requests(uid):
        return jsonify(
            {"error": "You are sending messages too fast. Please wait a moment."}
        ), 429

    if client is None:
        return jsonify({"error": "The server is missing its Groq API key."}), 500

    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    history = data.get("history") or []

    if not message:
        return jsonify({"error": "Please type a question."}), 400
    if len(message) > 1000:
        return jsonify({"error": "Your message is too long. Please shorten it."}), 400

    entries = search_knowledge(message)
    context = format_context(entries)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + "\nKNOWLEDGE:\n" + context}
    ]

    for turn in history[-6:]:
        role = turn.get("role")
        content = str(turn.get("content", ""))[:1000]
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": message})

    try:
        completion = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
            temperature=0.3,
            max_tokens=2000,
        )
        reply = (completion.choices[0].message.content or "").strip()
        if not reply:
            reply = "Sorry, I could not put an answer together. Please try asking again."
        sources = [{"type": e["type"], "title": e["title"]} for e in entries]
        return jsonify({"reply": reply, "sources": sources})
    except Exception as error:
        print("Groq error:", error)
        return jsonify(
            {"error": "The assistant is busy right now. Please try again in a moment."}
        ), 502


if __name__ == "__main__":
    app.run(debug=True, port=5000)