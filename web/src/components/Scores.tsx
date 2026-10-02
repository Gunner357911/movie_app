type Tone = 'gun' | 'team'

function ScoreBar({ who, tone, score }: { who: string; tone: Tone; score: number | null }) {
  return (
    <div className={`score-bar ${tone}`}>
      <span className="who">{who}</span>
      <span className="track">
        <span className="fill" style={{ width: `${(score ?? 0) * 10}%` }} />
      </span>
      <span className="val">{score ?? '–'}</span>
    </div>
  )
}

export function ScoreBars({ gun, team }: { gun: number | null; team: number | null }) {
  return (
    <div className="score-bars">
      <ScoreBar who="Gun" tone="gun" score={gun} />
      <ScoreBar who="Team" tone="team" score={team} />
    </div>
  )
}

// 0-10 tap targets instead of a slider; "–" means not scored yet.
export function ScorePicker({
  label,
  tone,
  value,
  onChange,
}: {
  label: string
  tone: Tone
  value: number | null
  onChange: (value: number | null) => void
}) {
  const options = [null, ...Array.from({ length: 11 }, (_, i) => i)]
  return (
    <fieldset className={`score-picker ${tone}`}>
      <legend>
        {label} <b>{value ?? '–'}</b>
      </legend>
      <div className="score-chips">
        {options.map((option) => (
          <button
            key={option ?? 'none'}
            type="button"
            className={value === option ? 'on' : ''}
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option ?? '–'}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
