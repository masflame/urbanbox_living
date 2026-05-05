import { useState } from 'react'
import { submitPayfastCheckout, isPayfastConfigured } from './utils/payfast'

// RIUC brand palette (mirrors api/send-email-riuc.js)
const BRAND = {
  navy:   '#1B3A77',
  navyDk: '#0F2350',
  gold:   '#C9A646',
  goldDk: '#A88732',
  grey:   '#5A5A5A',
  greyDk: '#333740',
  light:  '#F4F6FB',
  pageBg: '#EEF1F7',
  border: '#D4DAE6',
  white:  '#FFFFFF',
  dark:   '#1A1A1A',
}

const FEE_AMOUNT = 3461.00
const FEE_LABEL = 'R3,461.00'
const ITEM_NAME = 'RIUC Application Fee'

const SERIF = '"Source Serif 4", "Source Serif Pro", Georgia, "Times New Roman", serif'
const SANS  = 'Inter, "Helvetica Neue", Arial, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

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
    background: BRAND.pageBg,
    fontFamily: SANS,
    color: BRAND.dark,
    display: 'flex',
    flexDirection: 'column',
  },

  // -------- Top utility bar --------
  topBar: {
    background: BRAND.navyDk,
    color: BRAND.white,
    fontSize: 13,
    padding: '8px 0',
    borderBottom: `3px solid ${BRAND.gold}`,
  },
  topBarInner: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  topBarLeft: {
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.85)',
  },
  topBarRight: {
    display: 'flex',
    gap: 18,
    color: 'rgba(255,255,255,0.85)',
    flexWrap: 'wrap',
  },

  // -------- Masthead --------
  masthead: {
    background: BRAND.white,
    borderBottom: `1px solid ${BRAND.border}`,
    padding: '20px 0',
  },
  mastheadInner: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 22,
  },
  mastheadLogo: {
    height: 78,
    width: 'auto',
    flexShrink: 0,
  },
  mastheadText: {
    borderLeft: `1px solid ${BRAND.border}`,
    paddingLeft: 22,
  },
  mastheadName: {
    margin: 0,
    fontFamily: SERIF,
    fontSize: 24,
    fontWeight: 700,
    color: BRAND.navyDk,
    letterSpacing: 0.2,
    lineHeight: 1.2,
  },
  mastheadSub: {
    margin: '6px 0 0',
    fontSize: 13,
    color: BRAND.grey,
    textTransform: 'uppercase',
    letterSpacing: 1.6,
    fontWeight: 600,
  },

  // -------- Sub header (breadcrumb / portal name) --------
  subHeader: {
    background: BRAND.navy,
    color: BRAND.white,
  },
  subHeaderInner: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: 14,
    letterSpacing: 0.6,
  },
  subHeaderTitle: {
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  subHeaderDivider: {
    opacity: 0.5,
  },

  // -------- Content --------
  main: {
    flex: 1,
    padding: '40px 20px 60px',
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 780,
    background: BRAND.white,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 4,
    boxShadow: '0 4px 18px rgba(15, 35, 80, 0.08)',
    overflow: 'hidden',
  },
  cardHeader: {
    background: BRAND.light,
    borderBottom: `1px solid ${BRAND.border}`,
    padding: '22px 36px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardTitle: {
    margin: 0,
    fontFamily: SERIF,
    fontSize: 26,
    color: BRAND.navyDk,
    fontWeight: 700,
    letterSpacing: 0.3,
  },
  cardRefBadge: {
    fontSize: 12,
    color: BRAND.grey,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: 600,
  },
  cardBody: {
    padding: '32px 36px 36px',
  },
  intro: {
    margin: '0 0 24px',
    fontSize: 16,
    color: BRAND.greyDk,
    lineHeight: 1.6,
  },

  // -------- Invoice-style fee table --------
  feeTable: {
    width: '100%',
    borderCollapse: 'collapse',
    border: `1px solid ${BRAND.border}`,
    margin: '0 0 30px',
    fontSize: 16,
  },
  feeTableHeadCell: {
    background: BRAND.navyDk,
    color: BRAND.white,
    textAlign: 'left',
    padding: '12px 16px',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  feeTableHeadCellRight: {
    background: BRAND.navyDk,
    color: BRAND.white,
    textAlign: 'right',
    padding: '12px 16px',
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  feeTableCell: {
    padding: '16px 18px',
    borderTop: `1px solid ${BRAND.border}`,
    color: BRAND.greyDk,
  },
  feeTableCellRight: {
    padding: '16px 18px',
    borderTop: `1px solid ${BRAND.border}`,
    textAlign: 'right',
    color: BRAND.greyDk,
    fontVariantNumeric: 'tabular-nums',
  },
  feeTableTotalLabel: {
    padding: '18px 18px',
    borderTop: `2px solid ${BRAND.navyDk}`,
    background: BRAND.light,
    fontSize: 15,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: 700,
    color: BRAND.navyDk,
  },
  feeTableTotalValue: {
    padding: '18px 18px',
    borderTop: `2px solid ${BRAND.navyDk}`,
    background: BRAND.light,
    textAlign: 'right',
    fontSize: 22,
    fontWeight: 800,
    color: BRAND.navyDk,
    fontFamily: SERIF,
    fontVariantNumeric: 'tabular-nums',
  },

  // -------- Form --------
  fieldset: {
    border: `1px solid ${BRAND.border}`,
    borderRadius: 3,
    padding: '20px 22px 22px',
    margin: '0 0 24px',
  },
  legend: {
    padding: '0 8px',
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: 700,
    color: BRAND.navy,
  },
  fieldLabel: {
    display: 'block',
    fontSize: 15,
    fontWeight: 600,
    color: BRAND.navyDk,
    marginBottom: 8,
  },
  required: {
    color: '#B33A3A',
    marginLeft: 4,
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: 17,
    fontFamily: SANS,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 3,
    outline: 'none',
    boxSizing: 'border-box',
    background: BRAND.white,
    color: BRAND.dark,
    transition: 'border-color 120ms ease, box-shadow 120ms ease',
  },
  fieldHint: {
    fontSize: 13,
    color: BRAND.grey,
    margin: '8px 0 0',
    lineHeight: 1.5,
  },
  errorMsg: {
    background: '#FBE9E9',
    color: '#7A1414',
    borderLeft: '4px solid #B33A3A',
    padding: '12px 16px',
    fontSize: 14,
    margin: '0 0 20px',
    lineHeight: 1.5,
  },

  // -------- Action --------
  actionRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    marginTop: 8,
  },
  button: {
    width: '100%',
    padding: '16px 20px',
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: BRAND.white,
    background: BRAND.navyDk,
    border: 'none',
    borderRadius: 3,
    cursor: 'pointer',
    fontFamily: SANS,
    transition: 'background-color 120ms ease, opacity 120ms ease',
  },
  buttonDisabled: {
    cursor: 'not-allowed',
    opacity: 0.6,
  },

  // -------- Security strip --------
  securityStrip: {
    marginTop: 24,
    padding: '16px 18px',
    background: BRAND.light,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    fontSize: 13,
    color: BRAND.greyDk,
    lineHeight: 1.5,
  },
  lockIcon: {
    flexShrink: 0,
    color: BRAND.navy,
  },

  // -------- Footer --------
  footer: {
    background: BRAND.navyDk,
    color: 'rgba(255,255,255,0.85)',
    borderTop: `3px solid ${BRAND.gold}`,
    padding: '28px 0 24px',
    fontSize: 13,
    lineHeight: 1.6,
  },
  footerInner: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 24px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 24,
  },
  footerHeading: {
    margin: '0 0 8px',
    color: BRAND.gold,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: 700,
  },
  footerCopy: {
    maxWidth: 1100,
    margin: '20px auto 0',
    padding: '14px 24px 0',
    borderTop: '1px solid rgba(255,255,255,0.12)',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
}

function LockIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={styles.lockIcon}
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" />
    </svg>
  )
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
      setError('Please enter a payment reference before continuing.')
      return
    }

    if (!isPayfastConfigured()) {
      setError('Payment gateway is not configured. Please contact the RIUC Finance Office.')
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
      {/* Utility bar */}
      <div style={styles.topBar}>
        <div style={styles.topBarInner}>
          <span style={styles.topBarLeft}>
            Rosebank International University College · Accra, Ghana
          </span>
          <span style={styles.topBarRight}>
            <span>+233 307 007 800</span>
            <span>info@riuc.edu.gh</span>
          </span>
        </div>
      </div>

      {/* Masthead */}
      <header style={styles.masthead}>
        <div style={styles.mastheadInner}>
          <img
            src="/riuc-logo.png"
            alt="RIUC"
            style={styles.mastheadLogo}
            onError={(event) => {
              event.currentTarget.onerror = null
              event.currentTarget.src = '/riuc-logo-white.png'
            }}
          />
          <div style={styles.mastheadText}>
            <h1 style={styles.mastheadName}>
              Rosebank International University College
            </h1>
            <p style={styles.mastheadSub}>Office of Finance · Online Payments</p>
          </div>
        </div>
      </header>

      {/* Section sub-header */}
      <nav style={styles.subHeader} aria-label="Payment section">
        <div style={styles.subHeaderInner}>
          <span style={styles.subHeaderTitle}>Student Payment Portal</span>
          <span style={styles.subHeaderDivider}>›</span>
          <span>Pay Application / Tuition Fee</span>
        </div>
      </nav>

      <main style={styles.main}>
        <form style={styles.card} onSubmit={handleSubmit} noValidate>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Fee Payment</h2>
            <span style={styles.cardRefBadge}>Secure Transaction · ZAR</span>
          </div>

          <div style={styles.cardBody}>
            <p style={styles.intro}>
              Please review the fee summary below and enter your payment
              reference. You will be redirected to our secure payment provider
              to complete the transaction.
            </p>

            {/* Invoice-style fee table */}
            <table style={styles.feeTable}>
              <thead>
                <tr>
                  <th style={styles.feeTableHeadCell}>Description</th>
                  <th style={styles.feeTableHeadCellRight}>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.feeTableCell}>{ITEM_NAME}</td>
                  <td style={styles.feeTableCellRight}>{FEE_LABEL}</td>
                </tr>
                <tr>
                  <td style={styles.feeTableTotalLabel}>Total Due</td>
                  <td style={styles.feeTableTotalValue}>{FEE_LABEL}</td>
                </tr>
              </tbody>
            </table>

            {/* Payer details */}
            <fieldset style={styles.fieldset}>
              <legend style={styles.legend}>Payer Details</legend>

              <label style={styles.fieldLabel} htmlFor="riuc-reference">
                Payment Reference<span style={styles.required}>*</span>
              </label>
              <input
                id="riuc-reference"
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Student ID number or full name of student"
                style={styles.input}
                onFocus={(event) => {
                  event.currentTarget.style.borderColor = BRAND.navy
                  event.currentTarget.style.boxShadow = `0 0 0 3px rgba(27,58,119,0.15)`
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
                Enter the student&apos;s ID number or full name so the Finance
                Office can match this payment to the correct account.
              </p>
            </fieldset>

            {error && (
              <div style={styles.errorMsg} role="alert">
                {error}
              </div>
            )}

            <div style={styles.actionRow}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  ...styles.button,
                  ...(submitting ? styles.buttonDisabled : {}),
                }}
              >
                {submitting
                  ? 'Connecting to Secure Gateway…'
                  : `Proceed to Secure Payment · ${formatZar(FEE_AMOUNT)}`}
              </button>
            </div>

            <div style={styles.securityStrip}>
              <LockIcon />
              <span>
                <strong>Secure 256-bit SSL transaction.</strong> Payments are
                processed by Payfast, a registered South African payment
                services provider. Your card details are never stored on our
                servers.
              </span>
            </div>
          </div>
        </form>
      </main>

      <footer style={styles.footer}>
        <div style={styles.footerInner}>
          <div>
            <p style={styles.footerHeading}>Office of Finance</p>
            <p style={{ margin: 0 }}>
              Opeibea House, No A177 Liberation Road
              <br />
              Airport Commercial Centre
              <br />
              Accra, Ghana
            </p>
          </div>
          <div>
            <p style={styles.footerHeading}>Contact</p>
            <p style={{ margin: 0 }}>
              Tel: +233 307 007 800
              <br />
              WhatsApp: +233 59 646 6466
              <br />
              Email: info@riuc.edu.gh
            </p>
          </div>
          <div>
            <p style={styles.footerHeading}>Online</p>
            <p style={{ margin: 0 }}>
              www.riuc.edu.gh
              <br />
              Student Payment Portal
              <br />
              Powered by Payfast
            </p>
          </div>
        </div>
        <div style={styles.footerCopy}>
          © {new Date().getFullYear()} Rosebank International University
          College. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
