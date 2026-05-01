import { useEffect, useId, useRef, useState, useCallback } from 'react'

/**
 * CustomSelect — accessible dropdown that mimics a native <select> trigger
 * but renders a fully styleable option list. Keyboard support: Up/Down,
 * Home/End, Enter/Space, Esc, type-to-jump.
 *
 * Props:
 *   value, onChange, options: [{ value, label, group? }], placeholder, id, ariaLabel, className
 */
export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  id,
  ariaLabel,
  className = '',
}) {
  const generatedId = useId()
  const buttonId = id || `cs-${generatedId}`
  const listId = `${buttonId}-list`
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const typeBufRef = useRef({ buf: '', timer: null })

  const currentIdx = options.findIndex((o) => o.value === value)
  const currentLabel = currentIdx >= 0 ? options[currentIdx].label : placeholder
  const isPlaceholder = currentIdx < 0 || (options[currentIdx]?.value === '' && placeholder)

  const close = useCallback(() => {
    setOpen(false)
    setActiveIdx(-1)
  }, [])

  const openMenu = useCallback(() => {
    setOpen(true)
    setActiveIdx(currentIdx >= 0 ? currentIdx : 0)
  }, [currentIdx])

  // Close on outside click / Esc
  useEffect(() => {
    if (!open) return
    const onDocPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close()
        rootRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', onDocPointer)
    document.addEventListener('touchstart', onDocPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      document.removeEventListener('touchstart', onDocPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  // Scroll active option into view
  useEffect(() => {
    if (!open || activeIdx < 0) return
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIdx])

  const choose = (idx) => {
    const opt = options[idx]
    if (!opt) return
    onChange?.(opt.value)
    close()
    rootRef.current?.querySelector('button')?.focus()
  }

  const handleKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openMenu()
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(options.length - 1, (i < 0 ? -1 : i) + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, (i < 0 ? options.length : i) - 1))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActiveIdx(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActiveIdx(options.length - 1)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (activeIdx >= 0) choose(activeIdx)
    } else if (e.key === 'Tab') {
      close()
    } else if (e.key.length === 1) {
      // Type-to-jump
      const buf = (typeBufRef.current.buf + e.key).toLowerCase()
      typeBufRef.current.buf = buf
      clearTimeout(typeBufRef.current.timer)
      typeBufRef.current.timer = setTimeout(() => {
        typeBufRef.current.buf = ''
      }, 600)
      const start = activeIdx >= 0 ? activeIdx : 0
      const len = options.length
      for (let i = 1; i <= len; i++) {
        const idx = (start + i) % len
        if (String(options[idx].label).toLowerCase().startsWith(buf)) {
          setActiveIdx(idx)
          break
        }
      }
    }
  }

  return (
    <div ref={rootRef} className={`custom-select ${open ? 'is-open' : ''} ${className}`.trim()}>
      <button
        type="button"
        id={buttonId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        className={`custom-select-trigger${isPlaceholder ? ' is-placeholder' : ''}`}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={handleKeyDown}
      >
        <span className="custom-select-value">{currentLabel}</span>
        <span className="custom-select-caret" aria-hidden="true" />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={activeIdx >= 0 ? `${buttonId}-opt-${activeIdx}` : undefined}
          className="custom-select-menu"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value
            const isActive = idx === activeIdx
            return (
              <li
                key={`${opt.value}-${idx}`}
                id={`${buttonId}-opt-${idx}`}
                role="option"
                aria-selected={isSelected}
                data-idx={idx}
                className={`custom-select-option${isSelected ? ' is-selected' : ''}${isActive ? ' is-active' : ''}`}
                onMouseDown={(e) => {
                  // Use mousedown to prevent the button blur/close race.
                  e.preventDefault()
                  choose(idx)
                }}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                <span className="custom-select-option-label">{opt.label}</span>
                {isSelected && <span className="custom-select-option-check" aria-hidden="true">✓</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
