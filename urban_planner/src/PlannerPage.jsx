import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import galleryConfig from './data/design-gallery.json'
import './App.css'

const projectTypes = [
  { id: 'home', label: 'Container Home', description: 'Studios, family homes and rental units.' },
  { id: 'office', label: 'Site Office', description: 'Portable offices, boardrooms and admin hubs.' },
  { id: 'classroom', label: 'Classroom', description: 'Teaching blocks, training rooms and labs.' },
  { id: 'storage', label: 'Storage Unit', description: 'Secure storage, archive rooms and utilities.' },
  { id: 'retail', label: 'Retail Kiosk', description: 'Pop-up stores, salons and food service points.' },
  { id: 'cabin', label: 'Off-Grid Cabin', description: 'Remote living, tourism and weekend retreats.' },
]

const templatesByProject = {
  home: [
    { id: 'studio-20', label: '20ft Studio Start', summary: 'Open-plan starter studio with bathroom.' },
    { id: 'duo-40', label: '40ft Double Module', summary: 'Two linked containers with bedroom and lounge.' },
    { id: 'custom', label: 'Custom Home Layout', summary: 'Tailor bedrooms, wet areas, finishes and facade.' },
  ],
  office: [
    { id: 'office-core', label: 'Core Site Office', summary: 'Reception, manager office and kitchenette.' },
    { id: 'office-yard', label: 'Project Yard Suite', summary: 'Multi-room admin setup for active sites.' },
    { id: 'custom', label: 'Custom Office Layout', summary: 'Choose offices, meeting room and storage zones.' },
  ],
  classroom: [
    { id: 'edu-single', label: 'Single Classroom', summary: 'One teaching room with support storage.' },
    { id: 'edu-dual', label: 'Dual Learning Block', summary: 'Two connected rooms with circulation space.' },
    { id: 'custom', label: 'Custom Learning Layout', summary: 'Add ablutions, partitions and teacher facilities.' },
  ],
  storage: [
    { id: 'secure-20', label: '20ft Secure Store', summary: 'Heavy-duty storage shell with lighting and shelving.' },
    { id: 'secure-40', label: '40ft Inventory Hub', summary: 'High-volume storage with service access.' },
    { id: 'custom', label: 'Custom Storage Layout', summary: 'Split secure zones, workbench and access points.' },
  ],
  retail: [
    { id: 'retail-pop', label: 'Pop-Up Retail Pod', summary: 'Counter frontage with compact service area.' },
    { id: 'retail-duo', label: 'Retail Double Bay', summary: 'Two modules for front-of-house and back office.' },
    { id: 'custom', label: 'Custom Retail Layout', summary: 'Fit for salon, coffee bar, deli or showroom.' },
  ],
  cabin: [
    { id: 'cabin-lite', label: 'Cabin Starter', summary: 'Weekend cabin with compact amenities.' },
    { id: 'cabin-solar', label: 'Off-Grid Solar Cabin', summary: 'Solar-ready package for remote locations.' },
    { id: 'custom', label: 'Custom Cabin Layout', summary: 'Adapt sleeping, decking and utility zones.' },
  ],
}

const provinces = ['Western Cape', 'Eastern Cape', 'Northern Cape', 'Free State', 'KwaZulu-Natal', 'North West', 'Gauteng', 'Mpumalanga', 'Limpopo']

const finishLevels = {
  basic: { label: 'Basic', surcharge: 0, note: 'Functional fit-out focused on fast delivery.' },
  premium: { label: 'Premium', surcharge: 45000, note: 'Enhanced joinery, lighting and interior trim.' },
  luxury: { label: 'Luxury', surcharge: 98000, note: 'High-end finishes, refined materials and detailing.' },
}

const budgetBands = [
  { value: '250000', label: 'Up to R250k' },
  { value: '450000', label: 'R250k - R450k' },
  { value: '750000', label: 'R450k - R750k' },
  { value: '1200000', label: 'R750k - R1.2m' },
  { value: '2000000', label: 'R1.2m+' },
]

const paymentPlans = [
  { id: 'standard', label: 'Standard Plan' },
  { id: 'flexible', label: 'Flexible Plan (Recommended)' },
  { id: 'finance', label: 'Monthly Finance Estimate' },
]

const portfolioDesigns = [
  '1-Bedroom Container Home',
  '20ft Studio Home',
  'Shower',
  'Beautiful Furnished Bathroom',
  'Luxury Container Residence',
  'Modern Family Container Home',
  'Executive Container Home',
  'Contemporary Container Build',
  'Off-Grid Container Home',
  'Double Unit Container Home',
  'Flagship Container Home',
  'Office / Workspace Unit',
  'Custom on Request',
]

const galleryAssets = galleryConfig.galleryAssets || []
const designGalleryMetadata = galleryConfig.designGalleryMetadata || {}

function getDesignGallery(design) {
  const metadata = designGalleryMetadata[design]
  if (!metadata) return []

  const required = metadata.required || []
  const preferred = metadata.preferred || []
  const limit = metadata.limit || 12

  const requiredMatches = galleryAssets.filter((asset) =>
    required.every((requiredTag) => asset.tags.includes(requiredTag)),
  )

  const scored = requiredMatches
    .map((asset) => ({
      ...asset,
      score: preferred.reduce((count, preferredTag) => (asset.tags.includes(preferredTag) ? count + 1 : count), 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map((asset) => asset.path)

  if (scored.length >= limit) {
    return scored.slice(0, limit)
  }

  const fallback = galleryAssets
    .filter((asset) => preferred.some((preferredTag) => asset.tags.includes(preferredTag)))
    .map((asset) => asset.path)

  return [...new Set([...scored, ...fallback])].slice(0, limit)
}

const currency = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 })

const initialForm = {
  projectType: '',
  templateId: '',
  selectedDesign: '',
  selectedGalleryImages: [],
  customPlanFileName: '',
  province: 'Western Cape',
  location: '',
  terrain: 'flat',
  access: 'easy',
  unitSize: '20ft',
  units: 1,
  rooms: 2,
  bathrooms: 1,
  finishLevel: 'premium',
  budget: '450000',
  paymentPlan: 'flexible',
  plumbing: true,
  solar: false,
  insulation: true,
  decking: false,
  customPlan: false,
  notes: '',
}

const steps = ['Use Case', 'Site', 'Build', 'Finishes', 'Brief']
const PLANNER_BRIEF_STORAGE_KEY = 'urbanPlannerBrief'
const PLANNER_PAYLOAD_STORAGE_KEY = 'urbanPlannerPayload'

const designToProjectType = {
  '1-Bedroom Container Home': 'home',
  '20ft Studio Home': 'home',
  Shower: 'home',
  'Beautiful Furnished Bathroom': 'home',
  'Luxury Container Residence': 'home',
  'Modern Family Container Home': 'home',
  'Executive Container Home': 'home',
  'Contemporary Container Build': 'home',
  'Off-Grid Container Home': 'cabin',
  'Double Unit Container Home': 'home',
  'Flagship Container Home': 'home',
  'Office / Workspace Unit': 'office',
  'Custom on Request': 'home',
}

function estimateProject(form) {
  if (!form.projectType) return null

  const units = Math.max(1, Number(form.units) || 1)
  const rooms = Math.max(1, Number(form.rooms) || 1)
  const bathrooms = Math.max(0, Number(form.bathrooms) || 0)
  const baseSizeCost = { '10ft': 110000, '20ft': 195000, '40ft': 345000 }[form.unitSize]
  const projectMultiplier = { home: 1.18, office: 1.04, classroom: 1.1, storage: 0.82, retail: 1.09, cabin: 1.15 }[form.projectType]
  const terrainCost = { flat: 0, sloped: 28000, rural: 18000, coastal: 22000 }[form.terrain]
  const accessCost = { easy: 0, moderate: 16000, restricted: 38000 }[form.access]
  const fitOutCost = finishLevels[form.finishLevel].surcharge * units
  const plumbingCost = form.plumbing ? Math.max(1, bathrooms) * 22000 : 0
  const solarCost = form.solar ? 85000 + Math.max(0, units - 1) * 25000 : 0
  const insulationCost = form.insulation ? 18000 * units : 0
  const deckingCost = form.decking ? 26000 * units : 0
  const roomComplexityCost = Math.max(0, rooms - units) * 12000
  const customPlanCost = form.customPlan ? 18000 : 0

  const structureCost = Math.round(baseSizeCost * units * projectMultiplier)
  const subtotal = structureCost + terrainCost + accessCost + fitOutCost + plumbingCost + solarCost + insulationCost + deckingCost + roomComplexityCost + customPlanCost
  const contingency = Math.round(subtotal * 0.06)
  const estimatedPrice = subtotal + contingency

  const buildWeeks = 4 + units * 2 + (form.finishLevel === 'luxury' ? 2 : form.finishLevel === 'premium' ? 1 : 0) + (form.solar ? 1 : 0) + (form.customPlan ? 1 : 0)
  const installDays = 2 + units + (form.terrain === 'sloped' ? 2 : form.terrain === 'rural' ? 1 : 0) + (form.access === 'restricted' ? 2 : form.access === 'moderate' ? 1 : 0)

  const budgetValue = Number(form.budget) || 0
  const fitRatio = budgetValue ? estimatedPrice / budgetValue : 1

  let feasibility = 'High feasibility'
  if (fitRatio > 1.18) feasibility = 'Budget misaligned'
  else if (form.access === 'restricted' || form.terrain === 'sloped' || units >= 3) feasibility = 'Requires site review'
  else if (form.customPlan || form.projectType === 'classroom') feasibility = 'Requires technical confirmation'

  const recommendationMap = {
    home: 'Lead with a fast concept plan and shortlist one ready-made layout plus one custom option.',
    office: 'Recommend service routing and furniture planning before issuing a final quote.',
    classroom: 'Flag regulatory and occupancy review before locking procurement timelines.',
    storage: 'Prioritize security, shelving load and door positioning in the first review.',
    retail: 'Test the customer-facing facade, service counters and power loads early.',
    cabin: 'Position utilities, off-grid allowance and transport logistics as the main decisions.',
  }

  const paymentPlan = form.paymentPlan || 'flexible'
  const standardMilestones = [
    { label: 'Project Initiation Payment', percent: 40 },
    { label: 'Production Milestone Payment', percent: 40 },
    { label: 'Completion Payment', percent: 20 },
  ]
  const flexibleMilestones = [
    { label: 'Design & Deposit', percent: 20 },
    { label: 'Materials Procurement', percent: 20 },
    { label: 'Fabrication Start', percent: 20 },
    { label: 'Fabrication Completion', percent: 20 },
    { label: 'Delivery / Installation', percent: 20 },
  ]

  const milestoneBase = paymentPlan === 'standard' ? standardMilestones : paymentPlan === 'flexible' ? flexibleMilestones : []
  const milestones = milestoneBase.map((milestone) => ({ ...milestone, amount: Math.round((estimatedPrice * milestone.percent) / 100) }))

  const financeFactorByTerm = { 12: 1.08, 24: 1.16, 36: 1.24 }
  const financeScenarios = [12, 24, 36].map((months) => {
    const repayTotal = Math.round(estimatedPrice * financeFactorByTerm[months])
    return {
      months,
      monthly: Math.round(repayTotal / months),
      repayTotal,
    }
  })

  const template = templatesByProject[form.projectType].find((option) => option.id === form.templateId)

  const selectedImageNames = (form.selectedGalleryImages || []).map((imagePath) =>
    imagePath.split('/').pop(),
  )

  const brief = [
    'Urban Box Living Project Brief',
    '',
    `Project type: ${projectTypes.find((item) => item.id === form.projectType)?.label}`,
    `Template: ${template?.label ?? 'Custom selection'}`,
    `Preferred portfolio design: ${form.selectedDesign || 'Not selected'}`,
    `Selected portfolio images: ${selectedImageNames.length ? selectedImageNames.join(', ') : 'None selected'}`,
    `Custom plan attachment: ${form.customPlanFileName || 'Not uploaded'}`,
    `Province: ${form.province}`,
    `Site/location: ${form.location || 'To be confirmed'}`,
    `Terrain: ${form.terrain}`,
    `Access: ${form.access}`,
    `Container size: ${form.unitSize}`,
    `Number of units: ${units}`,
    `Rooms/spaces: ${rooms}`,
    `Bathrooms: ${bathrooms}`,
    `Finish level: ${finishLevels[form.finishLevel].label}`,
    `Payment option: ${paymentPlans.find((item) => item.id === paymentPlan)?.label ?? 'Standard Plan'}`,
    `Budget band: ${budgetBands.find((item) => item.value === form.budget)?.label ?? 'Not specified'}`,
    `Solar: ${form.solar ? 'Yes' : 'No'}`,
    `Insulation: ${form.insulation ? 'Yes' : 'No'}`,
    `Decking: ${form.decking ? 'Yes' : 'No'}`,
    `Custom concept plan requested: ${form.customPlan ? 'Yes' : 'No'}`,
    '',
    `Estimated investment: ${currency.format(estimatedPrice)}`,
    `Estimated production: ${buildWeeks} weeks`,
    `Estimated installation: ${installDays} days`,
    `Feasibility signal: ${feasibility}`,
    paymentPlan === 'finance' ? `Estimated financing: ${financeScenarios.map((item) => `${item.months} months from ${currency.format(item.monthly)}/month`).join(' | ')}` : null,
    '',
    `Recommendation: ${recommendationMap[form.projectType]}`,
    form.notes ? '' : null,
    form.notes ? `Client notes: ${form.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    template,
    estimatedPrice,
    contingency,
    buildWeeks,
    installDays,
    feasibility,
    recommendation: recommendationMap[form.projectType],
    milestones,
    paymentPlan,
    paymentPlanLabel: paymentPlans.find((item) => item.id === paymentPlan)?.label ?? 'Standard Plan',
    financeScenarios,
    brief,
  }
}

function buildMarkdown(form, estimate) {
  return [
    '# Urban Planner - Project Brief',
    '',
    `Date: ${new Date().toLocaleDateString('en-ZA')}`,
    '',
    '## Project',
    `- Type: ${projectTypes.find((item) => item.id === form.projectType)?.label}`,
    `- Template: ${estimate.template?.label ?? 'Custom selection'}`,
    `- Preferred portfolio design: ${form.selectedDesign || 'Not selected'}`,
    `- Selected portfolio images: ${(form.selectedGalleryImages || []).length || 0}`,
    `- Custom plan attachment: ${form.customPlanFileName || 'Not uploaded'}`,
    `- Province: ${form.province}`,
    `- Location: ${form.location || 'To be confirmed'}`,
    '',
    '## Site',
    `- Terrain: ${form.terrain}`,
    `- Access: ${form.access}`,
    '',
    '## Configuration',
    `- Container size: ${form.unitSize}`,
    `- Units: ${form.units}`,
    `- Rooms: ${form.rooms}`,
    `- Bathrooms: ${form.bathrooms}`,
    `- Finish level: ${finishLevels[form.finishLevel].label}`,
    `- Payment option: ${estimate.paymentPlanLabel}`,
    `- Budget band: ${budgetBands.find((item) => item.value === form.budget)?.label ?? 'Not specified'}`,
    `- Plumbing: ${form.plumbing ? 'Yes' : 'No'}`,
    `- Insulation: ${form.insulation ? 'Yes' : 'No'}`,
    `- Solar: ${form.solar ? 'Yes' : 'No'}`,
    `- Decking: ${form.decking ? 'Yes' : 'No'}`,
    `- Custom plan: ${form.customPlan ? 'Yes' : 'No'}`,
    '',
    '## Estimate',
    `- Estimated investment: ${currency.format(estimate.estimatedPrice)}`,
    `- Build timeline: ${estimate.buildWeeks} weeks`,
    `- Installation: ${estimate.installDays} days`,
    `- Feasibility: ${estimate.feasibility}`,
    `- Contingency: ${currency.format(estimate.contingency)}`,
    '',
    '## Milestones',
    ...(estimate.milestones.length
      ? estimate.milestones.map((m) => `- ${m.label} (${m.percent}%): ${currency.format(m.amount)}`)
      : ['- Monthly finance estimate selected (see affordability scenarios below).']),
    '',
    '## Estimated Financing',
    ...estimate.financeScenarios.map((item) => `- ${item.months} months: from ${currency.format(item.monthly)} / month (est. total ${currency.format(item.repayTotal)})`),
    '',
    '## Recommendation',
    estimate.recommendation,
    '',
    form.notes ? `## Client notes\n${form.notes}` : '',
  ].join('\n')
}

async function downloadPdf(form, estimate) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const PW = 595   // A4 width pts
  const PH = 842   // A4 height pts
  const LEFT = 48
  const RIGHT = PW - 48
  const CONTENT_W = RIGHT - LEFT
  const GOLD  = [201, 168, 76]
  const DARK  = [12,  12,  12]
  const WHITE = [255, 255, 255]
  const GREY  = [90,  90,  90]
  const LGREY = [245, 244, 240]
  const MGREY = [210, 208, 200]

  // ── HEADER BAND ──────────────────────────────────────────
  doc.setFillColor(...DARK)
  doc.rect(0, 0, PW, 90, 'F')

  // gold left accent bar
  doc.setFillColor(...GOLD)
  doc.rect(0, 0, 6, 90, 'F')

  // logo
  try {
    const res = await fetch('/logo.png')
    const blob = await res.blob()
    const b64 = await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
    doc.addImage(b64, 'PNG', LEFT, 18, 52, 52)
  } catch (_) { /* logo failed to load – skip */ }

  // company name + tagline
  doc.setTextColor(...GOLD)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('URBAN BOX LIVING', LEFT + 62, 44)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...MGREY)
  doc.text('Modular Container Homes & Structures', LEFT + 62, 58)

  // document title (right-aligned)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...GOLD)
  doc.text('PROJECT BRIEF', RIGHT, 38, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MGREY)
  const today = new Date().toLocaleDateString('en-ZA', { day: '2-digit', month: 'long', year: 'numeric' })
  doc.text(`Generated: ${today}`, RIGHT, 52, { align: 'right' })
  const refNum = `UBL-${Date.now().toString(36).toUpperCase().slice(-6)}`
  doc.text(`Ref: ${refNum}`, RIGHT, 64, { align: 'right' })

  // ── CONTACT BAR ──────────────────────────────────────────
  doc.setFillColor(...GOLD)
  doc.rect(0, 90, PW, 22, 'F')
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...DARK)
  const contacts = [
    'Tel: +27 60 830 6956',
    'Email: urbanboxliving@outlook.com',
    'Web: urbanboxliving.co.za',
  ]
  const cSpacing = CONTENT_W / contacts.length
  contacts.forEach((c, i) => {
    doc.text(c, LEFT + i * cSpacing, 104, { baseline: 'middle' })
  })

  let y = 132

  // ── SECTION HELPER ───────────────────────────────────────
  function sectionTitle(title) {
    doc.setFillColor(...LGREY)
    doc.roundedRect(LEFT, y, CONTENT_W, 20, 3, 3, 'F')
    doc.setDrawColor(...GOLD)
    doc.setLineWidth(2)
    doc.line(LEFT, y + 20, LEFT + 4, y + 20)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(title.toUpperCase(), LEFT + 10, y + 13)
    y += 28
  }

  function row(label, value, shade) {
    if (shade) {
      doc.setFillColor(249, 248, 244)
      doc.rect(LEFT, y - 11, CONTENT_W, 17, 'F')
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...GREY)
    doc.text(label, LEFT + 6, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    doc.text(String(value ?? '—'), LEFT + 180, y)
    y += 17
  }

  function divider() {
    doc.setDrawColor(...MGREY)
    doc.setLineWidth(0.4)
    doc.line(LEFT, y, RIGHT, y)
    y += 10
  }

  // ── PROJECT OVERVIEW ─────────────────────────────────────
  sectionTitle('Project Overview')
  row('Project Type',         projectTypes.find(i => i.id === form.projectType)?.label, false)
  row('Template / Package',   estimate.template?.label ?? 'Custom selection', true)
  row('Preferred Design',     form.selectedDesign || 'Not selected', false)
  row('Gallery Images Selected', String((form.selectedGalleryImages || []).length), true)
  row('Custom Plan Attached', form.customPlanFileName || 'Not uploaded', false)
  divider()

  // ── SITE & SPECS ─────────────────────────────────────────
  sectionTitle('Site & Specifications')
  row('Province',      form.province, false)
  row('Location',      form.location || 'To be confirmed', true)
  row('Container Size', form.unitSize, false)
  row('Number of Units', String(form.units), true)
  row('Bedrooms',      String(form.rooms), false)
  row('Bathrooms',     String(form.bathrooms), true)
  row('Finish Level',  finishLevels[form.finishLevel].label, false)
  row('Payment Option', estimate.paymentPlanLabel, true)
  divider()

  // ── INVESTMENT ESTIMATE ───────────────────────────────────
  sectionTitle('Investment Estimate')

  // big price highlight box
  doc.setFillColor(...DARK)
  doc.roundedRect(LEFT, y, CONTENT_W, 38, 4, 4, 'F')
  doc.setFillColor(...GOLD)
  doc.roundedRect(LEFT, y, 4, 38, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...GOLD)
  doc.text('Estimated Investment', LEFT + 14, y + 14)
  doc.setFontSize(16)
  doc.text(currency.format(estimate.estimatedPrice), LEFT + 14, y + 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...MGREY)
  doc.text(`Build: ${estimate.buildWeeks} weeks  |  Installation: ${estimate.installDays} days  |  Feasibility: ${estimate.feasibility}`, RIGHT - 4, y + 22, { align: 'right' })
  y += 48

  // payment table header
  doc.setFillColor(...DARK)
  doc.rect(LEFT, y, CONTENT_W, 16, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...GOLD)
  doc.text(estimate.paymentPlan === 'finance' ? 'MONTHLY FINANCE ESTIMATE' : 'PAYMENT MILESTONE', LEFT + 6, y + 11)
  doc.text(estimate.paymentPlan === 'finance' ? 'TERM' : '%', LEFT + 280, y + 11)
  doc.text(estimate.paymentPlan === 'finance' ? 'EST. MONTHLY' : 'AMOUNT', RIGHT - 6, y + 11, { align: 'right' })
  y += 16

  const paymentRows = estimate.paymentPlan === 'finance'
    ? estimate.financeScenarios.map((item) => ({
        label: `${item.months} months`,
        rightMeta: `${item.months}m`,
        amountText: `${currency.format(item.monthly)} / mo`,
      }))
    : estimate.milestones.map((m) => ({
        label: m.label,
        rightMeta: `${m.percent}%`,
        amountText: currency.format(m.amount),
      }))

  paymentRows.forEach((m, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(249, 248, 244)
      doc.rect(LEFT, y, CONTENT_W, 16, 'F')
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...DARK)
    doc.text(m.label, LEFT + 6, y + 11)
    doc.setTextColor(...GREY)
    doc.text(m.rightMeta, LEFT + 280, y + 11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DARK)
    doc.text(m.amountText, RIGHT - 6, y + 11, { align: 'right' })
    y += 16
  })
  y += 12
  divider()

  // ── CLIENT NOTES ─────────────────────────────────────────
  if (form.notes) {
    sectionTitle('Client Notes')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...DARK)
    const noteLines = doc.splitTextToSize(form.notes, CONTENT_W - 12)
    doc.text(noteLines, LEFT + 6, y)
    y += noteLines.length * 13 + 12
    divider()
  }

  // ── DISCLAIMER ───────────────────────────────────────────
  y = Math.max(y, PH - 80)
  doc.setFillColor(...LGREY)
  doc.rect(0, y, PW, PH - y, 'F')
  doc.setFillColor(...GOLD)
  doc.rect(0, y, PW, 2, 'F')
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...GREY)
  const disclaimer = 'This document is a preliminary estimate only. Prices are subject to change based on site assessment, final specifications and material availability. Urban Box Living reserves the right to revise any figures prior to signing a formal contract.'
  const dLines = doc.splitTextToSize(disclaimer, CONTENT_W)
  doc.text(dLines, LEFT, y + 14)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...GOLD)
  doc.text('Urban Box Living (Pty) Ltd  ·  urbanboxliving@outlook.com  ·  +27 60 830 6956', PW / 2, y + 32, { align: 'center' })

  doc.save(`UBL-Project-Brief-${form.projectType}-${refNum}.pdf`)
}

function App() {
  const [form, setForm] = useState(initialForm)
  const [step, setStep] = useState(1)
  const [lightboxIndex, setLightboxIndex] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const designParam = params.get('design') || ''
    const projectParam = params.get('project') || ''
    if (!designParam && !projectParam) return

    const matchingDesign = portfolioDesigns.includes(designParam) ? designParam : ''
    const mappedProject =
      (projectParam && templatesByProject[projectParam] ? projectParam : '') ||
      (matchingDesign ? designToProjectType[matchingDesign] : '') ||
      ''

    setForm((current) => {
      const next = { ...current }
      if (matchingDesign) {
        next.selectedDesign = matchingDesign
      }
      if (mappedProject && mappedProject !== current.projectType) {
        next.projectType = mappedProject
        const templates = templatesByProject[mappedProject] || []
        next.templateId = templates[0] ? templates[0].id : ''
      }
      return next
    })
  }, [])

  const estimate = estimateProject(form)
  const currentTemplates = templatesByProject[form.projectType] ?? []
  const designGalleryImages = form.selectedDesign ? getDesignGallery(form.selectedDesign) : []
  const selectedImageCount = (form.selectedGalleryImages || []).length
  const reachedSelectionLimit = selectedImageCount >= 6
  const isLightboxOpen = lightboxIndex !== null
  const activeLightboxImage = isLightboxOpen ? designGalleryImages[lightboxIndex] : null
  const encodedBrief = estimate ? encodeURIComponent(estimate.brief) : ''
  const whatsappHref = `https://wa.me/27608306956?text=${encodedBrief}`
  const emailHref = `mailto:urbanboxliving@outlook.com?subject=Urban%20Planner%20Project%20Brief&body=${encodedBrief}`

  function updateField(name, value) {
    if (name === 'selectedDesign') {
      setLightboxIndex(null)
    }

    setForm((current) => {
      const next = { ...current, [name]: value }
      if (name === 'projectType') {
        const nextTemplates = templatesByProject[value]
        if (!nextTemplates.some((template) => template.id === current.templateId)) {
          next.templateId = nextTemplates[0].id
        }
      }
      if (name === 'selectedDesign') {
        next.selectedGalleryImages = []
      }
      return next
    })
  }

  function openGalleryLightbox(index) {
    setLightboxIndex(index)
  }

  function closeGalleryLightbox() {
    setLightboxIndex(null)
  }

  function moveGalleryLightbox(direction) {
    if (!designGalleryImages.length) return
    setLightboxIndex((current) => {
      if (current === null) return 0
      const nextIndex = (current + direction + designGalleryImages.length) % designGalleryImages.length
      return nextIndex
    })
  }

  function toggleGalleryImage(imagePath) {
    setForm((current) => {
      const currentSelection = current.selectedGalleryImages || []
      const isAlreadySelected = currentSelection.includes(imagePath)

      if (isAlreadySelected) {
        return {
          ...current,
          selectedGalleryImages: currentSelection.filter((item) => item !== imagePath),
        }
      }

      if (currentSelection.length >= 6) {
        return current
      }

      return {
        ...current,
        selectedGalleryImages: [...currentSelection, imagePath],
      }
    })
  }

  useEffect(() => {
    if (!isLightboxOpen) return undefined

    function handleKeydown(event) {
      if (event.key === 'Escape') {
        closeGalleryLightbox()
      } else if (event.key === 'ArrowLeft') {
        moveGalleryLightbox(-1)
      } else if (event.key === 'ArrowRight') {
        moveGalleryLightbox(1)
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [isLightboxOpen, designGalleryImages.length])

  function nextStep() {
    if (step === 1 && !form.projectType) return
    setStep((current) => Math.min(5, current + 1))
  }

  function prevStep() {
    setStep((current) => Math.max(1, current - 1))
  }

  function resetFlow() {
    setForm(initialForm)
    setStep(1)
  }

  function handleCustomPlanUpload(event) {
    const file = event.target.files && event.target.files[0]
    updateField('customPlanFileName', file ? file.name : '')
  }

  function downloadTxt() {
    if (!estimate) return
    const blob = new Blob([estimate.brief], { type: 'text/plain;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `urban-planner-brief-${form.projectType}.txt`
    link.click()
    URL.revokeObjectURL(objectUrl)
  }

  function downloadMd() {
    if (!estimate) return
    const markdown = buildMarkdown(form, estimate)
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = `urban-planner-brief-${form.projectType}.md`
    link.click()
    URL.revokeObjectURL(objectUrl)
  }

  const navigate = useNavigate()

  function continueToEnquiry() {
    if (!estimate) return
    const summary = [
      `Urban Planner summary`,
      `Estimated investment: ${currency.format(estimate.estimatedPrice)}`,
      `Timeline: ${estimate.buildWeeks} weeks build, ${estimate.installDays} days installation`,
      `Feasibility: ${estimate.feasibility}`,
      `Preferred design: ${form.selectedDesign || 'Not selected'}`,
      `Custom plan file: ${form.customPlanFileName || 'Not uploaded'}`,
      '',
      estimate.brief,
    ].join('\n')

    localStorage.setItem(PLANNER_BRIEF_STORAGE_KEY, summary)
    localStorage.setItem(
      PLANNER_PAYLOAD_STORAGE_KEY,
      JSON.stringify({
        selectedDesign: form.selectedDesign || '',
        selectedGalleryImages: form.selectedGalleryImages || [],
        projectType: projectTypes.find((item) => item.id === form.projectType)?.label || 'Custom Build',
        generatedAt: new Date().toISOString(),
      }),
    )

    const params = new URLSearchParams({
      fromPlanner: '1',
      projectType: projectTypes.find((item) => item.id === form.projectType)?.label || 'Custom Build',
      design: form.selectedDesign || '',
    })
    navigate(`/?${params.toString()}#contact`)
  }

  return (
    <div className="planner-page">
      <header className="planner-nav">
        <a href="/" className="planner-nav-logo">Urban Box Living</a>
        <nav className="planner-nav-links" aria-label="Planner and main site links">
          <a href="/#about">About</a>
          <a href="/#catalog">Catalog</a>
          <a href="/#gallery">Gallery</a>
          <a href="/#contact">Contact</a>
          <a href="/planner" className="planner-nav-current">Planner</a>
        </nav>
        <a href="/#contact" className="planner-nav-cta">Need Help?</a>
      </header>

      <header className="planner-header">
        <span className="planner-header-label">Urban Planner</span>
        <h1>Configure your project in five guided steps.</h1>
        <p>Pick a design, shortlist images, estimate budget and timeline, then move directly to enquiry with your brief.</p>
      </header>

      <div className="step-indicator" aria-label="planner steps">
        {steps.map((label, index) => {
          const number = index + 1
          const state = step === number ? 'is-active' : step > number ? 'is-done' : ''
          return (
            <div key={label} className={`step-item ${state}`.trim()}>
              <span>{number}</span>
              <small>{label}</small>
            </div>
          )
        })}
      </div>

      <main className="planner-main">
        {step === 1 && (
          <section className="panel">
            <div className="panel-head">
              <h2>1. Select your project use case</h2>
            </div>

            <div className="project-grid">
              {projectTypes.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`project-tile${form.projectType === project.id ? ' is-active' : ''}`}
                  onClick={() => updateField('projectType', project.id)}
                >
                  <strong>{project.label}</strong>
                  <span>{project.description}</span>
                </button>
              ))}
            </div>

            {form.projectType && (
              <div className="field-grid two">
                <div className="form-group">
                  <label>Suggested template</label>
                  <select value={form.templateId} onChange={(event) => updateField('templateId', event.target.value)}>
                    {currentTemplates.map((template) => (
                      <option key={template.id} value={template.id}>{template.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Site location note</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(event) => updateField('location', event.target.value)}
                    placeholder="Town, site name or suburb"
                  />
                </div>
              </div>
            )}

            <div className="field-grid two">
              <div className="form-group">
                <label>Select a portfolio design</label>
                <select value={form.selectedDesign} onChange={(event) => updateField('selectedDesign', event.target.value)}>
                  <option value="">Choose from portfolio options...</option>
                  {portfolioDesigns.map((design) => (
                    <option key={design} value={design}>{design}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Upload custom plan (image or PDF)</label>
                <input type="file" accept=".pdf,image/*" onChange={handleCustomPlanUpload} />
                {form.customPlanFileName ? <small className="field-note">Selected: {form.customPlanFileName}</small> : null}
              </div>
            </div>

            {form.selectedDesign && (
              <div className="design-gallery-wrap">
                <div className="design-gallery-head">
                  <strong>{form.selectedDesign} gallery</strong>
                  <span>
                    Select up to 6 images ({selectedImageCount}/6)
                  </span>
                </div>

                {designGalleryImages.length ? (
                  <div className="design-gallery-grid">
                    {designGalleryImages.map((imagePath, index) => {
                      const isSelected = (form.selectedGalleryImages || []).includes(imagePath)
                      const isDisabled = !isSelected && reachedSelectionLimit
                      return (
                        <article
                          key={`${imagePath}-${index}`}
                          className={`design-gallery-item${isSelected ? ' is-selected' : ''}${isDisabled ? ' is-disabled' : ''}`}
                        >
                          <button
                            type="button"
                            className="design-gallery-preview"
                            onClick={() => openGalleryLightbox(index)}
                          >
                            <img src={imagePath} alt={`${form.selectedDesign} option ${index + 1}`} loading="lazy" />
                          </button>
                          <div className="design-gallery-actions">
                            <span>{isSelected ? 'Selected' : 'Not selected'}</span>
                            <button
                              type="button"
                              className="design-gallery-select"
                              onClick={() => toggleGalleryImage(imagePath)}
                              disabled={isDisabled}
                            >
                              {isSelected ? 'Unselect' : 'Select image'}
                            </button>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <p className="design-gallery-empty">No portfolio images are mapped for this selection yet.</p>
                )}
              </div>
            )}

            {isLightboxOpen && activeLightboxImage && (
              <div className="planner-lightbox" role="dialog" aria-modal="true" onClick={closeGalleryLightbox}>
                <div className="planner-lightbox-dialog" onClick={(event) => event.stopPropagation()}>
                  <button type="button" className="planner-lightbox-close" onClick={closeGalleryLightbox} aria-label="Close preview">
                    ×
                  </button>
                  <button type="button" className="planner-lightbox-nav planner-lightbox-prev" onClick={() => moveGalleryLightbox(-1)} aria-label="Previous image">
                    ‹
                  </button>
                  <img src={activeLightboxImage} alt={`${form.selectedDesign} preview`} className="planner-lightbox-image" />
                  <button type="button" className="planner-lightbox-nav planner-lightbox-next" onClick={() => moveGalleryLightbox(1)} aria-label="Next image">
                    ›
                  </button>
                  <div className="planner-lightbox-foot">
                    <span>
                      Image {Number(lightboxIndex) + 1} of {designGalleryImages.length}
                    </span>
                    <button
                      type="button"
                      className="design-gallery-select"
                      onClick={() => toggleGalleryImage(activeLightboxImage)}
                      disabled={!(form.selectedGalleryImages || []).includes(activeLightboxImage) && reachedSelectionLimit}
                    >
                      {(form.selectedGalleryImages || []).includes(activeLightboxImage) ? 'Unselect image' : 'Select image'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {step === 2 && (
          <section className="panel">
            <div className="panel-head">
              <h2>2. Capture site and logistics</h2>
            </div>

            <div className="field-grid three">
              <div className="form-group">
                <label>Province</label>
                <select value={form.province} onChange={(event) => updateField('province', event.target.value)}>
                  {provinces.map((province) => (
                    <option key={province} value={province}>{province}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Terrain</label>
                <select value={form.terrain} onChange={(event) => updateField('terrain', event.target.value)}>
                  <option value="flat">Flat or prepared</option>
                  <option value="rural">Rural or lightly serviced</option>
                  <option value="sloped">Sloped or engineered pad required</option>
                  <option value="coastal">Coastal or corrosion-sensitive</option>
                </select>
              </div>

              <div className="form-group">
                <label>Delivery access</label>
                <select value={form.access} onChange={(event) => updateField('access', event.target.value)}>
                  <option value="easy">Easy truck access</option>
                  <option value="moderate">Moderate access or staging needed</option>
                  <option value="restricted">Restricted access or crane planning</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="panel">
            <div className="panel-head">
              <h2>3. Configure the module build</h2>
            </div>

            <div className="field-grid three">
              <div className="form-group">
                <label>Container size</label>
                <select value={form.unitSize} onChange={(event) => updateField('unitSize', event.target.value)}>
                  <option value="10ft">10ft</option>
                  <option value="20ft">20ft</option>
                  <option value="40ft">40ft</option>
                </select>
              </div>

              <div className="form-group">
                <label>Number of units</label>
                <input type="number" min="1" max="6" value={form.units} onChange={(event) => updateField('units', event.target.value)} />
              </div>

              <div className="form-group">
                <label>Rooms / spaces</label>
                <input type="number" min="1" max="12" value={form.rooms} onChange={(event) => updateField('rooms', event.target.value)} />
              </div>
            </div>

            <div className="field-grid two">
              <div className="form-group">
                <label>Bathrooms / wet points</label>
                <input type="number" min="0" max="6" value={form.bathrooms} onChange={(event) => updateField('bathrooms', event.target.value)} />
              </div>

              <div className="form-group">
                <label>Custom concept plan</label>
                <select value={form.customPlan ? 'yes' : 'no'} onChange={(event) => updateField('customPlan', event.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="panel">
            <div className="panel-head">
              <h2>4. Finishes and add-ons</h2>
            </div>

            <div className="field-grid two">
              <div className="form-group">
                <label>Finish level</label>
                <select value={form.finishLevel} onChange={(event) => updateField('finishLevel', event.target.value)}>
                  {Object.entries(finishLevels).map(([key, level]) => (
                    <option key={key} value={key}>{level.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Budget range</label>
                <select value={form.budget} onChange={(event) => updateField('budget', event.target.value)}>
                  {budgetBands.map((band) => (
                    <option key={band.value} value={band.value}>{band.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Payment plan</label>
              <select value={form.paymentPlan} onChange={(event) => updateField('paymentPlan', event.target.value)}>
                {paymentPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.label}</option>
                ))}
              </select>
              <small className="field-note">Choose your preferred structure: fixed milestones, flexible stages, or estimated monthly affordability.</small>
            </div>

            <div className="toggle-grid">
              <label className="toggle-card"><input type="checkbox" checked={form.plumbing} onChange={(event) => updateField('plumbing', event.target.checked)} /><span>Plumbing pack</span></label>
              <label className="toggle-card"><input type="checkbox" checked={form.insulation} onChange={(event) => updateField('insulation', event.target.checked)} /><span>Insulation</span></label>
              <label className="toggle-card"><input type="checkbox" checked={form.solar} onChange={(event) => updateField('solar', event.target.checked)} /><span>Solar readiness</span></label>
              <label className="toggle-card"><input type="checkbox" checked={form.decking} onChange={(event) => updateField('decking', event.target.checked)} /><span>Decking / entry platform</span></label>
            </div>

            <div className="form-group">
              <label>Client notes (optional)</label>
              <textarea rows="5" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Special requirements, municipal concerns, preferred handover date, finishes or layout notes." />
            </div>
          </section>
        )}

        {step === 5 && estimate && (
          <section className="panel">
            <div className="panel-head">
              <h2>5. Review and export your brief</h2>
            </div>

            <div className="results-grid">
              <article className="result-card result-card-gold">
                <span>Estimated investment</span>
                <h3>{currency.format(estimate.estimatedPrice)}</h3>
              </article>

              <article className="result-card">
                <span>Production timeline</span>
                <h3>{estimate.buildWeeks} weeks</h3>
              </article>

              <article className="result-card">
                <span>Installation</span>
                <h3>{estimate.installDays} days</h3>
              </article>

              <article className="result-card">
                <span>Feasibility signal</span>
                <h3>{estimate.feasibility}</h3>
              </article>
            </div>

            <div className="milestones">
              <h4>{estimate.paymentPlanLabel}</h4>
              {estimate.milestones.length > 0 ? (
                <ul>
                  {estimate.milestones.map((milestone) => (
                    <li key={milestone.label}><span>{milestone.label} ({milestone.percent}%)</span><strong>{currency.format(milestone.amount)}</strong></li>
                  ))}
                </ul>
              ) : (
                <p className="milestones-note">Monthly finance mode selected. These scenarios are indicative and subject to final lender approval.</p>
              )}

              <div className="finance-options">
                <h5>Estimated financing</h5>
                <ul>
                  {estimate.financeScenarios.map((item) => (
                    <li key={item.months}>
                      <span>{item.months} months</span>
                      <strong>From {currency.format(item.monthly)}/month</strong>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="actions">
              <button type="button" className="btn-primary" onClick={downloadTxt}>Download .txt</button>
              <button type="button" className="btn-primary" onClick={downloadMd}>Download .md</button>
              <button type="button" className="btn-primary" onClick={() => downloadPdf(form, estimate).catch(console.error)}>Download .pdf</button>
              <button type="button" className="btn-primary" onClick={continueToEnquiry}>Send to Enquiry Form</button>
              <a className="btn-ghost" href={whatsappHref} target="_blank" rel="noreferrer">Send to WhatsApp</a>
              <a className="btn-ghost" href={emailHref}>Email sales team</a>
            </div>
          </section>
        )}
      </main>

      <footer className="planner-footer">
        <div className="footer-actions">
          {step > 1 ? <button type="button" className="btn-ghost" onClick={prevStep}>Back</button> : <span />}
          {step < 5 ? (
            <button type="button" className="btn-primary" disabled={step === 1 && !form.projectType} onClick={nextStep}>Continue</button>
          ) : (
            <button type="button" className="btn-ghost" onClick={resetFlow}>Start over</button>
          )}
        </div>
      </footer>
    </div>
  )
}

export default App
