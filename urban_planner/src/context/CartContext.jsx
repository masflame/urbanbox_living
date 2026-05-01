import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

const STORAGE_KEY = 'urban-box-cart'
const STORAGE_VERSION = 1

const CartContext = createContext(null)

function sanitizeItem(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (!raw.id) return null
  const quantity = Number.isFinite(raw.quantity) ? Math.max(1, Math.floor(raw.quantity)) : 1
  return {
    id: raw.id,
    slug: raw.slug ?? null,
    name: raw.name ?? '',
    coverImage: raw.coverImage ?? null,
    category: raw.category ?? null,
    collectionLabel: raw.collectionLabel ?? null,
    price: raw.price ?? null,
    size: raw.size ?? null,
    quantity,
  }
}

function readStoredCart() {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)

    // Legacy shape: a bare array of items (pre-versioning).
    if (Array.isArray(parsed)) {
      return parsed.map(sanitizeItem).filter(Boolean)
    }

    // Versioned shape: { version, items }.
    if (parsed && parsed.version === STORAGE_VERSION && Array.isArray(parsed.items)) {
      return parsed.items.map(sanitizeItem).filter(Boolean)
    }

    return []
  } catch {
    return []
  }
}

function writeStoredCart(items) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, items }),
    )
  } catch (error) {
    // Quota exceeded / private mode / disabled storage - fail silent.
    console.warn('Cart persistence failed:', error)
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart)
  const isFirstRender = useRef(true)

  // Persist on change (skip the initial render - state was hydrated from storage).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    writeStoredCart(items)
  }, [items])

  // Sync across tabs / windows.
  useEffect(() => {
    if (typeof window === 'undefined') return

    function handleStorage(event) {
      if (event.key !== STORAGE_KEY) return
      setItems(readStoredCart())
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const value = useMemo(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = items.reduce((sum, item) => {
      const unitPrice = item.price?.amountZar ?? 0
      return sum + unitPrice * item.quantity
    }, 0)

    return {
      items,
      itemCount,
      subtotal,
      addItem(unit, quantity = 1) {
        setItems((currentItems) => {
          const existingItem = currentItems.find((item) => item.id === unit.id)

          if (existingItem) {
            return currentItems.map((item) =>
              item.id === unit.id
                ? { ...item, quantity: item.quantity + quantity }
                : item,
            )
          }

          return [
            ...currentItems,
            {
              id: unit.id,
              slug: unit.slug,
              name: unit.name,
              coverImage: unit.coverImage,
              category: unit.category,
              collectionLabel: unit.collectionLabel,
              price: unit.price,
              size: unit.size,
              quantity,
            },
          ]
        })
      },
      updateQuantity(id, quantity) {
        setItems((currentItems) =>
          currentItems
            .map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item))
            .filter((item) => item.quantity > 0),
        )
      },
      removeItem(id) {
        setItems((currentItems) => currentItems.filter((item) => item.id !== id))
      },
      clearCart() {
        setItems([])
      },
    }
  }, [items])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}