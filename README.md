# resumediff — AI-Powered Resume Analyzer (Web)

A resume-vs-job-description scorer, rebuilt as a deployable web app from the
original iOS + FastAPI project. Same backend brain, new front end — no Mac
required.

Scores a resume against a target job description using:
- **Semantic similarity** — sentence-transformer embeddings (`all-MiniLM-L6-v2`) + cosine similarity
- **Keyword & skill-gap analysis** — matched / missing terms, technical skills
- **Action verbs, quantification, readability, and format checks**

## Architecture

```
resume-web/
├── backend/            FastAPI + sentence-transformers → Render
│   ├── main.py
│   ├── requirements.txt
│   ├── render.yaml
│   └── start.sh         (local dev)
└── frontend/            React + Vite + Tailwind → Vercel
    ├── src/App.jsx
    ├── src/components/
    └── vercel.json
```

## Run locally

**Backend**
```bash
cd backend
chmod +x start.sh
./start.sh
# → http://localhost:8000/docs
```
First request will download the embedding model (~90MB), cached after that.

**Frontend** (new terminal)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```
The frontend defaults to `http://localhost:8000` for the API in dev — no
`.env` needed locally.

## Deploy

### 1. Backend → Render (free tier)
1. Push this repo to GitHub.
2. On [render.com](https://render.com) → **New → Web Service** → connect the repo, root directory `backend`.
3. Render will detect `render.yaml` automatically (build/start commands, Python version). If not, set manually:
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Deploy. Note the URL, e.g. `https://resumediff-api.onrender.com`.

   **Note on free tier:** the embedding model (~90MB + torch runtime) fits
   in Render's free 512MB instance but it's tight, and free instances spin
   down when idle — the first request after a nap can take 30–60s while the
   model reloads. For a smoother demo (e.g. showing this to recruiters),
   consider Render's $7/mo Starter plan, or set `EMBEDDING_MODEL` env var to
   a smaller model if you hit memory limits.

### 2. Frontend → Vercel
1. On [vercel.com](https://vercel.com) → **New Project** → import the repo, root directory `frontend`.
2. Framework preset: Vite (auto-detected).
3. Add environment variable `VITE_API_URL` = your Render backend URL from step 1.
4. Deploy. You'll get a URL like `https://resumediff.vercel.app`.

That's it — two free-tier services, one live link for your resume/portfolio.

## API Reference

### `POST /analyze`
`multipart/form-data`: `resume` (PDF/DOCX/TXT, max 5MB), `job_description` (string)

Returns overall score (0–100), letter grade, per-dimension scores
(semantic match, keyword match, technical skills, action verbs,
quantification, readability, format), matched/missing keyword lists, and
actionable suggestions.

### `GET /health`
Liveness check, returns `{"status": "ok"}`.

## Tech stack

**Backend:** Python, FastAPI, sentence-transformers, pdfplumber, python-docx
**Frontend:** React, Vite, Tailwind CSS
**Deploy:** Render (API) + Vercel (static frontend)
