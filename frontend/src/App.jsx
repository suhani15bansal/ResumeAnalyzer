import { useState, useCallback, useRef } from 'react';
import ScoreGauge from './components/ScoreGauge.jsx';
import DiffKeywords from './components/DiffKeywords.jsx';
import SectionCard from './components/SectionCard.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const LOADING_LINES = [
  '$ extracting text from resume...',
  '$ tokenizing job description...',
  '$ computing sentence embeddings...',
  '$ running cosine similarity...',
  '$ diffing keyword coverage...',
  '$ scoring format & structure...',
  '$ compiling suggestions...',
];

function TerminalLoader() {
  return (
    <div className="border border-line rounded-lg bg-panel p-6 font-mono text-sm">
      <div className="flex gap-1.5 mb-4">
        <span className="w-2.5 h-2.5 rounded-full bg-del/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-add/70" />
      </div>
      {LOADING_LINES.map((line, i) => (
        <div
          key={line}
          className="text-muted animate-rise"
          style={{ animationDelay: `${i * 220}ms`, animationFillMode: 'both' }}
        >
          {line}
        </div>
      ))}
      <div className="text-add mt-1">
        <span className="cursor-blink">▍</span>
      </div>
    </div>
  );
}

function UploadZone({ file, setFile }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, [setFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer border border-dashed rounded-lg p-8 text-center transition-colors
        ${dragOver ? 'border-amber bg-amber/5' : 'border-line hover:border-muted'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
      />
      {file ? (
        <div className="font-mono text-sm">
          <span className="text-add">✓</span>{' '}
          <span className="text-ink">{file.name}</span>
          <div className="text-xs text-muted mt-1">
            {(file.size / 1024).toFixed(0)} KB — click to replace
          </div>
        </div>
      ) : (
        <div className="font-mono text-sm text-muted">
          <div className="text-2xl mb-2">↑</div>
          drop resume here — .pdf, .docx or .txt
          <div className="text-xs mt-1">max 5MB</div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [file, setFile] = useState(null);
  const [jd, setJd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const resultsRef = useRef(null);

  const canSubmit = file && jd.trim().length > 20 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const form = new FormData();
      form.append('resume', file);
      form.append('job_description', jd);
      const res = await fetch(`${API_URL}/analyze`, { method: 'POST', body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `Request failed (${res.status})`);
      }
      const data = await res.json();
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      setError(e.message || 'Something went wrong. Is the API running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink">
      {/* NAV */}
      <nav className="border-b border-line">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-mono text-sm tracking-tight">
            <span className="text-add">resume</span>
            <span className="text-muted">diff</span>
          </div>
          <div className="font-mono text-xs text-muted hidden sm:block">
            semantic scoring · keyword diff · v2.0
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="max-w-5xl mx-auto px-6 pt-16 pb-12">
        <div className="font-mono text-xs text-amber mb-4 tracking-widest">
          RESUME × JOB DESCRIPTION
        </div>
        <h1 className="text-4xl sm:text-5xl font-sans font-extrabold leading-[1.05] tracking-tight max-w-2xl">
          Review your resume like a{' '}
          <span className="text-add">pull request</span>.
        </h1>
        <p className="text-muted mt-5 max-w-xl leading-relaxed">
          Paste a job description, drop in your resume, and get a real
          diff — sentence-embedding semantic similarity, missing keywords,
          skill gaps, and concrete lines to change. No fluff, just the score
          and the fix.
        </p>
      </header>

      {/* FORM */}
      <main className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-2 gap-5">
          <div>
            <label className="font-mono text-[11px] text-muted tracking-wide block mb-2">
              01 · RESUME
            </label>
            <UploadZone file={file} setFile={setFile} />
          </div>
          <div>
            <label className="font-mono text-[11px] text-muted tracking-wide block mb-2">
              02 · JOB DESCRIPTION
            </label>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job posting here..."
              rows={7}
              className="w-full bg-panel border border-line rounded-lg p-4 text-sm text-ink placeholder:text-muted/60 resize-none focus:border-amber outline-none font-sans leading-relaxed"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="font-mono text-sm px-5 py-2.5 rounded-md bg-add text-canvas font-semibold disabled:bg-line disabled:text-muted disabled:cursor-not-allowed hover:bg-add/90 transition-colors"
          >
            {loading ? 'analyzing...' : 'run analysis →'}
          </button>
          {!file && (
            <span className="text-xs text-muted font-mono">add a resume to begin</span>
          )}
          {file && jd.trim().length <= 20 && (
            <span className="text-xs text-muted font-mono">job description looks short</span>
          )}
        </div>

        {error && (
          <div className="mt-6 border border-del/40 bg-delDim rounded-lg p-4 text-sm text-del font-mono">
            ✕ {error}
          </div>
        )}

        {loading && <div className="mt-10"><TerminalLoader /></div>}

        {result && (
          <div ref={resultsRef} className="mt-14 space-y-8">
            <div className="flex flex-col sm:flex-row items-center gap-8 border border-line rounded-lg bg-panel p-8">
              <ScoreGauge score={result.overall_score} grade={result.grade} />
              <div className="flex-1">
                <h2 className="font-mono text-sm text-muted tracking-wide mb-2">OVERALL MATCH</h2>
                <p className="text-ink leading-relaxed max-w-md">
                  {result.overall_score >= 85
                    ? "Strong match. This resume speaks the job's language."
                    : result.overall_score >= 65
                    ? 'Solid foundation — a few targeted edits will close the gap.'
                    : 'Meaningful gaps between this resume and the role. See suggestions below.'}
                </p>
                {result.sections.semantic_similarity.available && (
                  <p className="text-xs text-muted font-mono mt-4">
                    semantic cosine similarity: {result.sections.semantic_similarity.cosine_similarity} ·
                    model: {result.sections.semantic_similarity.model}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h2 className="font-mono text-xs text-muted tracking-widest mb-3">SUGGESTED CHANGES</h2>
              <div className="border border-line rounded-lg bg-panel divide-y divide-line">
                {result.suggestions.map((s, i) => (
                  <div key={i} className="p-4 text-sm leading-relaxed animate-rise" style={{ animationDelay: `${i * 60}ms` }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <SectionCard
                title="SEMANTIC MATCH"
                score={result.sections.semantic_similarity.score}
                meta="Embedding cosine similarity between resume and JD"
              >
                <p className="text-xs text-muted">
                  {result.sections.semantic_similarity.available
                    ? 'Measures overall conceptual overlap, not just word matches.'
                    : 'Model unavailable on this deployment — falling back to keyword-based scoring.'}
                </p>
              </SectionCard>

              <SectionCard
                title="TECHNICAL SKILLS"
                score={result.sections.technical_skills.score}
              >
                <DiffKeywords
                  matched={result.sections.technical_skills.matched}
                  missing={result.sections.technical_skills.missing}
                />
              </SectionCard>

              <SectionCard
                title="KEYWORD MATCH"
                score={result.sections.keyword_match.score}
                meta="Top terms from the job description"
              >
                <DiffKeywords
                  matched={result.sections.keyword_match.matched_keywords}
                  missing={result.sections.keyword_match.missing_keywords}
                />
              </SectionCard>

              <SectionCard
                title="ACTION VERBS"
                score={result.sections.action_verbs.score}
              >
                <DiffKeywords
                  matched={result.sections.action_verbs.found}
                  missing={result.sections.action_verbs.suggested}
                />
              </SectionCard>

              <SectionCard
                title="QUANTIFICATION"
                score={result.sections.quantification.score}
                meta={`${result.sections.quantification.count} quantified achievements found`}
              >
                <p className="text-xs text-muted">{result.sections.quantification.feedback}</p>
              </SectionCard>

              <SectionCard
                title="READABILITY"
                score={result.sections.readability.score}
                meta={`${result.sections.readability.word_count} words · avg ${result.sections.readability.avg_sentence_length} words/sentence`}
              >
                <p className="text-xs text-muted">{result.sections.readability.feedback}</p>
              </SectionCard>

              <SectionCard
                title="FORMAT & STRUCTURE"
                score={result.sections.format.score}
                meta={`sections found: ${result.sections.format.found_sections.join(', ') || 'none'}`}
              >
                <ul className="text-xs text-muted space-y-1">
                  {result.sections.format.issues.map((iss, i) => (
                    <li key={i}>· {iss}</li>
                  ))}
                </ul>
              </SectionCard>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="max-w-5xl mx-auto px-6 py-8 text-xs font-mono text-muted flex justify-between">
          <span>resumediff</span>
          <span>python · sentence-transformers · fastapi · react</span>
        </div>
      </footer>
    </div>
  );
}
