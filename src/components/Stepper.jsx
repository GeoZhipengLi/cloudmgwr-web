export default function Stepper({ steps, current, onSelect }) {
  return (
    <div className="stepper">
      {steps.map((step, index) => {
        const n = index + 1
        const active = n === current
        const complete = n < current
        return (
          <button
            type="button"
            key={step.title}
            className={`step ${active ? 'active' : ''} ${complete ? 'complete' : ''}`}
            onClick={() => complete && onSelect?.(n)}
          >
            <span className="step-number">{n}</span>
            <span>
              <strong>{step.title}</strong>
              <small>{step.subtitle}</small>
            </span>
          </button>
        )
      })}
    </div>
  )
}
