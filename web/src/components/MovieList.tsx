import { useState, type FormEvent } from 'react'
import type { Movie } from '../lib/supabase'
import { deleteMovie, updateMovie } from '../lib/movies'
import { avgScore } from '../lib/stats'
import { ScoreBars, ScorePicker } from './Scores'
import YearChips from './YearChips'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const yearOf = (m: Movie) => Number(m.date.slice(0, 4))

type Handlers = { onChanged: () => void; notify: (message: string) => void }

function DateBlock({ date }: { date: string }) {
  const [y, m, d] = date.split('-')
  return (
    <div className="date-block">
      <span className="day">{Number(d)}</span>
      <span className="mon">{MONTHS[Number(m) - 1]}</span>
      <span className="yr">{y}</span>
    </div>
  )
}

function EditCard({ movie, onDone, notify }: { movie: Movie; onDone: (changed: boolean) => void; notify: Handlers['notify'] }) {
  const [draft, setDraft] = useState(movie)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof Movie>(key: K, value: Movie[K]) => setDraft((d) => ({ ...d, [key]: value }))

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const name = draft.name.trim()
    if (!name) return setError('Invalid Movie Name')
    setSaving(true)
    try {
      const { id, ...changes } = draft
      await updateMovie(id, { ...changes, name })
      notify(`Updated ${name}`)
      onDone(true)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <form className="movie-card editing" onSubmit={onSubmit}>
      <div className="form-grid">
        <label className="field wide">
          <span>Movie name</span>
          <input value={draft.name} onChange={(e) => set('name', e.target.value)} required />
        </label>
        <label className="field">
          <span>Date</span>
          <input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} required />
        </label>
        <ScorePicker label="Gun" tone="gun" value={draft.gun_score} onChange={(v) => set('gun_score', v)} />
        <ScorePicker label="Team" tone="team" value={draft.team_score} onChange={(v) => set('team_score', v)} />
        <label className="field wide">
          <span>Comment</span>
          <textarea value={draft.comment ?? ''} onChange={(e) => set('comment', e.target.value)} rows={2} />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="card-actions">
        <button type="submit" className="primary sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" className="ghost sm" onClick={() => onDone(false)}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function MovieCard({ movie, onChanged, notify }: { movie: Movie } & Handlers) {
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const avg = avgScore(movie)

  if (editing) {
    return (
      <EditCard
        movie={movie}
        notify={notify}
        onDone={(changed) => {
          setEditing(false)
          if (changed) onChanged()
        }}
      />
    )
  }

  async function remove() {
    try {
      await deleteMovie(movie.id)
      notify(`Deleted ${movie.name}`)
      onChanged()
    } catch (err) {
      setError((err as Error).message)
      setConfirming(false)
    }
  }

  return (
    <article className="movie-card">
      <DateBlock date={movie.date} />
      <div className="movie-main">
        <div className="movie-head">
          <h3>{movie.name}</h3>
          {avg !== null && <span className="avg">{avg.toFixed(1)}</span>}
        </div>
        <ScoreBars gun={movie.gun_score} team={movie.team_score} />
        {movie.comment && <p className="comment">{movie.comment}</p>}
        {error && <p className="error">{error}</p>}
        <div className="card-actions">
          <button type="button" className="ghost sm" onClick={() => setEditing(true)}>
            Edit
          </button>
          {confirming ? (
            <>
              <button type="button" className="danger sm" onClick={remove}>
                Delete for real
              </button>
              <button type="button" className="ghost sm" onClick={() => setConfirming(false)}>
                Keep
              </button>
            </>
          ) : (
            <button type="button" className="ghost sm" onClick={() => setConfirming(true)}>
              Delete
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

export default function MovieList({ movies, onChanged, notify }: { movies: Movie[] } & Handlers) {
  const [year, setYear] = useState<number | null>(null)
  const [query, setQuery] = useState('')

  const years = [...new Set(movies.map(yearOf))].sort((a, b) => b - a)
  const q = query.trim().toLowerCase()
  const shown = movies.filter(
    (m) =>
      (year === null || yearOf(m) === year) &&
      (!q || m.name.toLowerCase().includes(q) || (m.comment ?? '').toLowerCase().includes(q)),
  )

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">The archive</p>
          <h2>
            Every movie we've watched <span className="count">{shown.length}</span>
          </h2>
        </div>
      </div>
      <div className="toolbar">
        <input
          type="search"
          className="search"
          placeholder="Search titles or comments…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <YearChips years={years} value={year} onChange={setYear} />
      </div>
      {!shown.length && <p className="empty">Nothing here yet.</p>}
      <div className="movie-grid">
        {shown.map((m) => (
          <MovieCard key={m.id} movie={m} onChanged={onChanged} notify={notify} />
        ))}
      </div>
    </section>
  )
}
