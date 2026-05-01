import { useState } from 'react'

/* ----------------------------- Spec data ----------------------------- */

const FREE_CHOICES = [
  {
    id: 'exteriorColor',
    label: 'Exterior Finish Color',
    help: 'Pick the primary shell colour.',
    type: 'color',
    options: [
      { id: 'polarWhite', label: 'Polar White', hex: '#F5F5F2' },
      { id: 'charcoal', label: 'Charcoal', hex: '#3A3A3A' },
      { id: 'slateGrey', label: 'Slate Grey', hex: '#6B7280' },
      { id: 'sandTaupe', label: 'Sand Taupe', hex: '#B8ADA3' },
      { id: 'oliveGreen', label: 'Olive Green', hex: '#5F6F5B' },
    ],
  },
  {
    id: 'exteriorCladding',
    label: 'Exterior Cladding Style',
    help: 'How the outer shell reads visually.',
    type: 'material',
    options: [
      { id: 'smoothPanel', label: 'Smooth Panel', texture: 'smooth' },
      { id: 'corrugatedSteel', label: 'Corrugated Steel', texture: 'corrugated' },
      { id: 'timberCladding', label: 'Timber Cladding', texture: 'timber' },
      { id: 'compositeBoard', label: 'Composite Board', texture: 'composite' },
    ],
  },
  {
    id: 'windowPackage',
    label: 'Window Package',
    help: 'Glass layout for natural light.',
    type: 'preview',
    options: [
      { id: 'standardSliding', label: 'Standard Sliding', preview: 'win-standard' },
      { id: 'fullGlassFront', label: 'Full Glass Front', preview: 'win-full' },
      { id: 'doubleWindow', label: 'Double Window Layout', preview: 'win-double' },
      { id: 'cornerWindow', label: 'Corner Window Layout', preview: 'win-corner' },
    ],
  },
  {
    id: 'doorStyle',
    label: 'Door Style',
    help: 'Primary entry door type.',
    type: 'preview',
    options: [
      { id: 'standardSingle', label: 'Standard Single Door', preview: 'door-single' },
      { id: 'halfGlass', label: 'Half Glass Door', preview: 'door-halfglass' },
      { id: 'doubleEntry', label: 'Double Entry Door', preview: 'door-double' },
      { id: 'security', label: 'Security Door', preview: 'door-security' },
    ],
  },
  {
    id: 'floorFinish',
    label: 'Floor Finish',
    help: 'Interior floor surface.',
    type: 'material',
    options: [
      { id: 'lightOak', label: 'Light Oak', texture: 'wood-light' },
      { id: 'darkWalnut', label: 'Dark Walnut', texture: 'wood-dark' },
      { id: 'concreteGrey', label: 'Concrete Grey', texture: 'concrete' },
      { id: 'stoneFinish', label: 'Stone Finish', texture: 'stone' },
      { id: 'vinylTaupe', label: 'Vinyl Taupe', texture: 'vinyl' },
    ],
  },
  {
    id: 'wallFinish',
    label: 'Wall Finish',
    help: 'Interior wall panel material.',
    type: 'material',
    options: [
      { id: 'standardWhite', label: 'Standard White Panel', texture: 'panel-white' },
      { id: 'warmSand', label: 'Warm Sand Panel', texture: 'panel-sand' },
      { id: 'timberAccent', label: 'Timber Accent', texture: 'timber' },
      { id: 'industrialGrey', label: 'Industrial Grey Panel', texture: 'panel-grey' },
    ],
  },
  {
    id: 'ceilingFinish',
    label: 'Ceiling Finish',
    help: 'Overhead surface treatment.',
    type: 'material',
    options: [
      { id: 'matteWhite', label: 'Matte White', texture: 'panel-white' },
      { id: 'oakPanel', label: 'Oak Panel', texture: 'wood-light' },
      { id: 'acousticPanel', label: 'Acoustic Panel', texture: 'acoustic' },
    ],
  },
  {
    id: 'lightingStyle',
    label: 'Lighting Style',
    help: 'Lighting tone and fixture style.',
    type: 'icon',
    options: [
      { id: 'standardLED', label: 'Standard LED', icon: '◐' },
      { id: 'warmAmbient', label: 'Warm Ambient', icon: '☀' },
      { id: 'linearModern', label: 'Linear Modern', icon: '▬' },
    ],
  },
  {
    id: 'layoutVariant',
    label: 'Layout Variant',
    help: 'Internal floor plan arrangement.',
    type: 'layout',
    options: [
      { id: 'layoutA', label: 'Layout A', plan: 'A' },
      { id: 'layoutB', label: 'Layout B', plan: 'B' },
      { id: 'layoutC', label: 'Layout C', plan: 'C' },
    ],
  },
]

const ADDON_GROUPS = [
  {
    id: 'utilities',
    label: 'Utilities',
    addons: [
      {
        id: 'plumbing', label: 'Plumbing Package', price: 18000, icon: '🚰',
        sub: { type: 'single', options: ['Basic Sink', 'Sink + Toilet', 'Full Bathroom'] },
      },
      {
        id: 'kitchenette', label: 'Kitchenette Package', price: 15000, icon: '🍳',
        sub: { type: 'single', options: ['Compact', 'Standard', 'Premium'] },
      },
      {
        id: 'extraPower', label: 'Additional Power Package', price: 6500, icon: '⚡',
        sub: { type: 'single', options: ['2 extra outlets', '4 extra outlets', 'Dedicated appliance circuit'] },
      },
    ],
  },
  {
    id: 'performance',
    label: 'Performance',
    addons: [
      {
        id: 'insulation', label: 'Insulation Upgrade', price: 12000, icon: '🧊',
        sub: { type: 'single', options: ['Standard Thermal', 'Premium Thermal', 'Acoustic + Thermal'] },
      },
      {
        id: 'solarPrep', label: 'Solar Prep', price: 9000, icon: '🔌',
        sub: { type: 'single', options: ['Conduit Prep', 'Inverter Prep', 'Full Solar Ready'] },
      },
      {
        id: 'fullSolar', label: 'Full Solar Package', price: 45000, icon: '☀',
        sub: { type: 'single', options: ['3kW', '5kW', '8kW'] },
      },
    ],
  },
  {
    id: 'comfort',
    label: 'Comfort',
    addons: [
      { id: 'airconPrep', label: 'Aircon Prep', price: 6000, icon: '❄' },
      {
        id: 'airconInstalled', label: 'Aircon Installed', price: 18000, icon: '❄',
        sub: { type: 'single', options: ['9000 BTU', '12000 BTU', '18000 BTU'] },
      },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    addons: [
      {
        id: 'securityBars', label: 'Security Bars', price: 7500, icon: '🛡',
        sub: { type: 'single', options: ['Window only', 'Full package'] },
      },
      { id: 'reinforcedDoor', label: 'Reinforced Door', price: 9500, icon: '🚪' },
    ],
  },
  {
    id: 'siteServices',
    label: 'Site Services',
    addons: [
      {
        id: 'foundation', label: 'Foundation Support', price: 15000, icon: '🏗',
        sub: { type: 'single', options: ['Basic pads', 'Raised platform', 'Full footing system'] },
      },
      { id: 'installAssist', label: 'Installation Assistance', price: 12000, icon: '🔧' },
    ],
  },
]

const PACKAGES = [
  {
    id: 'comfortPkg', label: 'Comfort Package', price: 25000,
    includes: ['Premium insulation', 'Better lighting', 'Additional outlets'],
  },
  {
    id: 'offGridPkg', label: 'Off-Grid Package', price: 65000,
    includes: ['Solar prep', 'Inverter prep', 'Water integration'],
  },
  {
    id: 'securityPkg', label: 'Security Package', price: 18000,
    includes: ['Security bars', 'Reinforced access'],
  },
]

const SERVICES = [
  { id: 'siteAssessment', label: 'Site Assessment' },
  { id: 'engineeringReview', label: 'Engineering Review' },
  { id: 'municipalDrawing', label: 'Municipal Drawing Support' },
  { id: 'installSupervision', label: 'Installation Supervision' },
]

/* ----------------------------- Helpers ----------------------------- */

function formatCurrency(value) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR', maximumFractionDigits: 0,
  }).format(value)
}

function findChoiceLabel(choiceId, optionId) {
  const choice = FREE_CHOICES.find((c) => c.id === choiceId)
  if (!choice) return null
  const opt = choice.options.find((o) => o.id === optionId)
  return opt ? { group: choice.label, value: opt.label } : null
}

function findAddon(addonId) {
  for (const group of ADDON_GROUPS) {
    const found = group.addons.find((a) => a.id === addonId)
    if (found) return found
  }
  return null
}

/* ----------------------------- Section shell ----------------------------- */

function Section({ id, title, subtitle, openSet, setOpenSet, summary, children }) {
  const open = openSet.has(id)
  function toggle() {
    const next = new Set(openSet)
    if (open) next.delete(id); else next.add(id)
    setOpenSet(next)
  }
  return (
    <div className={`cfg-section ${open ? 'is-open' : ''}`}>
      <button type="button" className="cfg-section-head" onClick={toggle} aria-expanded={open}>
        <div className="cfg-section-titles">
          <span className="cfg-section-title">{title}</span>
          {subtitle && <span className="cfg-section-sub">{subtitle}</span>}
        </div>
        <div className="cfg-section-meta">
          {summary && <span className="cfg-section-summary">{summary}</span>}
          <span className="cfg-chevron" aria-hidden="true">▾</span>
        </div>
      </button>
      <div className="cfg-collapse" aria-hidden={!open}>
        <div className="cfg-collapse-inner">
          <div className="cfg-section-body">{children}</div>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------- Choice renderers ----------------------------- */

function ColorSwatchGrid({ choice, value, onSelect }) {
  return (
    <div className="cfg-grid cfg-grid-color">
      {choice.options.map((o) => {
        const selected = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            className={`cfg-swatch ${selected ? 'is-selected' : ''}`}
            onClick={() => onSelect(o.id)}
            aria-pressed={selected}
          >
            <span className="cfg-swatch-tile" style={{ background: o.hex }} />
            <span className="cfg-swatch-label">{o.label}</span>
            {selected && <span className="cfg-check" aria-hidden="true">✓</span>}
          </button>
        )
      })}
    </div>
  )
}

function MaterialTextureTiles({ choice, value, onSelect }) {
  return (
    <div className="cfg-grid cfg-grid-material">
      {choice.options.map((o) => {
        const selected = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            className={`cfg-tile ${selected ? 'is-selected' : ''}`}
            onClick={() => onSelect(o.id)}
            aria-pressed={selected}
          >
            <span className={`cfg-tile-surface tex-${o.texture}`} />
            <span className="cfg-tile-label">{o.label}</span>
            {selected && <span className="cfg-check" aria-hidden="true">✓</span>}
          </button>
        )
      })}
    </div>
  )
}

function PreviewCardGrid({ choice, value, onSelect }) {
  return (
    <div className="cfg-grid cfg-grid-preview">
      {choice.options.map((o) => {
        const selected = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            className={`cfg-card ${selected ? 'is-selected' : ''}`}
            onClick={() => onSelect(o.id)}
            aria-pressed={selected}
          >
            <span className={`cfg-card-art preview-${o.preview}`} />
            <span className="cfg-card-label">{o.label}</span>
            {selected && <span className="cfg-check" aria-hidden="true">✓</span>}
          </button>
        )
      })}
    </div>
  )
}

function IconCardGrid({ choice, value, onSelect }) {
  return (
    <div className="cfg-grid cfg-grid-icon">
      {choice.options.map((o) => {
        const selected = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            className={`cfg-card cfg-card-icon ${selected ? 'is-selected' : ''}`}
            onClick={() => onSelect(o.id)}
            aria-pressed={selected}
          >
            <span className="cfg-card-icon-glyph">{o.icon}</span>
            <span className="cfg-card-label">{o.label}</span>
            {selected && <span className="cfg-check" aria-hidden="true">✓</span>}
          </button>
        )
      })}
    </div>
  )
}

function LayoutPreviewCards({ choice, value, onSelect }) {
  return (
    <div className="cfg-grid cfg-grid-layout">
      {choice.options.map((o) => {
        const selected = value === o.id
        return (
          <button
            key={o.id}
            type="button"
            className={`cfg-card cfg-card-layout ${selected ? 'is-selected' : ''}`}
            onClick={() => onSelect(o.id)}
            aria-pressed={selected}
          >
            <span className={`cfg-floorplan plan-${o.plan}`}>
              <span className="fp-room fp-room-1" />
              <span className="fp-room fp-room-2" />
              <span className="fp-room fp-room-3" />
              <span className="fp-door" />
            </span>
            <span className="cfg-card-label">{o.label}</span>
            {selected && <span className="cfg-check" aria-hidden="true">✓</span>}
          </button>
        )
      })}
    </div>
  )
}

function renderChoice(choice, value, onSelect) {
  switch (choice.type) {
    case 'color': return <ColorSwatchGrid choice={choice} value={value} onSelect={onSelect} />
    case 'material': return <MaterialTextureTiles choice={choice} value={value} onSelect={onSelect} />
    case 'preview': return <PreviewCardGrid choice={choice} value={value} onSelect={onSelect} />
    case 'icon': return <IconCardGrid choice={choice} value={value} onSelect={onSelect} />
    case 'layout': return <LayoutPreviewCards choice={choice} value={value} onSelect={onSelect} />
    default: return null
  }
}

/* ----------------------------- Add-on card ----------------------------- */

function AddOnFeatureCard({ addon, state, onToggle, onSubChange }) {
  const enabled = !!state?.enabled
  return (
    <div className={`cfg-addon ${enabled ? 'is-enabled' : ''}`}>
      <div className="cfg-addon-head">
        <span className="cfg-addon-icon" aria-hidden="true">{addon.icon}</span>
        <div className="cfg-addon-titles">
          <span className="cfg-addon-label">{addon.label}</span>
          <span className="cfg-addon-price">+{formatCurrency(addon.price)}</span>
        </div>
        <label className="cfg-switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(addon.id, e.target.checked)}
          />
          <span className="cfg-switch-track"><span className="cfg-switch-thumb" /></span>
        </label>
      </div>
      {addon.sub && (
        <div className="cfg-collapse" aria-hidden={!enabled}>
          <div className="cfg-collapse-inner">
            <div className="cfg-addon-sub">
              <span className="cfg-addon-sub-label">Choose option</span>
              <div className="cfg-pill-row">
                {addon.sub.options.map((opt) => {
                  const selected = state?.sub === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`cfg-pill ${selected ? 'is-selected' : ''}`}
                      onClick={() => onSubChange(addon.id, opt)}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ----------------------------- Package card ----------------------------- */

function UpgradePackageCards({ value, onToggle }) {
  return (
    <div className="cfg-grid cfg-grid-package">
      {PACKAGES.map((pkg) => {
        const selected = !!value[pkg.id]
        return (
          <div key={pkg.id} className={`cfg-package ${selected ? 'is-selected' : ''}`}>
            <div className="cfg-package-head">
              <span className="cfg-package-label">{pkg.label}</span>
              <span className="cfg-package-price">+{formatCurrency(pkg.price)}</span>
            </div>
            <ul className="cfg-package-list">
              {pkg.includes.map((line) => (
                <li key={line}><span className="cfg-bullet">▸</span>{line}</li>
              ))}
            </ul>
            <button
              type="button"
              className={`cfg-package-btn ${selected ? 'is-selected' : ''}`}
              onClick={() => onToggle(pkg.id)}
            >
              {selected ? '✓ Added' : 'Add Package'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

/* ----------------------------- Public API ----------------------------- */

export const EMPTY_CONFIG = {
  freeChoices: {},
  addons: {},
  packages: {},
  services: {},
}

export function summarize(config = EMPTY_CONFIG) {
  const freeChoices = config.freeChoices || {}
  const addons = config.addons || {}
  const packages = config.packages || {}
  const services = config.services || {}

  const choiceLines = Object.entries(freeChoices)
    .map(([cid, oid]) => findChoiceLabel(cid, oid))
    .filter(Boolean)

  const addonLines = Object.entries(addons)
    .filter(([, st]) => st?.enabled)
    .map(([aid, st]) => {
      const a = findAddon(aid)
      if (!a) return null
      return { id: aid, label: a.label, sub: st.sub || null, price: a.price }
    })
    .filter(Boolean)

  const packageLines = PACKAGES.filter((p) => packages[p.id])
    .map((p) => ({ id: p.id, label: p.label, price: p.price }))

  const serviceLines = SERVICES.filter((s) => services[s.id])
    .map((s) => ({ id: s.id, label: s.label }))

  const addonTotal =
    addonLines.reduce((sum, l) => sum + l.price, 0) +
    packageLines.reduce((sum, l) => sum + l.price, 0)

  return { choiceLines, addonLines, packageLines, serviceLines, addonTotal }
}

/* ----------------------------- Main component ----------------------------- */

export default function Configurator({ value, onChange }) {
  const config = value || EMPTY_CONFIG
  const freeChoices = config.freeChoices || {}
  const addons = config.addons || {}
  const packages = config.packages || {}
  const services = config.services || {}

  const [openSet, setOpenSet] = useState(new Set(['exteriorColor']))

  function patch(partial) {
    onChange?.({ ...config, ...partial })
  }

  function selectChoice(choiceId, optionId) {
    patch({ freeChoices: { ...freeChoices, [choiceId]: optionId } })
  }

  function toggleAddon(addonId, enabled) {
    patch({ addons: { ...addons, [addonId]: { ...(addons[addonId] || {}), enabled } } })
  }

  function setAddonSub(addonId, sub) {
    patch({
      addons: {
        ...addons,
        [addonId]: { ...(addons[addonId] || { enabled: true }), enabled: true, sub },
      },
    })
  }

  function togglePackage(pkgId) {
    patch({ packages: { ...packages, [pkgId]: !packages[pkgId] } })
  }

  function toggleService(serviceId) {
    patch({ services: { ...services, [serviceId]: !services[serviceId] } })
  }

  /* Per-section short summary in collapsed head */
  function choiceSectionSummary(choice) {
    const sel = freeChoices[choice.id]
    if (!sel) return null
    const opt = choice.options.find((o) => o.id === sel)
    return opt ? opt.label : null
  }

  function addonGroupSummary(group) {
    const enabledCount = group.addons.filter((a) => addons[a.id]?.enabled).length
    return enabledCount ? `${enabledCount} selected` : null
  }

  const packageCount = PACKAGES.filter((p) => packages[p.id]).length
  const serviceCount = SERVICES.filter((s) => services[s.id]).length

  return (
    <div className="cfg-root">
      <div className="cfg-step-group">
        <div className="cfg-step-head">
          <span className="cfg-step-eyebrow">Step 2</span>
          <h3 className="cfg-step-title">Included Configuration Choices</h3>
          <p className="cfg-step-intro">Preference selections - included in your base price.</p>
        </div>
        {FREE_CHOICES.map((choice) => (
          <Section
            key={choice.id}
            id={choice.id}
            title={choice.label}
            subtitle={choice.help}
            openSet={openSet}
            setOpenSet={setOpenSet}
            summary={choiceSectionSummary(choice)}
          >
            {renderChoice(choice, freeChoices[choice.id], (oid) => selectChoice(choice.id, oid))}
          </Section>
        ))}
      </div>

      <div className="cfg-step-group">
        <div className="cfg-step-head">
          <span className="cfg-step-eyebrow">Step 3</span>
          <h3 className="cfg-step-title">Optional Paid Add-Ons</h3>
          <p className="cfg-step-intro">Selections update your estimated total live.</p>
        </div>
        {ADDON_GROUPS.map((group) => (
          <Section
            key={group.id}
            id={`addon-${group.id}`}
            title={group.label}
            openSet={openSet}
            setOpenSet={setOpenSet}
            summary={addonGroupSummary(group)}
          >
            <div className="cfg-addon-grid">
              {group.addons.map((addon) => (
                <AddOnFeatureCard
                  key={addon.id}
                  addon={addon}
                  state={addons[addon.id]}
                  onToggle={toggleAddon}
                  onSubChange={setAddonSub}
                />
              ))}
            </div>
          </Section>
        ))}
      </div>

      <div className="cfg-step-group">
        <div className="cfg-step-head">
          <span className="cfg-step-eyebrow">Step 4</span>
          <h3 className="cfg-step-title">Upgrade Packages</h3>
          <p className="cfg-step-intro">Bundles of popular add-ons at a single price.</p>
        </div>
        <Section
          id="packages"
          title="Compare packages"
          openSet={openSet}
          setOpenSet={setOpenSet}
          summary={packageCount ? `${packageCount} added` : null}
        >
          <UpgradePackageCards value={packages} onToggle={togglePackage} />
        </Section>
      </div>

      <div className="cfg-step-group">
        <div className="cfg-step-head">
          <span className="cfg-step-eyebrow">Step 5</span>
          <h3 className="cfg-step-title">Professional Services</h3>
          <p className="cfg-step-intro">Quoted separately by our specialists.</p>
        </div>
        <Section
          id="services"
          title="Optional services"
          openSet={openSet}
          setOpenSet={setOpenSet}
          summary={serviceCount ? `${serviceCount} requested` : null}
        >
          <div className="cfg-service-grid">
            {SERVICES.map((s) => {
              const selected = !!services[s.id]
              return (
                <button
                  key={s.id}
                  type="button"
                  className={`cfg-service ${selected ? 'is-selected' : ''}`}
                  onClick={() => toggleService(s.id)}
                >
                  <span className="cfg-service-label">{s.label}</span>
                  <span className="cfg-service-flag">Quoted Separately</span>
                  {selected && <span className="cfg-check" aria-hidden="true">✓</span>}
                </button>
              )
            })}
          </div>
        </Section>
      </div>
    </div>
  )
}
