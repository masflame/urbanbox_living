import { Link, useParams } from 'react-router-dom'

// RIUC brand palette (mirrors RiucPaymentPage.jsx)
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
  successGreen: '#1F7A3A',
  warningAmber: '#A86A14',
  errorRed:     '#9A1B1B',
}

const STATUS_CONFIG = {
  success: {
    eyebrow: 'Payment Received',
    heading: 'Thank you — your payment was successful',
    message:
      'Your payment to Rosebank International University College has been received successfully. A confirmation will be issued via the RIUC Finance Office.',
    accent: BRAND.successGreen,
    icon: (
      <svg viewBox="0 0 64 64" width="80" height="80" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="3" />
        <path
          d="M18 33 L28 43 L46 23"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    primaryAction: { label: 'Make another payment' },
  },
  cancelled: {
    eyebrow: 'Payment Cancelled',
    heading: 'Your payment was cancelled',
    message:
      'No funds have been taken from your account. You can return to the payment page and try again whenever you are ready.',
    accent: BRAND.warningAmber,
    icon: (
      <svg viewBox="0 0 64 64" width="80" height="80" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="3" />
        <path
          d="M32 18 L32 36"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="32" cy="46" r="2.6" fill="currentColor" />
      </svg>
    ),
    primaryAction: { label: 'Return to payment' },
  },
  failed: {
    eyebrow: 'Payment Failed',
    heading: 'We could not process your payment',
    message:
      'Something went wrong while processing your payment. No funds have been taken. Please try again or contact the RIUC Finance Office for assistance.',
    accent: BRAND.errorRed,
    icon: (
      <svg viewBox="0 0 64 64" width="80" height="80" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="3" />
        <path
          d="M22 22 L42 42 M42 22 L22 42"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    ),
    primaryAction: { label: 'Try again' },
  },
}

const styles = {
  page: {
    minHeight: '100vh',
    background: `linear-gradient(160deg, ${BRAND.navyDk} 0%, ${BRAND.navy} 55%, #16306a 100%)`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '48px 20px 72px',
    fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: BRAND.dark,
  },
  header: {
    width: '100%',
    maxWidth: 760,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 32,
  },
  logo: {
    height: 88,
    width: 'auto',
    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))',
  },
  brandText: {
    color: BRAND.white,
    lineHeight: 1.2,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: 0.3,
    margin: 0,
  },
  brandTag: {
    fontSize: 15,
    color: BRAND.gold,
    margin: '6px 0 0',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    maxWidth: 760,
    background: BRAND.white,
    borderRadius: 18,
    boxShadow: '0 28px 72px rgba(8, 18, 52, 0.4)',
    overflow: 'hidden',
    border: `1px solid ${BRAND.border}`,
  },
  cardTopBar: {
    height: 8,
    background: `linear-gradient(90deg, ${BRAND.gold} 0%, ${BRAND.goldDk} 100%)`,
  },
  cardBody: {
    padding: '48px 48px 52px',
    textAlign: 'center',
  },
  iconWrap: {
    margin: '4px auto 18px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 14,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    fontWeight: 700,
    margin: 0,
  },
  heading: {
    fontSize: 34,
    color: BRAND.navyDk,
    margin: '10px 0 18px',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  message: {
    fontSize: 19,
    color: BRAND.grey,
    lineHeight: 1.55,
    margin: '0 auto 30px',
    maxWidth: 560,
  },
  refBox: {
    background: BRAND.light,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 12,
    padding: '18px 22px',
    marginBottom: 30,
    fontSize: 16,
    color: BRAND.navyDk,
    textAlign: 'left',
  },
  refLabel: {
    fontSize: 13,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: BRAND.goldDk,
    fontWeight: 700,
    margin: 0,
  },
  refValue: {
    fontSize: 22,
    fontWeight: 800,
    color: BRAND.navyDk,
    margin: '6px 0 0',
    wordBreak: 'break-all',
  },
  primaryButton: {
    display: 'inline-block',
    marginTop: 4,
    padding: '18px 36px',
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: BRAND.navyDk,
    background: `linear-gradient(180deg, ${BRAND.gold} 0%, ${BRAND.goldDk} 100%)`,
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    boxShadow: '0 10px 28px rgba(201, 166, 70, 0.4)',
    textDecoration: 'none',
  },
  contact: {
    marginTop: 26,
    fontSize: 16,
    color: BRAND.grey,
    lineHeight: 1.6,
  },
  footer: {
    marginTop: 32,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    maxWidth: 760,
    lineHeight: 1.6,
  },
}

function readPayfastReference() {
  if (typeof window === 'undefined') return null
  try {
    const params = new URLSearchParams(window.location.search)
    return (
      params.get('m_payment_id') ||
      params.get('reference') ||
      params.get('ref') ||
      null
    )
  } catch {
    return null
  }
}

export default function RiucPaymentResultPage({ status = 'success' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.success
  const reference = readPayfastReference()
  const { invoiceId } = useParams()
  // For success keep them on the same invoice; for cancelled/failed they
  // can retry on the same invoice URL.
  const ctaTo = invoiceId
    ? `/finance/invoice/${invoiceId}/checkout`
    : '/payment'

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

      <div style={styles.card}>
        <div style={styles.cardTopBar} />
        <div style={styles.cardBody}>
          <div style={{ ...styles.iconWrap, color: config.accent }}>{config.icon}</div>
          <p style={{ ...styles.eyebrow, color: config.accent }}>{config.eyebrow}</p>
          <h1 style={styles.heading}>{config.heading}</h1>
          <p style={styles.message}>{config.message}</p>

          {(invoiceId || reference) && (
            <div style={styles.refBox}>
              {invoiceId && (
                <>
                  <p style={styles.refLabel}>Invoice Number</p>
                  <p style={styles.refValue}>{invoiceId}</p>
                </>
              )}
              {reference && (
                <>
                  <p style={{ ...styles.refLabel, marginTop: invoiceId ? 12 : 0 }}>Payment Reference</p>
                  <p style={styles.refValue}>{reference}</p>
                </>
              )}
            </div>
          )}

          <Link to={ctaTo} style={styles.primaryButton}>
            {config.primaryAction.label}
          </Link>

          <p style={styles.contact}>
            Need help? Contact <strong>info@riuc.edu.gh</strong> · +233 307 007 800
          </p>
        </div>
      </div>

      <p style={styles.footer}>
        © {new Date().getFullYear()} Rosebank International University College.
      </p>
    </div>
  )
}
