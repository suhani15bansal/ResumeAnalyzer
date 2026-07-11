"""
Resume Analyzer API
--------------------
Scores a resume against a target job description using:
  - Semantic similarity (sentence-transformer embeddings / cosine similarity)
  - Keyword & technical-skill gap analysis
  - Action-verb, quantification, readability and format checks

Run locally:
    uvicorn main:app --reload

Deploy: see /README.md in the repo root.
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import re
import io
import os
from collections import Counter
from typing import Optional

app = FastAPI(title="Resume Analyzer API", version="2.0.0")

ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if ALLOWED_ORIGINS == "*" else ALLOWED_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Lazy-loaded semantic model ──────────────────────────────────────────────
# Loaded on first request (not at import time) so the API boots fast and only
# pays the model-load cost once, on demand. Cached in-process afterward.

_model = None
MODEL_NAME = os.environ.get("EMBEDDING_MODEL", "all-MiniLM-L6-v2")


def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def semantic_similarity(resume_text: str, jd_text: str) -> dict:
    """Cosine similarity between sentence-transformer embeddings of resume vs JD."""
    try:
        model = get_model()
        import numpy as np
        embeddings = model.encode([resume_text, jd_text], normalize_embeddings=True)
        cos_sim = float(np.dot(embeddings[0], embeddings[1]))
        # cos_sim in [-1, 1] (in practice ~[0, 1] for normal text) -> map to 0-100
        score = max(0.0, min(1.0, (cos_sim + 1) / 2 if cos_sim < 0 else cos_sim)) * 100
        return {
            "score": round(score, 1),
            "cosine_similarity": round(cos_sim, 4),
            "model": MODEL_NAME,
            "available": True,
        }
    except Exception as e:
        # Graceful fallback: if the model can't load (e.g. constrained deploy
        # environment), don't fail the whole request.
        return {"score": None, "cosine_similarity": None, "model": MODEL_NAME,
                 "available": False, "error": str(e)}


# ─── Helpers ────────────────────────────────────────────────────────────────

STOP_WORDS = {
    "a","an","the","and","or","but","in","on","at","to","for","of","with",
    "by","from","as","is","are","was","were","be","been","being","have",
    "has","had","do","does","did","will","would","could","should","may",
    "might","shall","can","need","this","that","these","those","i","we",
    "you","he","she","it","they","them","their","our","your","my","his",
    "her","its","not","no","nor","so","yet","both","either","neither",
    "each","few","more","most","other","some","such","than","too","very",
    "just","about","above","after","again","against","all","also","am",
    "any","because","before","between","during","here","how","if","into",
    "me","much","now","only","own","same","then","there","through","under",
    "until","up","while","who","whom","why","what","when","where","which"
}

ACTION_VERBS = [
    "achieved","built","collaborated","created","delivered","developed",
    "designed","drove","engineered","established","executed","generated",
    "implemented","improved","increased","launched","led","managed",
    "optimized","organized","produced","reduced","spearheaded","streamlined",
    "transformed","coordinated","facilitated","mentored","negotiated",
    "planned","presented","resolved","scaled","secured","supervised"
]

TECH_SKILLS = [
    "python","java","javascript","typescript","react","angular","vue",
    "node","nodejs","swift","kotlin","flutter","dart","sql","nosql",
    "mongodb","postgresql","mysql","redis","docker","kubernetes","aws",
    "azure","gcp","git","linux","rest","api","graphql","machine learning",
    "deep learning","tensorflow","pytorch","scikit","pandas","numpy",
    "data science","agile","scrum","ci/cd","devops","microservices",
    "cloud","backend","frontend","fullstack","ios","android","mobile",
    "fastapi","django","flask","spring","next.js","tailwind","figma"
]


def extract_text_from_bytes(data: bytes, filename: str) -> str:
    fname = filename.lower()
    if fname.endswith(".pdf"):
        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                return "\n".join(p.extract_text() or "" for p in pdf.pages)
        except Exception:
            pass
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(data))
            return "\n".join(p.extract_text() or "" for p in reader.pages)
        except Exception:
            return data.decode("utf-8", errors="ignore")
    elif fname.endswith(".docx"):
        try:
            import docx
            doc = docx.Document(io.BytesIO(data))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            return data.decode("utf-8", errors="ignore")
    else:
        return data.decode("utf-8", errors="ignore")


def tokenize(text: str) -> list:
    text = text.lower()
    words = re.findall(r'\b[a-z][a-z0-9+#.]*\b', text)
    return [w for w in words if w not in STOP_WORDS and len(w) > 1]


def extract_keywords(text: str, top_n: int = 30) -> list:
    tokens = tokenize(text)
    freq = Counter(tokens)
    total = sum(freq.values()) or 1
    results = []
    for word, count in freq.most_common(top_n):
        results.append({
            "word": word,
            "count": count,
            "frequency": round(count / total * 100, 2)
        })
    return results


def keyword_match_score(resume_text: str, jd_text: str) -> dict:
    resume_tokens = set(tokenize(resume_text))
    jd_tokens = tokenize(jd_text)
    jd_freq = Counter(jd_tokens)
    jd_unique = set(jd_tokens)

    matched = resume_tokens & jd_unique
    missing = jd_unique - resume_tokens

    top_jd = {w for w, _ in jd_freq.most_common(40)}
    top_matched = matched & top_jd
    top_missing = top_jd - resume_tokens

    if not jd_unique:
        return {"score": 0, "matched": [], "missing": [], "top_missing": []}

    score = len(top_matched) / len(top_jd) * 100 if top_jd else 0
    return {
        "score": round(score, 1),
        "matched": sorted(list(matched))[:30],
        "missing": sorted(list(missing))[:30],
        "top_missing": sorted(list(top_missing))[:20]
    }


def action_verb_score(resume_text: str) -> dict:
    lower = resume_text.lower()
    found = [v for v in ACTION_VERBS if re.search(r'\b' + v + r'\b', lower)]
    score = min(len(found) / 10 * 100, 100)
    missing = [v for v in ACTION_VERBS if v not in found][:10]
    return {"score": round(score, 1), "found": found, "suggested": missing[:8]}


def tech_skill_score(resume_text: str, jd_text: str) -> dict:
    lower_r = resume_text.lower()
    lower_j = jd_text.lower()
    jd_skills = [s for s in TECH_SKILLS if s in lower_j]
    if not jd_skills:
        found_in_resume = [s for s in TECH_SKILLS if s in lower_r]
        return {"score": min(len(found_in_resume) / 5 * 100, 100),
                "matched": found_in_resume[:10], "missing": []}
    matched = [s for s in jd_skills if s in lower_r]
    missing = [s for s in jd_skills if s not in lower_r]
    score = len(matched) / len(jd_skills) * 100 if jd_skills else 0
    return {"score": round(score, 1), "matched": matched, "missing": missing}


def readability_score(text: str) -> dict:
    sentences = re.split(r'[.!?]+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    words = re.findall(r'\b\w+\b', text)
    if not sentences or not words:
        return {"score": 50, "avg_sentence_length": 0, "word_count": 0,
                "sentence_count": 0, "feedback": "Could not analyze readability."}
    avg_len = len(words) / len(sentences)
    if 8 <= avg_len <= 20:
        score, feedback = 90, "Excellent sentence length for a resume."
    elif avg_len < 8:
        score, feedback = 70, "Some sentences may be too short. Add more detail."
    elif avg_len <= 30:
        score, feedback = 75, "Some sentences are long. Consider breaking them up."
    else:
        score, feedback = 55, "Sentences are too long. Use bullet points and concise language."
    return {"score": score, "avg_sentence_length": round(avg_len, 1),
            "word_count": len(words), "sentence_count": len(sentences), "feedback": feedback}


def quantification_score(resume_text: str) -> dict:
    numbers = re.findall(
        r'\b\d+[\d,\.]*\s*(%|x|k|m|million|billion|users|clients|projects|teams|members|years|months|days|hours|dollars|\$|€|£)?\b',
        resume_text.lower())
    score = min(len(numbers) / 8 * 100, 100)
    return {"score": round(score, 1), "quantified_achievements": len(numbers),
            "feedback": "Great use of numbers!" if len(numbers) >= 5
            else f"Add more quantifiable achievements. Found {len(numbers)}, aim for 5+."}


def format_score(resume_text: str) -> dict:
    issues = []
    score = 100
    if len(resume_text) < 200:
        issues.append("Resume seems too short.")
        score -= 20
    if len(resume_text) > 6000:
        issues.append("Resume may be too long (aim for 1-2 pages).")
        score -= 10
    sections = ["experience", "education", "skills", "summary", "objective",
                "projects", "certifications", "achievements"]
    found_sections = [s for s in sections if s in resume_text.lower()]
    if len(found_sections) < 3:
        issues.append("Missing key sections (Experience, Education, Skills).")
        score -= 15
    email_found = bool(re.search(r'\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b', resume_text))
    if not email_found:
        issues.append("No email address found.")
        score -= 10
    if not issues:
        issues.append("Format looks good!")
    return {"score": max(score, 0), "found_sections": found_sections, "issues": issues}


def generate_suggestions(sem, kw, av, ts, rd, qn, fmt) -> list:
    suggestions = []
    if sem["available"] and sem["score"] is not None and sem["score"] < 55:
        suggestions.append("🧠 Your resume's overall meaning doesn't closely match the job description. Consider mirroring its core responsibilities and terminology more closely.")
    if kw["score"] < 60:
        missing = kw["top_missing"][:5]
        if missing:
            suggestions.append(f"🔑 Add missing keywords: {', '.join(missing)}")
    if av["score"] < 60:
        verbs = av["suggested"][:4]
        suggestions.append(f"💪 Use stronger action verbs: {', '.join(verbs)}")
    if ts["score"] < 50 and ts["missing"]:
        suggestions.append(f"🛠️ Add missing tech skills: {', '.join(ts['missing'][:5])}")
    if qn["score"] < 60:
        suggestions.append("📊 " + qn["feedback"])
    if rd["score"] < 70:
        suggestions.append("✍️ " + rd["feedback"])
    for issue in fmt["issues"]:
        if issue != "Format looks good!":
            suggestions.append("📋 " + issue)
    if not suggestions:
        suggestions.append("✅ Your resume looks well-optimized for this job description!")
    return suggestions


def overall_score(sem_s, kw_s, av_s, ts_s, rd_s, qn_s, fmt_s) -> int:
    if sem_s is not None:
        return round(
            sem_s * 0.30 + kw_s * 0.20 + ts_s * 0.15 + av_s * 0.10 +
            qn_s * 0.10 + rd_s * 0.08 + fmt_s * 0.07
        )
    # Fallback weighting if the semantic model is unavailable
    return round(kw_s * 0.35 + av_s * 0.15 + ts_s * 0.20 + rd_s * 0.10 + qn_s * 0.10 + fmt_s * 0.10)


def grade(score: int) -> str:
    if score >= 85: return "A"
    if score >= 75: return "B"
    if score >= 65: return "C"
    if score >= 50: return "D"
    return "F"


# ─── Routes ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "Resume Analyzer API is running", "version": "2.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze")
async def analyze_resume(
    resume: UploadFile = File(...),
    job_description: str = Form(...)
):
    if not resume.filename:
        raise HTTPException(status_code=400, detail="No resume file provided.")

    allowed = {".pdf", ".docx", ".txt"}
    ext = "." + resume.filename.rsplit(".", 1)[-1].lower() if "." in resume.filename else ""
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Use: {', '.join(allowed)}")

    data = await resume.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    resume_text = extract_text_from_bytes(data, resume.filename)
    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="Could not extract text from resume.")

    jd_text = job_description.strip()
    if not jd_text:
        raise HTTPException(status_code=400, detail="Job description is empty.")

    sem = semantic_similarity(resume_text, jd_text)
    kw = keyword_match_score(resume_text, jd_text)
    av = action_verb_score(resume_text)
    ts = tech_skill_score(resume_text, jd_text)
    rd = readability_score(resume_text)
    qn = quantification_score(resume_text)
    fmt = format_score(resume_text)

    total = overall_score(sem["score"], kw["score"], av["score"], ts["score"],
                           rd["score"], qn["score"], fmt["score"])
    suggestions = generate_suggestions(sem, kw, av, ts, rd, qn, fmt)

    return {
        "overall_score": total,
        "grade": grade(total),
        "sections": {
            "semantic_similarity": {
                "score": sem["score"], "label": "Semantic Match",
                "cosine_similarity": sem["cosine_similarity"],
                "model": sem["model"], "available": sem["available"],
            },
            "keyword_match": {
                "score": kw["score"], "label": "Keyword Match",
                "matched_keywords": kw["matched"][:15],
                "missing_keywords": kw["top_missing"][:15]
            },
            "action_verbs": {
                "score": av["score"], "label": "Action Verbs",
                "found": av["found"], "suggested": av["suggested"]
            },
            "technical_skills": {
                "score": ts["score"], "label": "Technical Skills",
                "matched": ts["matched"], "missing": ts["missing"]
            },
            "readability": {
                "score": rd["score"], "label": "Readability",
                "word_count": rd["word_count"], "sentence_count": rd["sentence_count"],
                "avg_sentence_length": rd["avg_sentence_length"], "feedback": rd["feedback"]
            },
            "quantification": {
                "score": qn["score"], "label": "Quantified Achievements",
                "count": qn["quantified_achievements"], "feedback": qn["feedback"]
            },
            "format": {
                "score": fmt["score"], "label": "Format & Structure",
                "found_sections": fmt["found_sections"], "issues": fmt["issues"]
            }
        },
        "suggestions": suggestions,
        "resume_top_keywords": extract_keywords(resume_text, 20),
        "jd_top_keywords": extract_keywords(jd_text, 20),
        "resume_word_count": rd["word_count"]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)
