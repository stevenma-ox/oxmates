# Scholars — Exclusive Dating for Oxford

An exclusive matching app for Oxford University students. Only `@ox.ac.uk` emails accepted.

## Stack

- **Frontend**: React 19, Tailwind CSS, Shadcn/ui, Framer Motion
- **Backend**: FastAPI, MongoDB, JWT auth
- **AI**: Claude Sonnet (icebreaker generation)

## Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --reload
```

### Frontend
```bash
cd frontend
yarn install
yarn start
```

## Environment Variables

Copy `.env.example` and fill in your values:
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

See [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for full documentation.
