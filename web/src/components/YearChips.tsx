export default function YearChips({
  years,
  value,
  onChange,
}: {
  years: number[]
  value: number | null
  onChange: (year: number | null) => void
}) {
  return (
    <div className="chips" role="group" aria-label="Filter by year">
      {[null, ...years].map((y) => (
        <button
          key={y ?? 'all'}
          type="button"
          className={`chip ${value === y ? 'on' : ''}`}
          aria-pressed={value === y}
          onClick={() => onChange(y)}
        >
          {y ?? 'All'}
        </button>
      ))}
    </div>
  )
}
