import type { Movie } from '../lib/supabase'
import { disagreements } from '../lib/stats'

export default function Disagreements({ movies }: { movies: Movie[] }) {
  const rows = disagreements(movies)

  return (
    <section>
      <h2>🥊 Disagreements</h2>
      {!rows.length && <p className="muted">No movies yet where scores differ by 2 or more.</p>}
      {rows.map(({ movie, gap, big }) => {
        const gunWins = movie.gun_score! > movie.team_score!
        return (
          <div key={movie.id} className={`card disagreement ${big ? 'big' : 'little'}`}>
            <div className="row">
              <span className="title">{movie.name}</span>
              <span className="badge">
                {big ? '😤 Big Disagreement' : '😕 Little Disagreement'} · Gap {gap}
              </span>
            </div>
            <div className="versus">
              <div className={gunWins ? 'winner' : ''}>
                <small>Gun</small>
                <b>{movie.gun_score}</b>
              </div>
              <span className="muted">vs</span>
              <div className={gunWins ? '' : 'winner'}>
                <small>Team</small>
                <b>{movie.team_score}</b>
              </div>
            </div>
          </div>
        )
      })}
    </section>
  )
}
