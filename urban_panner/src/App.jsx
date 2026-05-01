import { useEffect, useState } from 'react'
import { jsPDF } from 'jspdf'
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

const currency = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 })

const initialForm = {
  projectType: '',
  templateId: '',
  selectedDesign: '',
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
  plumbing: true,
  solar: false,
  insulation: true,
  decking: false,
  customPlan: false,
  notes: '',
}

const steps = ['Use Case', 'Site', 'Build', 'Finishes', 'Brief']

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

  const milestones = [
    { label: 'Deposit', percent: 40 },
    { label: 'Production midpoint', percent: 40 },
    { label: 'Delivery and handover', percent: 20 },
  ].map((milestone) => ({ ...milestone, amount: Math.round((estimatedPrice * milestone.percent) / 100) }))

  const template = templatesByProject[form.projectType].find((option) => option.id === form.templateId)

  const brief = [
    'Urban Box Living Project Brief',
    '',
    `Project type: ${projectTypes.find((item) => item.id === form.projectType)?.label}`,
    `Template: ${template?.label ?? 'Custom selection'}`,
    `Preferred portfolio design: ${form.selectedDesign || 'Not selected'}`,
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
    ...estimate.milestones.map((m) => `- ${m.label} (${m.percent}%): ${currency.format(m.amount)}`),
    '',
    '## Recommendation',
    estimate.recommendation,
    '',
    form.notes ? `## Client notes\n${form.notes}` : '',
  ].join('\n')
}

function downloadPdf(form, estimate) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const left = 50
  let y = 60

  doc.setFillColor(201, 168, 76)
  doc.rect(0, 0, 595, 34, 'F')
  doc.setTextColor(8, 8, 8)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('URBAN PLANNER - URBAN BOX LIVING', left, 22)

  doc.setTextColor(20, 20, 20)
  doc.setFontSize(20)
  doc.text('Project Brief', left, y)
  y += 30

  const rows = [
    ['Project type', projectTypes.find((item) => item.id === form.projectType)?.label],
    ['Template', estimate.template?.label ?? 'Custom selection'],
    ['Preferred portfolio design', form.selectedDesign || 'Not selected'],
    ['Custom plan attachment', form.customPlanFileName || 'Not uploaded'],
    ['Province', form.province],
    ['Location', form.location || 'To be confirmed'],
    ['Container size', form.unitSize],
    ['Units', String(form.units)],
    ['Rooms', String(form.rooms)],
    ['Bathrooms', String(form.bathrooms)],
    ['Finish level', finishLevels[form.finishLevel].label],
    ['Estimated investment', currency.format(estimate.estimatedPrice)],
    ['Build timeline', `${estimate.buildWeeks} weeks`],
    ['Installation', `${estimate.installDays} days`],
    ['Feasibility', estimate.feasibility],
  ]

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  rows.forEach(([label, value]) => {
    doc.setTextColor(120, 100, 45)
    doc.text(`${label}:`, left, y)
    doc.setTextColor(30, 30, 30)
    doc.text(String(value), left + 130, y)
    y += 18
  })

  y += 8
  doc.setTextColor(120, 100, 45)
  doc.setFont('helvetica', 'bold')
  doc.text('Payment milestones', left, y)
  y += 18
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  estimate.milestones.forEach((m) => {
    doc.text(`- ${m.label} (${m.percent}%): ${currency.format(m.amount)}`, left, y)
    y += 16
  })

  if (form.notes) {
    y += 10
    doc.setTextColor(120, 100, 45)
    doc.setFont('helvetica', 'bold')
    doc.text('Client notes', left, y)
    y += 16
    doc.setTextColor(30, 30, 30)
    doc.setFont('helvetica', 'normal')
    const noteLines = doc.splitTextToSize(form.notes, 500)
    doc.text(noteLines, left, y)
  }

  doc.save(`urban-planner-brief-${form.projectType}.pdf`)
}

function App() {
  const [form, setForm] = useState(initialForm)
  const [step, setStep] = useState(1)

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
  const encodedBrief = estimate ? encodeURIComponent(estimate.brief) : ''
  const whatsappHref = `https://wa.me/27608306956?text=${encodedBrief}`
  const emailHref = `mailto:urbanboxliving@outlook.com?subject=Urban%20Planner%20Project%20Brief&body=${encodedBrief}`

  function updateField(name, value) {
    setForm((current) => {
      const next = { ...current, [name]: value }
      if (name === 'projectType') {
        const nextTemplates = templatesByProject[value]
        if (!nextTemplates.some((template) => template.id === current.templateId)) {
          next.templateId = nextTemplates[0].id
        }
      }
      return next
    })
  }

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

    localStorage.setItem('urbanPlannerBrief', summary)

    const params = new URLSearchParams({
      fromPlanner: '1',
      projectType: projectTypes.find((item) => item.id === form.projectType)?.label || 'Custom Build',
      design: form.selectedDesign || '',
    })
    window.location.href = `../index.html?${params.toString()}#contact`
  }

  return (
    <div className="planner-page">
      <header className="planner-nav">
        <a href="../index.html" className="planner-nav-logo">Urban Box Living</a>
        <nav className="planner-nav-links" aria-label="Planner and main site links">
          <a href="../index.html#about">About</a>
          <a href="../index.html#catalog">Catalog</a>
          <a href="../index.html#gallery">Gallery</a>
          <a href="../index.html#contact">Contact</a>
          <span className="planner-nav-current">Urban Planner</span>
        </nav>
      </header>

      <header className="planner-header">
        <h1>Urban Planner</h1>
        <p>Plan your container project in guided steps, then download your sales-ready brief.</p>
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
              <h4>Payment milestones</h4>
              <ul>
                {estimate.milestones.map((milestone) => (
                  <li key={milestone.label}><span>{milestone.label} ({milestone.percent}%)</span><strong>{currency.format(milestone.amount)}</strong></li>
                ))}
              </ul>
            </div>

            <div className="actions">
              <button type="button" className="btn-primary" onClick={downloadTxt}>Download .txt</button>
              <button type="button" className="btn-primary" onClick={downloadMd}>Download .md</button>
              <button type="button" className="btn-primary" onClick={() => downloadPdf(form, estimate)}>Download .pdf</button>
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
