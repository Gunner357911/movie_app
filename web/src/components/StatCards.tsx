import type { Movie } from '../lib/supabase'
import { countThisMonth, countThisYear, latestQuarter } from '../lib/stats'

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      <span className="stat-hint">{value === 1 ? 'movie' : 'movies'}</span>
    </div>
  )
}

export default function StatCards({ movies }: { movies: Movie[] }) {
  const quarter = latestQuarter(movies)
  return (
    <div className="stats">
      <Stat label="This month" value={countThisMonth(movies)} />
      <Stat label={quarter ? quarter.quarter.replace('-', ' ') : 'This quarter'} value={quarter?.count ?? 0} />
      <Stat label="This year" value={countThisYear(movies)} />
    </div>
  )
}
