// Generates a branded Urban Box Living project configuration PDF (proposal-style)
// from the current cart + per-unit configurations.
//
// Usage:
//   import { generateProjectPdf } from './utils/projectPdf'
//   await generateProjectPdf({ items, configs, projectSubtotal, buildLabel, installLabel })

import jsPDF from 'jspdf'
import { EMPTY_CONFIG, summarize } from '../components/Configurator'

const BRAND = {
  gold: [201, 168, 76],
  dark: [12, 12, 12],
  grey: [90, 90, 90],
  light: [245, 244, 240],
  border: [210, 208, 200],
  textGrey: [120, 120, 115],
}

const CONTACT = {
  phone: '+27 60 830 6956',
  email: 'hello.urbanboxliving@xanziteh.co.za',
  web: 'urbanboxliving.co.za',
}

const PAGE = { w: 210, h: 297 } // A4 mm
const MARGIN = { x: 18, top: 14, bottom: 22 }

function fmtZAR(value) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}

function setFill(doc, rgb)   { doc.setFillColor(rgb[0], rgb[1], rgb[2]) }
function setText(doc, rgb)   { doc.setTextColor(rgb[0], rgb[1], rgb[2]) }
function setStroke(doc, rgb) { doc.setDrawColor(rgb[0], rgb[1], rgb[2]) }

async function loadLogoDataUrl() {
  try {
    const url = (typeof window !== 'undefined' && window.location && window.location.origin)
      ? `${window.location.origin}/logo.png`
      : '/logo.png'
    const res = await fetch(url, { cache: 'force-cache' })
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const fr = new FileReader()
      fr.onload  = () => resolve(String(fr.result || ''))
      fr.onerror = () => resolve(null)
      fr.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function drawHeader(doc, logoDataUrl, refCode, dateStr) {
  // Dark header band with gold accent stripe
  setFill(doc, BRAND.dark)
  doc.rect(0, 0, PAGE.w, 26, 'F')
  setFill(doc, BRAND.gold)
  doc.rect(0, 0, 4, 26, 'F')

  // Logo
  if (logoDataUrl) {
    try { doc.addImage(logoDataUrl, 'PNG', MARGIN.x, 6, 14, 14) } catch { /* ignore */ }
  }

  // Brand text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  setText(doc, BRAND.gold)
  doc.text('URBAN BOX LIVING', MARGIN.x + (logoDataUrl ? 18 : 0), 13)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setText(doc, [191, 191, 191])
  doc.text('Modular Container Homes & Structures', MARGIN.x + (logoDataUrl ? 18 : 0), 18)

  // Right-side meta
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setText(doc, BRAND.gold)
  doc.text('PROJECT PROPOSAL', PAGE.w - MARGIN.x, 11, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  setText(doc, [191, 191, 191])
  doc.setFontSize(7.5)
  doc.text(dateStr, PAGE.w - MARGIN.x, 16, { align: 'right' })
  doc.setFont('courier', 'normal')
  doc.text(`Ref: ${refCode}`, PAGE.w - MARGIN.x, 20.5, { align: 'right' })

  // Gold contact strip
  setFill(doc, BRAND.gold)
  doc.rect(0, 26, PAGE.w, 6, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  setText(doc, BRAND.dark)
  doc.text(`Tel: ${CONTACT.phone}`, MARGIN.x, 30)
  doc.text(CONTACT.email, PAGE.w / 2, 30, { align: 'center' })
  doc.text(CONTACT.web, PAGE.w - MARGIN.x, 30, { align: 'right' })
}

function drawFooter(doc, refCode, pageNum, pageTotal) {
  const y = PAGE.h - 14
  setStroke(doc, BRAND.border)
  doc.setLineWidth(0.2)
  doc.line(MARGIN.x, y, PAGE.w - MARGIN.x, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  setText(doc, BRAND.textGrey)
  doc.text('Urban Box Living \u00B7 Modular Container Homes & Structures', MARGIN.x, y + 4)
  doc.text(`${CONTACT.email} \u00B7 ${CONTACT.web}`, MARGIN.x, y + 8)
  doc.text(`Ref ${refCode}  \u00B7  Page ${pageNum} of ${pageTotal}`, PAGE.w - MARGIN.x, y + 4, { align: 'right' })

  // Bottom gold accent
  setFill(doc, BRAND.gold)
  doc.rect(0, PAGE.h - 3, PAGE.w, 3, 'F')
}

function ensureSpace(doc, cursor, needed, addPage) {
  if (cursor + needed > PAGE.h - MARGIN.bottom) {
    addPage()
    return MARGIN.top + 22 // below header+strip
  }
  return cursor
}

function drawSectionTitle(doc, label, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  setText(doc, BRAND.textGrey)
  doc.text(label.toUpperCase(), MARGIN.x, y)
  setFill(doc, BRAND.gold)
  doc.rect(MARGIN.x, y + 1.5, 14, 0.8, 'F')
  return y + 6
}

function drawKeyValueLine(doc, label, value, y, opts = {}) {
  const { bold = false, color = BRAND.dark } = opts
  doc.setFont('helvetica', bold ? 'bold' : 'normal')
  doc.setFontSize(9.5)
  setText(doc, color)
  doc.text(String(label), MARGIN.x + 2, y)
  doc.text(String(value), PAGE.w - MARGIN.x - 2, y, { align: 'right' })
  return y + 5
}

export async function generateProjectPdf({
  items = [],
  configs = {},
  projectSubtotal = 0,
  buildLabel = '',
  installLabel = '',
  customer = null, // optional { name, email, phone }
} = {}) {
  if (!items.length) {
    throw new Error('No units to save. Please add units to your project first.')
  }

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const refCode = `UBL-${Date.now().toString(36).toUpperCase().slice(-6)}`
  const dateStr = new Date().toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const logoDataUrl = await loadLogoDataUrl()

  let pageCount = 1
  function addNewPage() {
    doc.addPage()
    pageCount += 1
    drawHeader(doc, logoDataUrl, refCode, dateStr)
  }

  // Page 1
  drawHeader(doc, logoDataUrl, refCode, dateStr)
  let y = MARGIN.top + 22

  // Title block
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  setText(doc, BRAND.dark)
  doc.text('Project Configuration & Quote', MARGIN.x, y + 4)
  setFill(doc, BRAND.gold)
  doc.rect(MARGIN.x, y + 7, 18, 1, 'F')
  y += 14

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  setText(doc, BRAND.grey)
  const introLines = doc.splitTextToSize(
    'Thank you for configuring your modular project with Urban Box Living. This document captures every unit, selection and add-on currently saved to your project, together with indicative totals and a build & installation timeline.',
    PAGE.w - MARGIN.x * 2,
  )
  doc.text(introLines, MARGIN.x, y)
  y += introLines.length * 4 + 6

  // Optional customer block
  if (customer && (customer.name || customer.email || customer.phone)) {
    y = drawSectionTitle(doc, 'Prepared for', y)
    if (customer.name)  y = drawKeyValueLine(doc, 'Name',  customer.name,  y)
    if (customer.email) y = drawKeyValueLine(doc, 'Email', customer.email, y)
    if (customer.phone) y = drawKeyValueLine(doc, 'Phone', customer.phone, y)
    y += 4
  }

  // Per-unit blocks
  items.forEach((item, index) => {
    const key = `${item.id || item.slug || 'unit'}-${index}`
    const cfg = configs[key] || EMPTY_CONFIG
    const summary = summarize(cfg)
    const basePrice = item.price?.amountZar ?? 0
    const unitTotal = (basePrice + summary.addonTotal) * (item.quantity || 1)

    // estimate space for this unit
    const lines =
      1 + 1 +
      summary.choiceLines.length +
      summary.addonLines.length +
      summary.packageLines.length +
      summary.serviceLines.length
    const needed = 32 + lines * 5
    y = ensureSpace(doc, y, needed, addNewPage)

    // Unit header bar
    setFill(doc, BRAND.light)
    doc.rect(MARGIN.x, y, PAGE.w - MARGIN.x * 2, 11, 'F')
    setFill(doc, BRAND.gold)
    doc.rect(MARGIN.x, y, 1.6, 11, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    setText(doc, BRAND.dark)
    doc.text(`Unit ${index + 1} \u00B7 ${item.name || 'Unit'}`, MARGIN.x + 4, y + 5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setText(doc, BRAND.grey)
    const qty = item.quantity || 1
    const sku = item.sku ? ` \u00B7 SKU ${item.sku}` : ''
    doc.text(`Qty ${qty}${sku} \u00B7 Base ${fmtZAR(basePrice)}`, MARGIN.x + 4, y + 9)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    setText(doc, BRAND.dark)
    doc.text(fmtZAR(unitTotal), PAGE.w - MARGIN.x - 2, y + 7, { align: 'right' })
    y += 14

    // Selections
    if (summary.choiceLines.length) {
      y = ensureSpace(doc, y, summary.choiceLines.length * 5 + 6, addNewPage)
      y = drawSectionTitle(doc, 'Selections', y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      setText(doc, BRAND.dark)
      summary.choiceLines.forEach((l) => {
        y = ensureSpace(doc, y, 5, addNewPage)
        doc.text(String(l.group), MARGIN.x + 2, y)
        setText(doc, BRAND.grey)
        doc.text(String(l.value), PAGE.w - MARGIN.x - 2, y, { align: 'right' })
        setText(doc, BRAND.dark)
        y += 5
      })
      y += 1
    }

    // Add-ons
    if (summary.addonLines.length) {
      y = ensureSpace(doc, y, summary.addonLines.length * 5 + 6, addNewPage)
      y = drawSectionTitle(doc, 'Add-ons', y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      summary.addonLines.forEach((l) => {
        y = ensureSpace(doc, y, 5, addNewPage)
        const label = l.sub ? `${l.label} (${l.sub})` : l.label
        setText(doc, BRAND.dark)
        doc.text(String(label), MARGIN.x + 2, y)
        doc.text(`+${fmtZAR(l.price)}`, PAGE.w - MARGIN.x - 2, y, { align: 'right' })
        y += 5
      })
      y += 1
    }

    // Packages
    if (summary.packageLines.length) {
      y = ensureSpace(doc, y, summary.packageLines.length * 5 + 6, addNewPage)
      y = drawSectionTitle(doc, 'Packages', y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      summary.packageLines.forEach((l) => {
        y = ensureSpace(doc, y, 5, addNewPage)
        setText(doc, BRAND.dark)
        doc.text(String(l.label), MARGIN.x + 2, y)
        doc.text(`+${fmtZAR(l.price)}`, PAGE.w - MARGIN.x - 2, y, { align: 'right' })
        y += 5
      })
      y += 1
    }

    // Services (no price column)
    if (summary.serviceLines.length) {
      y = ensureSpace(doc, y, summary.serviceLines.length * 5 + 6, addNewPage)
      y = drawSectionTitle(doc, 'Services', y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      setText(doc, BRAND.dark)
      summary.serviceLines.forEach((l) => {
        y = ensureSpace(doc, y, 5, addNewPage)
        doc.text(`\u2022 ${l.label}`, MARGIN.x + 2, y)
        y += 5
      })
      y += 1
    }

    // Subtotal line for this unit
    y = ensureSpace(doc, y, 9, addNewPage)
    setStroke(doc, BRAND.border)
    doc.setLineWidth(0.2)
    doc.line(MARGIN.x, y, PAGE.w - MARGIN.x, y)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    setText(doc, BRAND.dark)
    doc.text(`Configured total \u00B7 Unit ${index + 1}`, MARGIN.x + 2, y)
    doc.text(fmtZAR(unitTotal), PAGE.w - MARGIN.x - 2, y, { align: 'right' })
    y += 8
  })

  // Project totals block
  y = ensureSpace(doc, y, 50, addNewPage)
  setFill(doc, BRAND.dark)
  doc.rect(MARGIN.x, y, PAGE.w - MARGIN.x * 2, 30, 'F')
  setFill(doc, BRAND.gold)
  doc.rect(MARGIN.x, y, 1.6, 30, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setText(doc, BRAND.gold)
  doc.text('PROJECT TOTAL', MARGIN.x + 4, y + 7)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text(fmtZAR(projectSubtotal), MARGIN.x + 4, y + 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(191, 191, 191)
  doc.text(
    'Indicative subtotal \u2014 excludes delivery, site preparation and VAT (where applicable).',
    MARGIN.x + 4, y + 25,
  )

  // Right column: timeline
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  setText(doc, BRAND.gold)
  doc.text('ESTIMATED TIMELINE', PAGE.w - MARGIN.x - 2, y + 7, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255)
  if (buildLabel)   doc.text(`Build:        ${buildLabel}`,        PAGE.w - MARGIN.x - 2, y + 15, { align: 'right' })
  if (installLabel) doc.text(`Installation: ${installLabel}`,      PAGE.w - MARGIN.x - 2, y + 21, { align: 'right' })

  y += 36

  // Notes
  y = ensureSpace(doc, y, 30, addNewPage)
  y = drawSectionTitle(doc, 'Notes & next steps', y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  setText(doc, BRAND.grey)
  const notes = [
    'This document is a configuration snapshot, not a binding quote. Final pricing is confirmed once site assessment, delivery distance and any custom requirements are reviewed.',
    'To progress this project, return to your cart on urbanboxliving.co.za or reply to this PDF with your preferred delivery date and site address.',
    'Our team will respond within 1\u20132 business days with a formal proposal, deposit invoice and production schedule.',
  ]
  notes.forEach((n) => {
    const nl = doc.splitTextToSize(n, PAGE.w - MARGIN.x * 2)
    y = ensureSpace(doc, y, nl.length * 4 + 2, addNewPage)
    doc.text(nl, MARGIN.x, y)
    y += nl.length * 4 + 2
  })

  // Footers on every page
  const total = pageCount
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p)
    drawFooter(doc, refCode, p, total)
  }

  const filename = `UrbanBoxLiving-Project-${refCode}.pdf`
  doc.save(filename)
  return { filename, refCode }
}
