import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Movie } from '../lib/supabase'
import { quarterCounts } from '../lib/stats'
import { colors } from '../lib/theme'
import YearChips from './YearChips'

export default function QuarterChart({ movies }: { movies: Movie[] }) {
  const [year, setYear] = useState<number | null>(null)
  const data = quarterCounts(movies)
  if (!data.length) return null

  const years = [...new Set(data.map((d) => d.year))].sort((a, b) => b - a)
  const shown = year === null ? data : data.filter((d) => d.year === year)

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Box office</p>
          <h2>Movies per quarter</h2>
        </div>
        <YearChips years={years} value={year} onChange={setYear} />
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={shown} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid stroke={colors.line} vertical={false} />
          <XAxis dataKey="quarter" stroke={colors.muted} tickLine={false} axisLine={false} fontSize={12} />
          <YAxis allowDecimals={false} stroke={colors.muted} tickLine={false} axisLine={false} fontSize={12} />
          <Tooltip
            cursor={{ fill: 'rgba(245, 184, 61, 0.08)' }}
            contentStyle={{ background: colors.surface, border: `1px solid ${colors.line}`, borderRadius: 10, color: colors.text }}
            labelStyle={{ color: colors.text, fontWeight: 600 }}
          />
          <Bar dataKey="count" name="Movies" fill={colors.accent} radius={[6, 6, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  )
}
