export default function QuantityStepper({
  id,
  value,
  onChange,
  min = 1,
  max = 99,
  ariaLabel = 'Quantity',
}) {
  const current = Number.isFinite(value) ? value : min
  const dec = () => onChange(Math.max(min, current - 1))
  const inc = () => onChange(Math.min(max, current + 1))
  const onInput = (e) => {
    const n = Number(e.target.value)
    if (!Number.isFinite(n)) return
    onChange(Math.min(max, Math.max(min, n)))
  }

  return (
    <div className="quantity-stepper" role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className="quantity-button"
        aria-label="Decrease quantity"
        onClick={dec}
        disabled={current <= min}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        className="quantity-value"
        min={min}
        max={max}
        value={current}
        onChange={onInput}
        aria-live="polite"
      />
      <button
        type="button"
        className="quantity-button"
        aria-label="Increase quantity"
        onClick={inc}
        disabled={current >= max}
      >
        +
      </button>
    </div>
  )
}
