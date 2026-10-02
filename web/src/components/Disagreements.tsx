import type { Movie } from '../lib/supabase'
import { disagreements } from '../lib/stats'

export default function Disagreements({ movies }: { movies: Movie[] }) {
  const rows = disagreements(movies)

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">🥊 Face-offs</p>
          <h2>Where we disagreed</h2>
        </div>
      </div>
      {!rows.length && <p className="empty">No movies yet where scores differ by 2 or more.</p>}
      <div className="faceoffs">
        {rows.map(({ movie, gap, big }) => {
          const gunWins = movie.gun_score! > movie.team_score!
          return (
            <article key={movie.id} className={`faceoff ${big ? 'big' : ''}`}>
              <div className="faceoff-head">
                <h3>{movie.name}</h3>
                <span className="gap">
                  {big ? '😤 Big' : '😕 Little'} · {gap} pts
                </span>
              </div>
              <div className="versus">
                <div className={`side gun ${gunWins ? 'win' : ''}`}>
                  <small>Gun</small>
                  <b>{movie.gun_score}</b>
                </div>
                <span className="vs">vs</span>
                <div className={`side team ${gunWins ? '' : 'win'}`}>
                  <small>Team</small>
                  <b>{movie.team_score}</b>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
