// Realistic build/install timeline ranges for container projects.
//
// Reality check (20ft mobile office container):
//   Build:   3-6 weeks
//   Install: 1-3 days (up to ~1 week with logistics)
//
// We present *ranges* instead of a single worst-case number, and we make
// those ranges grow with project complexity:
//   - quantity (more units => more build/install time)
//   - packages (kitchen, bathroom, solar, plumbing => more fitting work)
//   - add-ons  (electrical, glazing, etc.)
//   - services (crane, special access => more install logistics)

import { EMPTY_CONFIG, summarize } from '../components/Configurator'

function rowKey(item, index) {
  return `${item.id || item.slug || 'unit'}-${index}`
}

export function estimateProjectTimeline(items, configs) {
  if (!items || !items.length) {
    return {
      buildMinWeeks: 0,
      buildMaxWeeks: 0,
      installMinDays: 0,
      installMaxDays: 0,
      totalQty: 0,
      packagesCount: 0,
      addonsCount: 0,
      servicesCount: 0,
    }
  }

  const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0)

  let packagesCount = 0
  let addonsCount = 0
  let servicesCount = 0

  items.forEach((item, index) => {
    const cfg = (configs && configs[rowKey(item, index)]) || EMPTY_CONFIG
    const s = summarize(cfg)
    const qty = item.quantity || 1
    packagesCount += s.packageLines.length * qty
    addonsCount += s.addonLines.length * qty
    servicesCount += s.serviceLines.length
  })

  // ---- Build window (weeks) ----
  // Simple single unit:        3 - 4 weeks
  // Extra units:               +0.5 wk min / +1.5 wk max each
  // Packages + heavy add-ons:  +0 min / +1 wk max per ~2 items, cap 3 wks
  const extraUnits = Math.max(0, totalQty - 1)
  const complexityBump = Math.min(
    3,
    Math.ceil((packagesCount + Math.floor(addonsCount / 3)) / 2),
  )
  const buildMinWeeks = Math.max(3, Math.round(3 + extraUnits * 0.5))
  const buildMaxWeeks = Math.max(
    buildMinWeeks + 1,
    Math.round(4 + extraUnits * 1.5 + complexityBump),
  )

  // ---- Install window (days) ----
  // Single simple unit:        1 - 2 days
  // Extra units:               +1 day min / +2 days max each
  // Services (crane etc.):     +1 day max
  // Heavy fitting (packages):  +1 day max
  const installMinDays = Math.max(1, 1 + extraUnits)
  const installMaxDays = Math.max(
    installMinDays + 1,
    2 + extraUnits * 2 + (servicesCount > 0 ? 1 : 0) + (packagesCount > 0 ? 1 : 0),
  )

  return {
    buildMinWeeks,
    buildMaxWeeks,
    installMinDays,
    installMaxDays,
    totalQty,
    packagesCount,
    addonsCount,
    servicesCount,
  }
}

export function formatRange(min, max, unitSingular, unitPlural) {
  const unit = (n) => (n === 1 ? unitSingular : unitPlural || `${unitSingular}s`)
  if (min === max) return `${min} ${unit(min)}`
  return `${min}-${max} ${unit(max)}`
}

export function formatBuildRange(estimate) {
  return formatRange(estimate.buildMinWeeks, estimate.buildMaxWeeks, 'week')
}

export function formatInstallRange(estimate) {
  return formatRange(estimate.installMinDays, estimate.installMaxDays, 'day')
}
