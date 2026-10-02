import type { Movie } from '../lib/supabase'
import { highestRated } from '../lib/stats'

export default function HighestRated({ movies }: { movies: Movie[] }) {
  const top = highestRated(movies)
  if (!top) return null

  return (
    <section className="card highlight">
      <span className="eyebrow">
        🏆 All Time {top.names.length > 1 ? 'Co-Highest Rated Movies' : 'Highest Rated Movie'}
      </span>
      <h1>{top.names.join(' & ')}</h1>
      <p>
        Average Score: <strong>{top.score.toFixed(1)}</strong> <span className="muted">/ 10</span>
      </p>
    </section>
  )
}
