import type { Movie } from '../lib/supabase'
import { countThisMonth, countThisYear, latestQuarter } from '../lib/stats'

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value} movie(s)</span>
    </div>
  )
}

export default function StatCards({ movies }: { movies: Movie[] }) {
  const quarter = latestQuarter(movies)
  return (
    <div className="stats">
      <Stat label="This month we have watched:" value={countThisMonth(movies)} />
      <Stat label={`This quarter: ${quarter?.quarter ?? '-'}`} value={quarter?.count ?? 0} />
      <Stat label="This year we have watched:" value={countThisYear(movies)} />
    </div>
  )
}
