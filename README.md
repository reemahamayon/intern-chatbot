# Intern Helper: AI Chatbot for Intern Queries

A 24/7 AI assistant that answers intern questions about tasks, submissions, certificates and policies. Built as an internship project for the Internee.pk virtual internship program.

## Features

- AI chatbot that understands natural language questions
- Answers grounded in a knowledge base of FAQs, task guidelines and policies
- Sign up and log in with email and password or Google (Firebase Authentication)
- Chat is protected: only logged-in members can use it, and the server verifies every request
- Chat history saved per member in Firestore
- Contact form that stores messages in Firestore
- Searchable FAQs, Task Guidelines and Policies pages
- Responsive, professional interface that works on phones and laptops
- Built entirely with free tools

## Tech Stack

- **Backend:** Python, Flask
- **AI:** Groq API (free tier)
- **Authentication and database:** Firebase Authentication and Cloud Firestore
- **Frontend:** HTML, CSS and JavaScript (no framework)

## How It Works

1. A member logs in and asks a question in the chat.
2. The server checks the login and searches the knowledge base for relevant entries.
3. The question and the matching entries are sent to the AI model.
4. The answer is shown in the chat and saved to the member's history.

## Run It Locally

1. Clone the repository and open the folder.

2. Create and activate a virtual environment:

~~~
python -m venv venv
venv\Scripts\activate
~~~

3. Install the requirements:

~~~
pip install -r requirements.txt
~~~

4. Create a `.env` file (see `.env.example`) and add your own keys:

~~~
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b
FIREBASE_API_KEY=your_firebase_web_api_key_here
~~~

5. Put your own Firebase web app settings in `static/firebase-init.js`.

6. Start the app:

~~~
python app.py
~~~

7. Open http://127.0.0.1:5000 in your browser.

## Project Structure

~~~
intern-chatbot/
├── app.py                 Flask server and API
├── retrieval.py           Knowledge base search
├── knowledge_base.json    FAQs, task guidelines and policies
├── requirements.txt
├── templates/             HTML pages
└── static/                CSS and JavaScript
~~~

## Updating the Knowledge Base

Edit `knowledge_base.json`. The FAQs, Task Guidelines and Policies pages and the chatbot all read from this one file, so a single change updates everything. Restart the server after editing.

## Security Notes

- API keys are stored in `.env`, which is never uploaded to GitHub.
- The server verifies each member's Firebase login before answering.
- Each member is limited to a small number of messages per minute.
- Firestore security rules let each member read only their own chat history.

## Live Demo

Add your deployed link here.

## Author

Built by Reema Hamayon as part of the Internee.pk virtual internship.