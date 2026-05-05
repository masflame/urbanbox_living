import { Link } from 'react-router-dom'

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
      <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
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
    primaryAction: { to: '/payment', label: 'Make another payment' },
  },
  cancelled: {
    eyebrow: 'Payment Cancelled',
    heading: 'Your payment was cancelled',
    message:
      'No funds have been taken from your account. You can return to the payment page and try again whenever you are ready.',
    accent: BRAND.warningAmber,
    icon: (
      <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
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
    primaryAction: { to: '/payment', label: 'Return to payment' },
  },
  failed: {
    eyebrow: 'Payment Failed',
    heading: 'We could not process your payment',
    message:
      'Something went wrong while processing your payment. No funds have been taken. Please try again or contact the RIUC Finance Office for assistance.',
    accent: BRAND.errorRed,
    icon: (
      <svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" strokeWidth="3" />
        <path
          d="M22 22 L42 42 M42 22 L22 42"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
    ),
    primaryAction: { to: '/payment', label: 'Try again' },
  },
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
    padding: '32px 28px',
    textAlign: 'center',
  },
  iconWrap: {
    margin: '4px auto 14px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontWeight: 700,
    margin: 0,
  },
  heading: {
    fontSize: 24,
    color: BRAND.navyDk,
    margin: '6px 0 12px',
    fontWeight: 700,
    lineHeight: 1.25,
  },
  message: {
    fontSize: 15,
    color: BRAND.grey,
    lineHeight: 1.55,
    margin: '0 auto 22px',
    maxWidth: 440,
  },
  refBox: {
    background: BRAND.light,
    border: `1px solid ${BRAND.border}`,
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 22,
    fontSize: 13,
    color: BRAND.navyDk,
    textAlign: 'left',
  },
  refLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: BRAND.goldDk,
    fontWeight: 700,
    margin: 0,
  },
  refValue: {
    fontSize: 15,
    fontWeight: 700,
    color: BRAND.navyDk,
    margin: '4px 0 0',
    wordBreak: 'break-all',
  },
  primaryButton: {
    display: 'inline-block',
    marginTop: 4,
    padding: '13px 26px',
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: BRAND.navyDk,
    background: `linear-gradient(180deg, ${BRAND.gold} 0%, ${BRAND.goldDk} 100%)`,
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    boxShadow: '0 8px 22px rgba(201, 166, 70, 0.35)',
    textDecoration: 'none',
  },
  contact: {
    marginTop: 18,
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

          {reference && (
            <div style={styles.refBox}>
              <p style={styles.refLabel}>Reference</p>
              <p style={styles.refValue}>{reference}</p>
            </div>
          )}

          <Link to={config.primaryAction.to} style={styles.primaryButton}>
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
