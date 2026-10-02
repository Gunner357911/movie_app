import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, type Movie } from './lib/supabase'
import { fetchMovies } from './lib/movies'
import Login from './components/Login'
import StatCards from './components/StatCards'
import QuarterChart from './components/QuarterChart'
import HighestRated from './components/HighestRated'
import AddMovieForm from './components/AddMovieForm'
import HistoryTable from './components/HistoryTable'
import Disagreements from './components/Disagreements'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [movies, setMovies] = useState<Movie[]>([])
  const [error, setError] = useState<string | null>(null)

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
  }, [])

  useEffect(() => {
    if (session) reload()
  }, [session, reload])

  if (session === undefined) return null
  if (!session) return <Login />

  return (
    <main>
      <header>
        <div>
          <h1>Movie Rating App!</h1>
          <p className="muted">Welcome 🎉 {session.user.email}</p>
        </div>
        <button className="secondary" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>
      {error && <p className="error">{error}</p>}
      <StatCards movies={movies} />
      <HighestRated movies={movies} />
      <QuarterChart movies={movies} />
      <AddMovieForm onSaved={reload} />
      <HistoryTable movies={movies} onChanged={reload} />
      <Disagreements movies={movies} />
    </main>
  )
}
