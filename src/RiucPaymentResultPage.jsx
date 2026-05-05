import { Link, useLocation, useParams } from 'react-router-dom'
import './riuc-payment.css'

const STATUS_CONFIG = {
  success: {
    eyebrow: 'Payment Confirmed',
    heading: 'Thank you. Your payment has been received.',
    message:
      'Your transaction has been processed successfully. A receipt will be emailed to the address you used at checkout, and the Office of Finance will reconcile this payment to the invoice within one (1) business day.',
    icon: '✓',
    accent: '#1F7A4D',
    accentSoft: 'rgba(31, 122, 77, 0.08)',
    primaryActionLabel: 'Return to Payment Portal',
  },
  cancelled: {
    eyebrow: 'Payment Cancelled',
    heading: 'Your payment was not completed.',
    message:
      'You exited the secure payment session before the transaction was finalised. No funds have been debited from your account. You may return to the payment portal to try again or contact the Office of Finance for assistance.',
    icon: '!',
    accent: '#A88732',
    accentSoft: 'rgba(168, 135, 50, 0.08)',
    primaryActionLabel: 'Try Payment Again',
  },
  failed: {
    eyebrow: 'Payment Unsuccessful',
    heading: 'We could not process your payment.',
    message:
      'The payment could not be completed. This may be due to insufficient funds, a card restriction, or a temporary issue with the payment provider. No funds have been debited. Please try again or contact the Office of Finance.',
    icon: '✕',
    accent: '#B7322C',
    accentSoft: 'rgba(183, 50, 44, 0.08)',
    primaryActionLabel: 'Try Payment Again',
  },
}

function readPayfastReference(search) {
  if (!search) return null
  const params = new URLSearchParams(search)
  return (
    params.get('m_payment_id') ||
    params.get('reference') ||
    params.get('ref') ||
    null
  )
}

export default function RiucPaymentResultPage({ status = 'success' }) {
  const location = useLocation()
  const { invoiceId } = useParams()
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.success
  const reference = readPayfastReference(location.search)
  const checkoutHref = invoiceId
    ? `/finance/invoice/${invoiceId}/checkout`
    : '/payment'

  return (
    <div className="riuc-page">
      {/* Top utility bar */}
      <div className="riuc-topbar">
        <div className="riuc-container riuc-topbar__inner">
          <span>Rosebank International University College · Pretoria, South Africa</span>
          <span className="riuc-topbar__contact">
            <span>Tel: 086 1259 906</span>
            <span>info@riuc.edu.gh</span>
          </span>
        </div>
      </div>

      {/* Masthead */}
      <header className="riuc-masthead">
        <div className="riuc-container riuc-masthead__inner">
          <img
            src="/riuc-logo.png"
            alt="RIUC"
            className="riuc-masthead__logo"
            onError={(event) => {
              event.currentTarget.onerror = null
              event.currentTarget.src = '/riuc-logo-white.png'
            }}
          />
          <div className="riuc-masthead__text">
            <h1 className="riuc-masthead__name">
              Rosebank International University College
            </h1>
            <p className="riuc-masthead__sub">Office of Finance · Online Payments</p>
          </div>
        </div>
      </header>

      {/* Section breadcrumb */}
      <nav className="riuc-subheader" aria-label="Payment status">
        <div className="riuc-container riuc-subheader__inner">
          <span className="riuc-subheader__title">Office of Finance</span>
          <span className="riuc-subheader__divider riuc-subheader__crumb-hide-sm">›</span>
          <span className="riuc-subheader__crumb-hide-sm">Invoices</span>
          {invoiceId && (
            <>
              <span className="riuc-subheader__divider">›</span>
              <span>{invoiceId}</span>
            </>
          )}
          <span className="riuc-subheader__divider">›</span>
          <span>Payment {status.charAt(0).toUpperCase() + status.slice(1)}</span>
        </div>
      </nav>

      <main className="riuc-main">
        <section className="riuc-card riuc-result-card">
          <div className="riuc-card__body">
            <div
              className="riuc-result__icon"
              style={{
                color: config.accent,
                backgroundColor: config.accentSoft,
                borderColor: config.accent,
              }}
              aria-hidden="true"
            >
              {config.icon}
            </div>

            <p
              className="riuc-result__eyebrow"
              style={{ color: config.accent }}
            >
              {config.eyebrow}
            </p>
            <h2 className="riuc-result__heading">{config.heading}</h2>
            <p className="riuc-result__message">{config.message}</p>

            {reference && (
              <div className="riuc-result__refbox">
                <p className="riuc-result__reflabel">Payment Reference</p>
                <p className="riuc-result__refvalue">{reference}</p>
              </div>
            )}

            <Link to={checkoutHref} className="riuc-button">
              {config.primaryActionLabel}
            </Link>

            <p className="riuc-result__contact">
              For assistance, contact the Office of Finance at{' '}
              <strong>info@riuc.edu.gh</strong> or 086 1259 906.
            </p>
          </div>
        </section>
      </main>

      <footer className="riuc-footer">
        <div className="riuc-container riuc-footer__inner">
          <div>
            <p className="riuc-footer__heading">Office of Finance</p>
            <p style={{ margin: 0 }}>
              Opeibea House, No A177 Liberation Road
              <br />
              Airport Commercial Centre
              <br />
              Pretoria, South Africa
            </p>
          </div>
          <div>
            <p className="riuc-footer__heading">Contact</p>
            <p style={{ margin: 0 }}>
              Tel: 086 1259 906
              <br />
              WhatsApp: +233 59 646 6466
              <br />
              Email: info@riuc.edu.gh
            </p>
          </div>
          <div>
            <p className="riuc-footer__heading">Online</p>
            <p style={{ margin: 0 }}>
              www.riuc.edu.gh
              <br />
              Student Payment Portal
              <br />
              Powered by Payfast
            </p>
          </div>
        </div>
        <div className="riuc-container riuc-footer__copy">
          © {new Date().getFullYear()} Rosebank International University
          College. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
