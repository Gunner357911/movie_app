import type { Movie } from '../lib/supabase'
import { highestRated } from '../lib/stats'

export default function HighestRated({ movies }: { movies: Movie[] }) {
  const top = highestRated(movies)

  return (
    <section className="marquee">
      <div className="marquee-inner">
        <p className="eyebrow">🏆 Hall of fame{top && top.names.length > 1 ? ' · tie' : ''}</p>
        {top ? (
          <>
            <h2 className="marquee-title">{top.names.join(' & ')}</h2>
            <p className="marquee-score">
              <b>{top.score.toFixed(1)}</b>
              <span>/ 10 average</span>
            </p>
          </>
        ) : (
          <h2 className="marquee-title">Your first movie goes here</h2>
        )}
      </div>
    </section>
  )
}
