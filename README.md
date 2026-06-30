# AI Citation Tracker 🚀

A modern, full-stack enterprise platform designed to track, score, and optimize how brand products and solutions are cited across AI search engines (such as Claude, ChatGPT, and Perplexity). 

Instead of traditional SQL databases, this application utilizes **Google Sheets** as a lightweight, real-time sync database layer (`sheets_client.py`, `client_ops.py`, `run_ops.py`), allowing team members to easily inspect or edit client targets in spreadsheet form while benefiting from a high-performance web interface.

---

## 🏗️ Architecture Breakdown

```
citation-tracker/
├── backend/
│   ├── main.py              ← FastAPI application server
│   ├── routers/             ← API route endpoints (clients, queries, reports)
│   ├── services/            ← Core engine (query_runner, claude_parser, summarizer, competitor_gap)
│   ├── sheets/              ← Google Sheets DB abstraction layer
│   ├── models/              ← Pydantic data schemas
│   └── requirements.txt
├── frontend/
│   ├── app/                 ← Next.js App Router (Dashboard, Client Details, Overview)
│   ├── components/          ← Reusable analytical UI cards and tables
│   ├── lib/                 ← API client bindings
│   └── types/               ← TypeScript interface models
└── .github/workflows/       ← Automated daily batch evaluation runners
```

---

## ✨ Features

- **🎯 Citation Score & Share of Voice**: Real-time evaluation of brand citation frequency, average ranking position, and sentiment distribution against key competitors.
- **⚡ Interactive AI Query Execution**: Run instant prompt tests across Claude or simulated AI engine models to analyze live responses.
- **📊 Competitor Gap Analysis**: Automatically identify prompt queries where competitors appear but your brand is omitted, with actionable optimization guidance.
- **📈 Trend Analytics**: Dynamic reporting on daily score changes and visibility metrics over time.
- **📄 Google Sheets Integration**: Zero complex DB setup! Connects directly to Google Sheets or operates seamlessly with an in-memory mock fallback out-of-the-box.

---

## 🚀 Getting Started

### 1. Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv
# On Windows: venv\Scripts\activate
# On Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python main.py
```
The backend server will launch at `http://localhost:8000`. You can explore interactive Swagger documentation at `http://localhost:8000/docs`.

### 2. Frontend Setup (Next.js)

```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser to view the application dashboard.

---

## 🔐 Google Sheets Configuration (Optional)
To link your live Google Sheet:
1. Create a Google Cloud Service Account and download `service_account.json`.
2. Place `service_account.json` inside the `backend/` directory.
3. Share your Google Sheet titled `"AI Citation Tracker DB"` with the service account client email.
*(Note: If `service_account.json` is absent, the backend automatically operates in Mock Mode with rich default demonstration datasets).*
