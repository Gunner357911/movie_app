import { useState } from 'react'
import type { Movie } from '../lib/supabase'
import { updateMovie } from '../lib/movies'
import { needsScore } from '../lib/stats'
import { ScorePicker } from './Scores'
import { DateBlock } from './MovieList'

type Handlers = { onChanged: () => void; notify: (message: string) => void }

const COLLAPSED = 3

function ReminderCard({ movie, onChanged, notify }: { movie: Movie } & Handlers) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // One tap saves that score; the card disappears once both are in.
  async function save(field: 'gun_score' | 'team_score', value: number | null) {
    if (value === null || saving) return
    setSaving(true)
    try {
      await updateMovie(movie.id, { [field]: value })
      notify(`${field === 'gun_score' ? 'Gun' : 'Team'} gave ${movie.name} a ${value}`)
      onChanged()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className={`movie-card reminder-card ${saving ? 'saving' : ''}`}>
      <div className="card-side">
        <DateBlock date={movie.date} />
        {movie.poster_url && <img className="poster" src={movie.poster_url} alt="" loading="lazy" />}
      </div>
      <div className="movie-main">
        <h3>{movie.name}</h3>
        {movie.gun_score === null && (
          <ScorePicker label="Gun" tone="gun" value={null} onChange={(v) => save('gun_score', v)} />
        )}
        {movie.team_score === null && (
          <ScorePicker label="Team" tone="team" value={null} onChange={(v) => save('team_score', v)} />
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </article>
  )
}

export default function RateReminder({ movies, onChanged, notify }: { movies: Movie[] } & Handlers) {
  const [showAll, setShowAll] = useState(false)
  const pending = needsScore(movies)
  if (!pending.length) return null

  const shown = showAll ? pending : pending.slice(0, COLLAPSED)

  return (
    <section className="panel reminder">
      <div className="section-head">
        <div>
          <p className="eyebrow">🎟 Don't forget</p>
          <h2>
            Waiting for your score <span className="count">{pending.length}</span>
          </h2>
        </div>
      </div>
      <div className="movie-grid">
        {shown.map((m) => (
          <ReminderCard key={m.id} movie={m} onChanged={onChanged} notify={notify} />
        ))}
      </div>
      {pending.length > COLLAPSED && (
        <button type="button" className="ghost sm reminder-more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show less' : `Show all ${pending.length}`}
        </button>
      )}
    </section>
  )
}
