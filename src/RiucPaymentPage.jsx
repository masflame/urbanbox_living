import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { submitPayfastCheckout, isPayfastConfigured } from './utils/payfast'
import './riuc-payment.css'

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
      className="riuc-security__icon"
      aria-hidden="true"
    >
      <rect x="4" y="11" width="16" height="10" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" />
    </svg>
  )
}

export default function RiucPaymentPage() {
  const { invoiceId } = useParams()
  const invoiceNumber = invoiceId || 'INV-PENDING'
  const issueDate = new Date().toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

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
        orderId: `${invoiceNumber}-${trimmedRef}`.slice(0, 100),
        amount: FEE_AMOUNT,
        itemName: `${ITEM_NAME} (${invoiceNumber})`.slice(0, 100),
        itemDescription:
          `Invoice ${invoiceNumber} - Reference: ${trimmedRef}`.slice(0, 255),
        email: 'ST10517433@rcconnect.ac.za',
        returnUrl: `${origin}/finance/invoice/${invoiceNumber}/confirm`,
        cancelUrl: `${origin}/finance/invoice/${invoiceNumber}/cancelled`,
      })
      // Browser is now redirecting to Payfast.
    } catch (err) {
      console.error('Payfast redirect failed:', err)
      setError(err.message || 'Could not start payment. Please try again.')
      setSubmitting(false)
    }
  }

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
      <nav className="riuc-subheader" aria-label="Payment section">
        <div className="riuc-container riuc-subheader__inner">
          <span className="riuc-subheader__title">Office of Finance</span>
          <span className="riuc-subheader__divider riuc-subheader__crumb-hide-sm">›</span>
          <span className="riuc-subheader__crumb-hide-sm">Invoices</span>
          <span className="riuc-subheader__divider">›</span>
          <span>{invoiceNumber}</span>
          <span className="riuc-subheader__divider riuc-subheader__crumb-hide-sm">›</span>
          <span className="riuc-subheader__crumb-hide-sm">Checkout</span>
        </div>
      </nav>

      <main className="riuc-main">
        <form className="riuc-card" onSubmit={handleSubmit} noValidate>
          <div className="riuc-card__header">
            <h2 className="riuc-card__title">Fee Payment</h2>
            <span className="riuc-card__badge">
              Invoice {invoiceNumber} · Issued {issueDate} · ZAR
            </span>
          </div>

          <div className="riuc-card__body">
            <p className="riuc-intro">
              Please review the fee summary below and enter your payment
              reference. You will be redirected to our secure payment provider
              to complete the transaction.
            </p>

            <table className="riuc-fee-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="is-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{ITEM_NAME}</td>
                  <td className="is-right">{FEE_LABEL}</td>
                </tr>
                <tr className="is-total">
                  <td>Total Due</td>
                  <td className="is-right">{FEE_LABEL}</td>
                </tr>
              </tbody>
            </table>

            <fieldset className="riuc-fieldset">
              <legend className="riuc-legend">Payer Details</legend>

              <label className="riuc-label" htmlFor="riuc-reference">
                Payment Reference<span className="riuc-required">*</span>
              </label>
              <input
                id="riuc-reference"
                type="text"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Student ID number or full name of student"
                className="riuc-input"
                autoComplete="off"
                inputMode="text"
                maxLength={100}
                required
              />
              <p className="riuc-hint">
                Enter the student&apos;s ID number or full name so the Finance
                Office can match this payment to the correct account.
              </p>
            </fieldset>

            {error && (
              <div className="riuc-error" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="riuc-button"
            >
              {submitting ? (
                'Connecting…'
              ) : (
                <>
                  <span className="riuc-button__short">
                    Pay {formatZar(FEE_AMOUNT)}
                  </span>
                  <span className="riuc-button__long">
                    Proceed to Secure Payment · {formatZar(FEE_AMOUNT)}
                  </span>
                </>
              )}
            </button>

            <div className="riuc-security">
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
