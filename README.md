# FlowDesk 🗂️

AI-powered task management app that processes meeting transcripts and automatically extracts actionable tasks.

## About

FlowDesk helps teams turn meeting recordings into organized tasks. Upload a transcript, and the AI automatically identifies action items, assigns them to projects and categories, and adds them to your task board.

## Features

- 📋 **Dashboard** — Task overview with stats and charts
- 🤖 **AI Transcription Processing** — Auto-extract tasks from meeting transcripts
- ✅ **Approval Screen** — Review and approve AI-generated tasks before saving
- 🗂️ **Kanban Board** — Drag-and-drop task management
- 🗄️ **Archive** — Full transcript history with search
- 📱 **Responsive** — Works on desktop, tablet and mobile
- ♿ **Accessible** — WCAG 2.2 AA compliant

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | SQLite (node:sqlite) |
| AI | OpenAI API |

## Getting Started

### Prerequisites
- Node.js v24+
- OpenAI API key

### Installation

```bash
# Clone the repository
git clone https://github.com/romnoy/FlowDesk.git
cd FlowDesk

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Configuration

Create a `.env` file in the `server` directory:

```env
OPENAI_API_KEY=your_api_key_here
```

### Running the App

```bash
# Start the server (port 3001)
cd server
npm run dev

# Start the client (port 5173)
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

```
FlowDesk/
├── client/          # React frontend
│   └── src/
│       └── components/
├── server/          # Node.js backend
│   ├── routes/
│   ├── db/
│   └── lib/
└── .agents/         # AI agent configuration
    ├── rules/
    └── skills/
```

## AI-Driven Development

This project was built as part of an AI-Driven Development course. The `.agents` folder contains the configuration used to guide the AI agent throughout development:

- `rules/agent.md` — Agent behavior guidelines
- `rules/rules.md` — Tech stack rules
- `skills/` — Reusable AI skills (UI generation, testing, accessibility)

---

Built by Noy Romani
