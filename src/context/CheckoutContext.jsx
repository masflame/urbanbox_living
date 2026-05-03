import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'urban-box-checkout'

const EMPTY_DELIVERY = {
  name: '',
  email: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  suburb: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'South Africa',
  siteNotes: '',
}

const CheckoutContext = createContext(null)

function loadInitial() {
  if (typeof window === 'undefined') return null
  // Prefer localStorage (persists across tabs/sessions); fall back to
  // sessionStorage so anyone with in-flight state from a previous build
  // doesn't lose their configurations.
  let raw = null
  try { raw = window.localStorage.getItem(STORAGE_KEY) } catch { /* ignore */ }
  if (!raw) {
    try { raw = window.sessionStorage.getItem(STORAGE_KEY) } catch { /* ignore */ }
  }
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return {
      configs: parsed.configs || {},
      delivery: { ...EMPTY_DELIVERY, ...(parsed.delivery || {}) },
      paymentOption: parsed.paymentOption || 'standard',
    }
  } catch {
    return null
  }
}

export function CheckoutProvider({ children }) {
  const initial = loadInitial()
  const [configs, setConfigs] = useState(initial?.configs || {})
  const [delivery, setDelivery] = useState(initial?.delivery || EMPTY_DELIVERY)
  const [paymentOption, setPaymentOption] = useState(initial?.paymentOption || 'standard')
  const [submittedOrder, setSubmittedOrder] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ configs, delivery, paymentOption }),
      )
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [configs, delivery, paymentOption])

  const setConfig = useCallback((key, next) => {
    setConfigs((prev) => ({ ...prev, [key]: next }))
  }, [])

  const updateDelivery = useCallback((patch) => {
    setDelivery((prev) => ({ ...prev, ...patch }))
  }, [])

  const resetCheckout = useCallback(() => {
    setConfigs({})
    setDelivery(EMPTY_DELIVERY)
    setPaymentOption('standard')
    setSubmittedOrder(null)
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
      try { window.sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
    }
  }, [])

  const value = useMemo(
    () => ({
      configs,
      setConfig,
      setConfigs,
      delivery,
      updateDelivery,
      paymentOption,
      setPaymentOption,
      submittedOrder,
      setSubmittedOrder,
      resetCheckout,
    }),
    [configs, delivery, paymentOption, submittedOrder, setConfig, updateDelivery, resetCheckout],
  )

  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>
}

export function useCheckout() {
  const ctx = useContext(CheckoutContext)
  if (!ctx) throw new Error('useCheckout must be used inside <CheckoutProvider>')
  return ctx
}

export { EMPTY_DELIVERY }
