import json
import re
from pathlib import Path

KB_PATH = Path(__file__).parent / "knowledge_base.json"

STOP_WORDS = {
    "a", "an", "the", "is", "are", "am", "was", "were", "do", "does", "did",
    "i", "me", "my", "we", "you", "your", "to", "of", "in", "on", "for",
    "and", "or", "it", "this", "that", "can", "how", "what", "when", "where",
    "will", "be", "with", "at", "by", "from", "about", "please", "tell",
}


def tokenize(text):
    """Lowercase the text and split it into useful words."""
    words = re.findall(r"[a-z0-9]+", text.lower())
    return [w for w in words if w not in STOP_WORDS and len(w) > 1]


def load_knowledge():
    """Read knowledge_base.json and flatten it into one list of entries."""
    with open(KB_PATH, encoding="utf-8") as f:
        data = json.load(f)

    entries = []

    for item in data.get("faqs", []):
        entries.append({
            "id": item["id"],
            "type": "FAQ",
            "title": item["question"],
            "text": item["answer"],
            "keywords": item.get("keywords", []),
        })

    for item in data.get("task_guidelines", []):
        entries.append({
            "id": item["id"],
            "type": "Task Guideline",
            "title": item["title"],
            "text": item["content"],
            "keywords": item.get("keywords", []),
        })

    for item in data.get("policies", []):
        entries.append({
            "id": item["id"],
            "type": "Policy",
            "title": item["title"],
            "text": item["content"],
            "keywords": item.get("keywords", []),
        })

    return entries


KNOWLEDGE = load_knowledge()


def score_entry(query_text, query_tokens, entry):
    """Give an entry a relevance score for the question."""
    title_tokens = set(tokenize(entry["title"]))
    body_tokens = set(tokenize(entry["text"]))
    score = 0

    for token in query_tokens:
        if token in title_tokens:
            score += 3
        if token in body_tokens:
            score += 1

    for keyword in entry["keywords"]:
        pattern = r"\b" + re.escape(keyword.lower()) + r"\b"
        if re.search(pattern, query_text):
            score += 4

    return score


def search_knowledge(query, top_k=3):
    """Return the most relevant entries for a question."""
    query_text = query.lower()
    query_tokens = set(tokenize(query))

    scored = []
    for entry in KNOWLEDGE:
        score = score_entry(query_text, query_tokens, entry)
        if score > 0:
            scored.append((score, entry))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [entry for _, entry in scored[:top_k]]


def format_context(entries):
    """Turn the found entries into text we can give to the AI."""
    if not entries:
        return "No matching information was found in the knowledge base."

    blocks = []
    for entry in entries:
        blocks.append(f"[{entry['type']}] {entry['title']}\n{entry['text']}")
    return "\n\n".join(blocks)


if __name__ == "__main__":
    print("Retrieval test. Type a question, or 'exit' to stop.")
    while True:
        question = input("\nYou: ").strip()
        if question.lower() == "exit":
            break
        results = search_knowledge(question)
        print("\n--- Found ---")
        print(format_context(results))