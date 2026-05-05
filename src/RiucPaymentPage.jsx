import { useState } from 'react'
import { submitPayfastCheckout, isPayfastConfigured } from './utils/payfast'

// RIUC brand palette (mirrors api/send-email-riuc.js)
const BRAND = {
  navy:   '#1B3A77',
  navyDk: '#0F2350',
  gold:   '#C9A646',
  goldDk: '#A88732',
  grey:   '#5A5A5A',
  light:  '#F4F6FB',
  border: '#D4DAE6',
  white:  '#FFFFFF',
  dark:   '#1A1A1A',
}

const FEE_AMOUNT = 3461.00
const FEE_LABEL = 'R3,461.00'
const ITEM_NAME = 'RIUC Application Fee'

function formatZar(amount) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const styles = {
  page: {
    minHeight: '100vh',
    background: `linear-gradient(160deg, ${BRAND.navyDk} 0%, ${BRAND.navy} 55%, #16306a 100%)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 16px 56px',
    fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: BRAND.dark,
  },
  header: {
    width: '100%',
    maxWidth: 560,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 22,
  },
  logo: {
    height: 64,
    width: 'auto',
    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))',
  },
  brandText: {
    color: BRAND.white,
    lineHeight: 1.15,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 0.3,
    margin: 0,
  },
  brandTag: {
    fontSize: 12,
    color: BRAND.gold,
    margin: '4px 0 0',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    maxWidth: 560,
    background: BRAND.white,
    borderRadius: 14,
    boxShadow: '0 22px 60px rgba(8, 18, 52, 0.35)',
    overflow: 'hidden',
    border: `1px solid ${BRAND.border}`,
  },
  cardTopBar: {
    height: 6,
    background: `linear-gradient(90deg, ${BRAND.gold} 0%, ${BRAND.goldDk} 100%)`,
  },
  cardBody: {
    padding: '28px 28px 30px',
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: BRAND.goldDk,
    fontWeight: 700,
    margin: 0,
  },
  heading: {
    fontSize: 26,
    color: BRAND.navyDk,
    margin: '6px 0 4px',
    fontWeight: 700,
  },
  feeBlock: {
    background: BRAND.light,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 10,
    padding: '18px 20px',
    margin: '20px 0 22px',
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: BRAND.grey,
    margin: 0,
  },
  feeValue: {
    fontSize: 28,
    fontWeight: 700,
    color: BRAND.navy,
    margin: 0,
    letterSpacing: 0.4,
  },
  fieldLabel: {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: BRAND.navyDk,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: 15,
    border: `1.5px solid ${BRAND.border}`,
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box',
    background: BRAND.white,
    color: BRAND.dark,
    transition: 'border-color 120ms ease, box-shadow 120ms ease',
  },
  fieldHint: {
    fontSize: 12,
    color: BRAND.grey,
    margin: '6px 0 0',
  },
  errorMsg: {
    background: '#FDECEC',
    color: '#9A1B1B',
    border: '1px solid #F2BFBF',
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 13,
    marginTop: 16,
  },
  button: {
    marginTop: 22,
    width: '100%',
    padding: '14px 18px',
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: BRAND.navyDk,
    background: `linear-gradient(180deg, ${BRAND.gold} 0%, ${BRAND.goldDk} 100%)`,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    boxShadow: '0 8px 22px rgba(201, 166, 70, 0.35)',
    transition: 'transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease',
  },
  buttonDisabled: {
    cursor: 'not-allowed',
    opacity: 0.7,
    boxShadow: 'none',
  },
  secureNote: {
    marginTop: 14,
    textAlign: 'center',
    fontSize: 12,
    color: BRAND.grey,
  },
  footer: {
    marginTop: 22,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    maxWidth: 560,
    lineHeight: 1.5,
  },
}

export default function RiucPaymentPage() {
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setError(null)

    const trimmedRef = reference.trim()
    if (!trimmedRef) {
      setError('Please enter a reference before continuing.')
      return
    }

    if (!isPayfastConfigured()) {
      setError('Payment gateway is not configured. Please contact RIUC support.')
      return
    }

    setSubmitting(true)
    try {
      const origin =
        typeof window !== 'undefined' ? window.location.origin : ''
      submitPayfastCheckout({
        orderId: trimmedRef.slice(0, 100),
        amount: FEE_AMOUNT,
        itemName: ITEM_NAME,
        itemDescription: `RIUC fee payment - Reference: ${trimmedRef}`.slice(0, 255),
        returnUrl: `${origin}/payment/success`,
        cancelUrl: `${origin}/payment/cancelled`,
      })
      // Browser is now redirecting to Payfast.
    } catch (err) {
      console.error('Payfast redirect failed:', err)
      setError(err.message || 'Could not start payment. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <img
          src="/riuc-logo-white.png"
          alt="RIUC"
          style={styles.logo}
          onError={(event) => {
            event.currentTarget.onerror = null
            event.currentTarget.src = '/riuc-logo.png'
          }}
        />
        <div style={styles.brandText}>
          <p style={styles.brandTitle}>Rosebank International<br />University College</p>
          <p style={styles.brandTag}>Fast Track Your Global Career</p>
        </div>
      </div>

      <form style={styles.card} onSubmit={handleSubmit} noValidate>
        <div style={styles.cardTopBar} />
        <div style={styles.cardBody}>
          <p style={styles.eyebrow}>Secure Payment</p>
          <h1 style={styles.heading}>Pay your fee</h1>

          <div style={styles.feeBlock}>
            <p style={styles.feeLabel}>You are paying fee</p>
            <p style={styles.feeValue}>{FEE_LABEL}</p>
          </div>

          <label style={styles.fieldLabel} htmlFor="riuc-reference">
            Reference
          </label>
          <input
            id="riuc-reference"
            type="text"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            placeholder="e.g. Student ID or full name"
            style={styles.input}
            onFocus={(event) => {
              event.currentTarget.style.borderColor = BRAND.gold
              event.currentTarget.style.boxShadow = `0 0 0 3px rgba(201,166,70,0.18)`
            }}
            onBlur={(event) => {
              event.currentTarget.style.borderColor = BRAND.border
              event.currentTarget.style.boxShadow = 'none'
            }}
            autoComplete="off"
            maxLength={100}
            required
          />
          <p style={styles.fieldHint}>
            Enter a reference so we can match this payment to your account.
          </p>

          {error && <div style={styles.errorMsg} role="alert">{error}</div>}

          <button
            type="submit"
            disabled={submitting}
            style={{
              ...styles.button,
              ...(submitting ? styles.buttonDisabled : {}),
            }}
          >
            {submitting ? 'Redirecting to Payfast…' : `Complete Payment · ${formatZar(FEE_AMOUNT)}`}
          </button>

          <p style={styles.secureNote}>
            Payments are processed securely by Payfast. You will be redirected to
            complete your payment.
          </p>
        </div>
      </form>

      <p style={styles.footer}>
        © {new Date().getFullYear()} Rosebank International University College.
        For payment queries contact <strong>info@riuc.edu.gh</strong>.
      </p>
    </div>
  )
}
