import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Movie } from '../lib/supabase'
import { quarterCounts } from '../lib/stats'

export default function QuarterChart({ movies }: { movies: Movie[] }) {
  const [year, setYear] = useState<number | null>(null)
  const data = quarterCounts(movies)
  if (!data.length) return null

  const years = [...new Set(data.map((d) => d.year))].sort((a, b) => b - a)
  const shown = year === null ? data : data.filter((d) => d.year === year)

  return (
    <section className="card">
      <h2>Movies Watched by Quarter</h2>
      <select value={year ?? ''} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}>
        <option value="">All years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={shown}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="quarter" stroke="var(--muted)" />
          <YAxis allowDecimals={false} stroke="var(--muted)" />
          <Tooltip cursor={{ fill: 'var(--hover)' }} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)' }} />
          <Bar dataKey="count" name="Movies" fill="var(--accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}
