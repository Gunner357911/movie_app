import { useEffect, useRef, useState, type FormEvent } from 'react'
import { addMovie } from '../lib/movies'
import { ScorePicker } from './Scores'

const today = () => new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD in local time

// Mounted only while open, so the form starts fresh each time.
export default function AddMovieDialog({ onClose, onSaved }: { onClose: () => void; onSaved: (name: string) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [date, setDate] = useState(today)
  const [gun, setGun] = useState<number | null>(null)
  const [team, setTeam] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    nameRef.current?.focus() // showModal would otherwise focus the close button
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Invalid Movie Name')
    setSaving(true)
    try {
      await addMovie({ name: trimmed, date, gun_score: gun, team_score: team, comment })
      onSaved(trimmed)
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={ref}
      className="sheet"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current.close() // backdrop click
      }}
    >
      <form className="sheet-body" onSubmit={onSubmit}>
        <div className="sheet-head">
          <div>
            <p className="eyebrow">New screening</p>
            <h2>Add a movie</h2>
          </div>
          <button type="button" className="icon" aria-label="Close" onClick={() => ref.current?.close()}>
            ✕
          </button>
        </div>
        <div className="form-grid">
          <label className="field wide">
            <span>Movie name</span>
            <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Dune: Part Two" required />
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <ScorePicker label="Gun's score" tone="gun" value={gun} onChange={setGun} />
          <ScorePicker label="Team's score" tone="team" value={team} onChange={setTeam} />
          <label className="field wide">
            <span>Comment</span>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="What did we think?" />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="ghost" onClick={() => ref.current?.close()}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save movie'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
