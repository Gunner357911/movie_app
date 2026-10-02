import { useState } from 'react'
import type { Movie } from '../lib/supabase'
import { deleteMovie, updateMovie } from '../lib/movies'

function EditRow({ movie, onDone }: { movie: Movie; onDone: (changed: boolean) => void }) {
  const [draft, setDraft] = useState(movie)
  const [error, setError] = useState<string | null>(null)
  const set = <K extends keyof Movie>(key: K, value: Movie[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const score = (v: string) => (v === '' ? null : Math.min(10, Math.max(0, Number(v))))

  async function save() {
    if (!draft.name.trim()) return setError('Invalid Movie Name')
    try {
      const { id, ...changes } = draft
      await updateMovie(id, { ...changes, name: changes.name.trim() })
      onDone(true)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <tr className="editing">
      <td>{movie.id}</td>
      <td>
        <input value={draft.name} onChange={(e) => set('name', e.target.value)} />
        {error && <p className="error">{error}</p>}
      </td>
      <td>
        <input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} />
      </td>
      <td>
        <input type="number" min={0} max={10} value={draft.gun_score ?? ''} onChange={(e) => set('gun_score', score(e.target.value))} />
      </td>
      <td>
        <input type="number" min={0} max={10} value={draft.team_score ?? ''} onChange={(e) => set('team_score', score(e.target.value))} />
      </td>
      <td>
        <textarea value={draft.comment} onChange={(e) => set('comment', e.target.value)} rows={2} />
      </td>
      <td className="actions">
        <button onClick={save}>Save</button>
        <button className="secondary" onClick={() => onDone(false)}>
          Cancel
        </button>
      </td>
    </tr>
  )
}

export default function HistoryTable({ movies, onChanged }: { movies: Movie[]; onChanged: () => void }) {
  const [year, setYear] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const yearOf = (m: Movie) => Number(m.date.slice(0, 4))
  const years = [...new Set(movies.map(yearOf))].sort((a, b) => b - a)
  const shown = year === null ? movies : movies.filter((m) => yearOf(m) === year)

  async function remove(id: number) {
    try {
      await deleteMovie(id)
      setMessage('Deleted ✅')
      onChanged()
    } catch (err) {
      setMessage((err as Error).message)
    }
    setConfirmDeleteId(null)
  }

  return (
    <section className="card">
      <h2>History</h2>
      <select value={year ?? ''} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}>
        <option value="">All years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      {message && <p className="success">{message}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Date</th>
              <th>Gun</th>
              <th>Team</th>
              <th>Comment</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {shown.map((m) =>
              m.id === editingId ? (
                <EditRow
                  key={m.id}
                  movie={m}
                  onDone={(changed) => {
                    setEditingId(null)
                    if (changed) {
                      setMessage('Updated ✅')
                      onChanged()
                    }
                  }}
                />
              ) : (
                <tr key={m.id}>
                  <td>{m.id}</td>
                  <td>{m.name}</td>
                  <td>{m.date}</td>
                  <td>{m.gun_score ?? '-'}</td>
                  <td>{m.team_score ?? '-'}</td>
                  <td className="comment">{m.comment}</td>
                  <td className="actions">
                    <button className="secondary" onClick={() => { setEditingId(m.id); setMessage(null) }}>
                      Edit
                    </button>
                    {confirmDeleteId === m.id ? (
                      <button className="danger" onClick={() => remove(m.id)}>
                        Confirm
                      </button>
                    ) : (
                      <button className="secondary" onClick={() => setConfirmDeleteId(m.id)}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
