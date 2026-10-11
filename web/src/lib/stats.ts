import type { Movie } from './supabase'

// Parse YYYY-MM-DD without going through Date, so the local timezone can't shift the day.
function ymd(date: string) {
  const [y, m] = date.split('-').map(Number)
  return { year: y, month: m }
}

export function quarterOf(date: string) {
  const { year, month } = ymd(date)
  return `${year}-Q${Math.ceil(month / 3)}`
}

export function countThisMonth(movies: Movie[], today = new Date()) {
  return movies.filter((m) => {
    const { year, month } = ymd(m.date)
    return year === today.getFullYear() && month === today.getMonth() + 1
  }).length
}

export function countThisYear(movies: Movie[], today = new Date()) {
  return movies.filter((m) => ymd(m.date).year === today.getFullYear()).length
}

export type QuarterCount = { quarter: string; year: number; count: number }

export function quarterCounts(movies: Movie[]): QuarterCount[] {
  const counts = new Map<string, QuarterCount>()
  for (const m of movies) {
    const quarter = quarterOf(m.date)
    const entry = counts.get(quarter) ?? { quarter, year: ymd(m.date).year, count: 0 }
    entry.count++
    counts.set(quarter, entry)
  }
  return [...counts.values()].sort((a, b) => a.quarter.localeCompare(b.quarter))
}

// Same as the Streamlit version: the most recent quarter that has any movies.
export function latestQuarter(movies: Movie[]): QuarterCount | null {
  return quarterCounts(movies).at(-1) ?? null
}

// Mean of the non-null scores, like pandas .mean(axis=1).
export function avgScore(m: Movie): number | null {
  const scores = [m.gun_score, m.team_score].filter((s): s is number => s !== null)
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
}

export function highestRated(movies: Movie[]) {
  const scored = movies
    .map((m) => ({ name: m.name, avg: avgScore(m) }))
    .filter((m): m is { name: string; avg: number } => m.avg !== null)
  if (!scored.length) return null
  const max = Math.max(...scored.map((m) => m.avg))
  return { names: scored.filter((m) => m.avg === max).map((m) => m.name), score: max }
}

export type Disagreement = { movie: Movie; gap: number; big: boolean }

// Both scores set and non-zero, differing by 2 or more; 3+ is a big disagreement.
export function disagreements(movies: Movie[]): Disagreement[] {
  return movies
    .filter((m) => m.gun_score && m.team_score && Math.abs(m.gun_score - m.team_score) >= 2)
    .map((m) => {
      const gap = Math.abs(m.gun_score! - m.team_score!)
      return { movie: m, gap, big: gap >= 3 }
    })
    .sort((a, b) => b.gap - a.gap)
}

// Local YYYY-MM-DD, comparable as a string with Movie.date.
export function todayYmd(today = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
}

// Already watched (date today or earlier) but missing a score, newest first.
export function needsScore(movies: Movie[], today = new Date()): Movie[] {
  const cutoff = todayYmd(today)
  return movies
    .filter((m) => (m.gun_score === null || m.team_score === null) && m.date <= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
}
