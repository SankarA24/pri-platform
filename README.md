# PRI — Prompt Intelligence Platform
### Web Development Edition

A platform that measures how effectively developers can control AI through prompts.

---

## Architecture

```
pri-platform/
├── backend/          # Express + Anthropic SDK (Node.js)
│   ├── index.js      # All API routes
│   ├── package.json
│   └── .env.example  # → copy to .env and add your key
└── frontend/         # React + Vite
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── lib/api.js          # All backend calls
    │   ├── components/
    │   │   ├── Layout.jsx      # Sidebar + topbar
    │   │   └── UI.jsx          # Shared components
    │   ├── pages/
    │   │   ├── ChallengePage.jsx   # Main challenge flow
    │   │   └── DashboardPage.jsx   # Stats + history
    │   └── styles/global.css
    ├── index.html
    ├── vite.config.js
    └── package.json
```

---

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY
npm run dev
# Runs on http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/challenges` | List all challenges |
| GET | `/challenge/:id` | Get single challenge |
| POST | `/session/start` | Start a new session |
| POST | `/evaluate/prompt` | Evaluate user's prompt (Claude) |
| GET | `/challenge/:id/ai-response` | Get glitch-injected code |
| POST | `/evaluate/feedback` | Evaluate bug feedback (Claude) |
| GET | `/dashboard` | Session analytics |

---

## The Flow

1. **Pick a challenge** — 4 web dev categories (Responsive Layouts, API Integration, React State, CSS Architecture)
2. **Write a prompt** — instruct an AI to solve the challenge
3. **Get evaluated** — Claude scores your prompt on 5 dimensions
4. **Review AI output** — see the AI's code with a real injected bug highlighted
5. **Find the bug** — submit your analysis
6. **Get your PRI Score** — Prompt Clarity + Bug Detection + Reasoning Depth

---

## Platform Recommendation

**Best editor for this project: [Bolt.new](https://bolt.new)**

Bolt.new supports:
- Full Node.js backend (Express)
- React + Vite frontend
- Multi-file editing
- Terminal for `npm install` and running servers
- Environment variable management

**How to import into Bolt:**
1. Go to https://bolt.new
2. Click "Import from folder" or paste files manually
3. Set `ANTHROPIC_API_KEY` in the environment variables panel
4. Run `npm install` in both `backend/` and `frontend/`
5. Start both servers

---

## Adding More Challenges

In `backend/index.js`, add to the `CHALLENGES` array:

```js
{
  id: "ch_005",
  category: "Your Category",
  difficulty: "easy" | "medium" | "hard",
  task: "Design a prompt that instructs an AI to...",
  tags: ["Tag1", "Tag2"],
  attempts: 0,
  avgScore: 0.60,
  glitch: {
    description: "What the injected bug is",
    bugLine: 15,
    hint: "A subtle hint for the user"
  }
}
```

Then add its code to `GLITCH_CODE`:

```js
ch_005: `// Your glitched code here
// Mark bug lines with: // ← BUG
`
```
