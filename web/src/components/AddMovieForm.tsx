import { useState, type FormEvent } from 'react'
import { addMovie } from '../lib/movies'

const today = () => new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD in local time

export default function AddMovieForm({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [date, setDate] = useState(today)
  const [gun, setGun] = useState(0)
  const [team, setTeam] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Invalid Movie Name')
    try {
      await addMovie({ name: trimmed, date, gun_score: gun, team_score: team, comment })
      setSaved(trimmed)
      setError(null)
      setOpen(false)
      setName('')
      setGun(0)
      setTeam(0)
      setComment('')
      onSaved()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  if (!open) {
    return (
      <div>
        {saved && <p className="success">Added: {saved}</p>}
        <button onClick={() => { setOpen(true); setSaved(null) }}>➕ Add Movie</button>
      </div>
    )
  }

  return (
    <form className="card form" onSubmit={onSubmit}>
      <h2>Add Movie</h2>
      <label>
        Movie Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Date
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label>
        Gun's Score: <b>{gun}</b>
        <input type="range" min={0} max={10} value={gun} onChange={(e) => setGun(Number(e.target.value))} />
      </label>
      <label>
        Team's Score: <b>{team}</b>
        <input type="range" min={0} max={10} value={team} onChange={(e) => setTeam(Number(e.target.value))} />
      </label>
      <label>
        Comment
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="submit">Save Movie</button>
        <button type="button" className="secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  )
}
