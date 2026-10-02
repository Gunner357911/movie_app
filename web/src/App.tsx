import { useCallback, useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, type Movie } from './lib/supabase'
import { fetchMovies } from './lib/movies'
import Login from './components/Login'
import StatCards from './components/StatCards'
import QuarterChart from './components/QuarterChart'
import HighestRated from './components/HighestRated'
import AddMovieDialog from './components/AddMovieDialog'
import MovieList from './components/MovieList'
import Disagreements from './components/Disagreements'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [movies, setMovies] = useState<Movie[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const reload = useCallback(() => {
    fetchMovies()
      .then((rows) => {
        setMovies(rows)
        setError(null)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (session) reload()
  }, [session, reload])

  const notify = useCallback((message: string) => {
    setNotice(message)
    window.clearTimeout(noticeTimer.current)
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2500)
  }, [])

  if (session === undefined) return null
  if (!session) return <Login />

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">🍿</span>
            Movie <em>Night</em>
          </div>
          <div className="topbar-actions">
            <span className="user-email">{session.user.email}</span>
            <button className="primary" onClick={() => setAdding(true)}>
              + Add<span className="hide-sm"> movie</span>
            </button>
            <button className="ghost" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="page">
        {error && <p className="error banner">{error}</p>}
        {!loaded ? (
          <p className="empty">Rolling the film…</p>
        ) : (
          <>
            <div className="hero">
              <HighestRated movies={movies} />
              <StatCards movies={movies} />
            </div>
            <QuarterChart movies={movies} />
            <Disagreements movies={movies} />
            <MovieList movies={movies} onChanged={reload} notify={notify} />
          </>
        )}
      </main>

      {adding && (
        <AddMovieDialog
          onClose={() => setAdding(false)}
          onSaved={(name) => {
            setAdding(false)
            notify(`Added ${name} 🎬`)
            reload()
          }}
        />
      )}

      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </>
  )
}
