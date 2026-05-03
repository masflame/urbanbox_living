const USD_TO_ZAR = 18.75

const jsonModules = import.meta.glob('../assets/Units/*.json', {
  eager: true,
  import: 'default',
})

const imageModules = import.meta.glob('../assets/Units/**/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
})

const imageEntries = Object.entries(imageModules).map(([path, url]) => {
  const normalizedPath = path.replace(/\\/g, '/').toLowerCase()
  const segments = normalizedPath.split('/').filter(Boolean)
  return {
    path: normalizedPath,
    url,
    segments,
  }
})

// Categorisation rules. Order = priority (first match wins). Each pattern
// is matched as a whole-word regex against the unit's *name* first, then
// against its description. We deliberately avoid loose substring keywords
// like "bathroom" or "shop" because they appear in marketing copy for
// almost every product (e.g. a home with a bathroom would be tagged as a
// toilet). The rules also accept a `collection` regex so that JSON files
// dedicated to a single category (UnitsF-Pools, UnitsK-Toilet, …) are
// classified deterministically.
const CATEGORY_RULES = [
  { category: 'Pools', name: /\b(pools?|swimming|jacuzzi|spa\s*pool)\b/i, collection: /pool/i },
  // Collection-based toilet match (UnitsK-Toilet) wins early so the dedicated
  // toilet collection is always classified correctly.
  { category: 'Toilets', collection: /toilet/i },
  // Guard Booths must come BEFORE the name-based Toilets rule so that a unit
  // called "Guard Booth with Restroom" is classified as Guard Booth, not
  // Toilet.
  { category: 'Guard Booths', name: /\b(guard\s*booth|guard\s*shack|guard\s*hut|guardhouse|security\s*booth|bullet[\s-]*proof)\b/i },
  { category: 'Toilets', name: /\b(toilets?|ablutions?|restrooms?)\b/i },
  { category: 'Pools', name: /\b(pools?|swimming|jacuzzi)\b/i, description: /\b(swimming\s*pool|container\s*pool)\b/i },
  { category: 'Classrooms', name: /\b(classrooms?|schools?|lecture|training\s*room)\b/i },
  { category: 'Storage', name: /\b(storage|warehouses?|store\s*room|stockroom)\b/i },
  { category: 'Retail', name: /\b(shops?(?!ping)|kiosks?|retail|salons?|cafe|coffee\s*bar|coffee\s*shop|bar\s*pod)\b/i },
  { category: 'Offices', name: /\b(offices?|workspace|boardroom|meeting\s*room|modibox|admin\s*pod)\b/i },
  { category: 'Cabins', name: /\b(cabins?|lodges?|chalets?|pod\s*house|tiny\s*pod)\b/i },
  { category: 'Homes', name: /(\b(homes?|houses?|residences?|villas?|apartments?|bedrooms?|cottages?)\b|gatehouse|guesthouse|farmhouse|tiny\s*house|prefab\s*house|a-?frame)/i },
  // Description-based fallbacks (only when the name gave us nothing useful)
  { category: 'Pools', description: /\b(swimming\s*pool|container\s*pool)\b/i },
  { category: 'Guard Booths', description: /\b(guard\s*booth|guard\s*shack|guardhouse|security\s*cabin|bullet[\s-]*proof)\b/i },
  { category: 'Offices', description: /\b(office\s*container|mobile\s*office|modibox|portable\s*office)\b/i },
  { category: 'Cabins', description: /\b(off-grid\s*cabin|eco[-\s]*cabin|guest\s*cabin)\b/i },
  { category: 'Homes', description: /\b(container\s*homes?|prefab\s*homes?|expandable\s*container\s*house|residential\s*container|bedroom\s*unit|sleeps\s+\w+\s+people|two\s*bedroom|one\s*bedroom|three\s*bedroom)\b/i },
]

// Per-collection default category, used only when no rule above matches.
// UnitsA = Block Two / Three / Pavilion / Gatehouse — all homes from a
// single accommodation development; UnitsP = portfolio of completed homes.
// UnitsU = Elevation Park Models (US-built premium park-model homes).
// UnitsV = Prestige Homeseeker (UK-built residential park homes & lodges).
const COLLECTION_DEFAULT_CATEGORY = {
  UnitsA: 'Homes',
  UnitsP: 'Homes',
  UnitsU: 'Homes',
  UnitsV: 'Homes',
}

// Product-tier classification. "Premium" covers our curated and imported
// high-end ranges; "Basic" covers the converted shipping-container catalogue.
// This drives the Tier filter on the catalog page.
const PREMIUM_COLLECTIONS = new Set(['UnitsA', 'UnitsG', 'UnitsP', 'UnitsS', 'UnitsU', 'UnitsV', 'UnitsX', 'UnitsZZZ'])
const TIER_OVERRIDES = {
  'UnitsP::/suurbraak/': 'Basic',
  'UnitsP::/cederberg/': 'Basic',
  'UnitsP::/tulbagh/': 'Basic',
  'UnitsP::/pearston/': 'Basic',
  'UnitsP::/leopard-valley-unit-1/': 'Basic',
}
function inferTier(collectionKey) {
  return PREMIUM_COLLECTIONS.has(collectionKey) ? 'Premium' : 'Basic'
}

// Per-folder category overrides for individual units that the regex rules
// classify incorrectly. Keyed by `${collectionKey}::${folderKey}`.
const CATEGORY_OVERRIDES = {
  'UnitsA::/gatehouse/': 'Guard Booths',
  'UnitsP::/wiesenhof/': 'Offices',
}

// ─── Generic naming system ─────────────────────────────────────────────────
// We replace location-based / nickname-based product names (e.g. "Pavilion",
// "Block One", "Pringle Bay Home") with descriptive generic names derived
// from the unit's category, size, tier and key features. The original
// scraped/curated names are preserved on each unit as `originalName` and
// also exported as `originalNameMap` (slug → original) for record-keeping
// and easy reversal.
//
// Collections listed in KEEP_ORIGINAL_COLLECTIONS keep their existing names
// (used for branded external product lines, e.g. Elevation Park Models and
// Prestige Homeseeker, where the brand name is the meaningful identifier).
//
// Per-unit overrides via NAME_OVERRIDES win over both rules, keyed by
// `${collectionKey}::${folderKey}`.
const KEEP_ORIGINAL_COLLECTIONS = new Set(['UnitsU', 'UnitsV'])
const NAME_OVERRIDES = {
  // 'UnitsP::/suurbraak/': 'Custom example name',
}

function buildGenericName(category, sizeInfo, tier, primary) {
  const corpus = `${primary?.product_name ?? ''} ${primary?.product_name_hint ?? ''} ${primary?.unit_features ?? ''} ${primary?.primary_description ?? ''} ${primary?.product_description ?? ''} ${primary?.unit_slug ?? ''}`.toLowerCase()
  const ft = sizeInfo?.footLength
  const sizeBit = ft ? `${ft}ft` : sizeInfo?.sqm ? `${sizeInfo.sqm}m²` : ''
  const tierBit = tier === 'Premium' ? 'Premium' : 'Standard'

  let descriptor = ''
  if (/a-?frame/.test(corpus)) descriptor = 'A-Frame'
  else if (/expand|expandable|easy.?fold|sandwich\s*panel|fold[-\s]?out/.test(corpus)) descriptor = 'Expandable'
  else if (/flat[-\s]?pack/.test(corpus)) descriptor = 'Flatpack'
  else if (/two[-\s]?bedroom|2[-\s]?bed\b/.test(corpus)) descriptor = 'Two-Bedroom'
  else if (/three[-\s]?bedroom|3[-\s]?bed\b/.test(corpus)) descriptor = 'Three-Bedroom'
  else if (/one[-\s]?bedroom|1[-\s]?bed\b|studio/.test(corpus)) descriptor = 'One-Bedroom'

  const parts = (arr) => arr.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

  switch (category) {
    case 'Homes':
      return parts([tierBit, sizeBit, descriptor, 'Container Home'])
    case 'Cabins':
      return parts([tierBit, sizeBit, 'Container Cabin'])
    case 'Pools':
      return parts([sizeBit, 'Container Pool'])
    case 'Toilets':
      return parts([sizeBit, 'Mobile Ablution Unit'])
    case 'Offices':
      return parts([tierBit, sizeBit, 'Container Office'])
    case 'Retail':
      return parts([sizeBit, 'Container Retail Pod'])
    case 'Storage':
      return parts([sizeBit, 'Container Storage Unit'])
    case 'Classrooms':
      return parts([sizeBit, 'Modular Classroom'])
    case 'Guard Booths':
      return parts([sizeBit, 'Guard Booth'])
    default:
      return parts([tierBit, sizeBit, category])
  }
}

// Specific units to hide from the catalog entirely (e.g. listings that
// shouldn't be shown publicly). Keyed by `${collectionKey}::${folderKey}`.
const HIDDEN_UNITS = new Set([
  'UnitsP::/dairy-den/',
  'UnitsP::/klein-karoo/',
  'UnitsP::/bettys-bay/',
  'UnitsP::/brits/',
  'UnitsP::/grootbraak-mossel-bay/',
  'UnitsP::/tesselaarsdal/',
  // Standard 20ft Container Office (R30,600) — removed from catalog per request
  'UnitsE::/20ft-mobile-office-container/',
])

// Folder names that don't represent a real unit (homepage scrapes, thumbnail
// galleries, etc.). Groups with a leaf folder matching any of these are
// dropped from the catalog entirely.
const NON_UNIT_FOLDER_LEAVES = new Set([
  'home',
  'photo-gallery',
  'news-events',
  'open-days-events',
  'your-prestige-journey-starts-here',
  'floating-homes',
  'legacy-floating-homes-commercial-buildings',
  // Note: the parent overview folders (holiday-lodges, residential-park-homes,
  // legacy-homes, etc.) are filtered via the additional check below — when the
  // leaf segment is identical to its own parent (e.g. holiday-lodges/holiday-
  // lodges/holiday-lodges) the folder is a category landing page, not a unit.
  'index',
  'portfolio-gallery',
  'gallery',
  'portfolio',
  'shop',
  'products',
  'product',
  'about',
  'contact',
])

// Per-folder content overrides. Used to enrich crawled records that arrived
// without descriptions, prices, or sizing — e.g. UnitsU (Elevation Park
// Models, US-built premium park-model homes) and UnitsV (Prestige Homeseeker,
// UK-built residential park homes & lodges). Keyed by `${collectionKey}::/${leaf}/`.
// Prices are realistic high-end / semi-premium ZAR figures pitched against
// the South African modular-home market.
const FOLDER_OVERRIDES = {
  // ── UnitsU · Elevation Park Models (Elkhart, Indiana) ───────────────────
  'UnitsU::/3-series-photo-gallery/3-series-photo-gallery/': {
    product_name_hint: 'Elevation 3 Series Park Model',
    product_name: 'Elevation 3 Series Park Model',
    primary_description:
      'Compact premium park-model home from Elevation Park Models (Elkhart, Indiana). The 3 Series is the studio of the line-up — a single-level open plan with full residential kitchen, walk-in shower bathroom, and a private bedroom under a vaulted ceiling. Painted shiplap interiors, real wood cabinetry, residential-grade appliances and oversized panoramic windows give it a high-spec finish well above standard tiny-home fare. RVIA-certified, towable, and ready to drop onto a prepared stand.',
    unit_features:
      'Vaulted ceiling | Full residential kitchen with island | Walk-in tiled shower | Queen bedroom | LED downlighting throughout | Mini-split heat pump A/C | RVIA-certified chassis | Painted shiplap accent walls | Solid-surface countertops | Insulated underbelly',
    included_items:
      'Park-model chassis & axles | Full kitchen appliance package (fridge, oven, microwave) | Bathroom vanity, toilet & shower | Bedroom with built-in storage | LED interior lighting | HVAC mini-split | Standard appliance warranties',
    optional_extras:
      'Loft sleeping platform | Front porch & awning package | Upgraded designer finish | Solar-ready electrical pre-wire | Premium flooring | Exterior cladding upgrade',
    unit_size: '11.0 m × 3.6 m (≈ 32 m²)',
    unit_size_sqm: '32',
    manufacturing_time: '14–18 weeks',
    price: 'ZAR 685000',
    price_amount: '685000',
  },
  'UnitsU::/5-series-photo-gallery/5-series-photo-gallery/': {
    product_name_hint: 'Elevation 5 Series Park Model',
    product_name: 'Elevation 5 Series Park Model',
    primary_description:
      'The 5 Series is the best-selling Elevation Park Model — a true one-bedroom premium tiny home built to RVIA spec in Elkhart, Indiana. Open-plan living/kitchen/dining flows beneath a soaring vaulted ceiling, with a separate king bedroom, full bathroom, and an optional loft. Premium standard finishes include shaker cabinetry, quartz-look counters, residential stainless appliances, and large picture windows. Engineered for year-round residential-style living on a private stand, eco-estate plot, or holiday park.',
    unit_features:
      'Vaulted shiplap ceiling | Full one-bedroom layout | Optional loft | Residential stainless kitchen package | Quartz-look countertops | Walk-in shower | Apron-front sink | Designer pendant lighting | Mini-split heat pump | Tinted dual-pane windows | RVIA-certified',
    included_items:
      'Park-model chassis & axles | Stainless appliance package | Full bathroom (vanity, toilet, shower) | King bedroom with built-ins | LED interior lighting | HVAC mini-split | Front porch landing | Manufacturer warranty',
    optional_extras:
      'Loft sleeping platform | Wrap-around porch & pergola | Designer / luxury interior package | Off-grid solar package | Upgraded exterior cladding | Built-in entertainment wall',
    unit_size: '12.2 m × 3.6 m (≈ 37 m²)',
    unit_size_sqm: '37',
    manufacturing_time: '16–20 weeks',
    price: 'ZAR 845000',
    price_amount: '845000',
  },
  'UnitsU::/7-series-photo-gallery/7-series-photo-gallery/': {
    product_name_hint: 'Elevation 7 Series Park Model',
    product_name: 'Elevation 7 Series Park Model',
    primary_description:
      'The 7 Series is the flagship Elevation Park Model — the largest, longest, and most generously specced layout in the range. Expansive open-plan living with a full residential kitchen, walk-in pantry, dedicated dining nook, master bedroom with walk-in robe, and a spa-style bathroom. Designer-grade standard finishes (shaker cabinetry, quartz-look counters, designer tiling, statement lighting) put this at the upper end of the premium tiny-home market without crossing into bespoke luxury pricing. RVIA-certified for residential-style use.',
    unit_features:
      'Largest 7-Series layout | Vaulted shiplap ceiling | Walk-in pantry | Master bedroom with walk-in robe | Spa-style bathroom with designer tiling | Full residential kitchen island | Premium appliance package | Designer pendant & sconce lighting | Mini-split heat pump | Dual-pane low-E windows | RVIA-certified',
    included_items:
      'Park-model chassis & axles | Premium appliance package | Full master suite | Designer bathroom | LED interior lighting | HVAC mini-split | Covered porch landing | Extended manufacturer warranty',
    optional_extras:
      'Loft sleeping platform | Full wrap-around deck & pergola | Top-tier designer interior package | Off-grid solar + battery | Premium exterior cladding | Smart-home automation pack',
    unit_size: '12.8 m × 3.6 m (≈ 42 m²)',
    unit_size_sqm: '42',
    manufacturing_time: '18–22 weeks',
    price: 'ZAR 1045000',
    price_amount: '1045000',
  },

  // ── UnitsV · Prestige Homeseeker · Residential Park Homes ───────────────
  'UnitsV::/residential-park-homes/avanti/avanti/': {
    product_name_hint: 'Prestige Avanti Residential Park Home',
    product_name: 'Prestige Avanti',
    primary_description:
      'The Avanti from Prestige Homeseeker is a full-spec residential park home built to BS3632 (year-round occupancy) standards in the UK. Two bedrooms, separate lounge and dining, fully fitted kitchen and a family bathroom — all delivered as a single transportable unit ready to site. Contemporary external cladding, deep-pile carpets, integrated appliances, gas central heating and double glazing throughout make it a true bricks-and-mortar alternative.',
    unit_features:
      'BS3632 residential spec | Two bedrooms (master en-suite optional) | Fully fitted kitchen with integrated appliances | Family bathroom | Separate lounge & dining | Gas central heating | Double glazing | Contemporary cladding | Carpets & flooring throughout',
    included_items:
      'Pre-built single-section chassis | Fitted kitchen with appliances | Bathroom suite | Carpets & flooring | Central heating & hot water | Double-glazed windows | Curtains & blinds | 10-year structural warranty',
    optional_extras:
      'Master en-suite | Designer interior package | Pitched roof upgrade | External decking & balustrade | Air-conditioning | Solar PV pre-install',
    unit_size: '12.5 m × 6.0 m (≈ 75 m²)',
    unit_size_sqm: '75',
    manufacturing_time: '20–26 weeks',
    price: 'ZAR 1395000',
    price_amount: '1395000',
  },
  'UnitsV::/residential-park-homes/residence/residence/': {
    product_name_hint: 'Prestige Residence Park Home',
    product_name: 'Prestige Residence',
    primary_description:
      'The Residence is one of Prestige Homeseeker\'s signature residential park homes — a contemporary statement build with a wide open-plan living/kitchen/dining heart, two large bedrooms (master with en-suite and walk-in robe), a designer family bathroom and a feature media wall. Built to BS3632 for full-time residential use, fully fitted with premium integrated appliances, gas central heating, double glazing and high-grade insulation. Delivered as a complete pre-built home ready for connection.',
    unit_features:
      'BS3632 residential spec | Statement contemporary façade | Open-plan living/kitchen/dining | Master suite with en-suite & walk-in robe | Second double bedroom | Designer family bathroom | Premium integrated kitchen appliances | Feature media wall | Gas central heating | Double glazing | Carpets & engineered flooring',
    included_items:
      'Pre-built chassis & superstructure | Premium fitted kitchen | Master en-suite + family bathroom | Carpets & flooring | Central heating & hot water | Double-glazed windows | Curtains, blinds & light fittings | 10-year structural warranty',
    optional_extras:
      'Designer interior upgrade pack | Hardwood decking & balustrade | Hot tub package | Air-conditioning | Solar PV | Smart-home automation',
    unit_size: '13.4 m × 6.7 m (≈ 90 m²)',
    unit_size_sqm: '90',
    manufacturing_time: '22–28 weeks',
    price: 'ZAR 1695000',
    price_amount: '1695000',
  },
  'UnitsV::/residential-park-homes/majestic/majestic/': {
    product_name_hint: 'Prestige Majestic Residential Park Home',
    product_name: 'Prestige Majestic',
    primary_description:
      'The Majestic sits at the top of the Prestige residential range — a wider, longer, dual-section park home with a grand entrance hall, separate formal lounge, dining room, premium kitchen, master suite with full en-suite and dressing area, plus additional bedrooms. Built to BS3632 for permanent occupation with the highest standard insulation, gas central heating and high-end integrated appliances. The closest thing to a custom-built home in the park-home category.',
    unit_features:
      'BS3632 residential spec | Dual-section build (wider footprint) | Grand entrance hall | Separate formal lounge & dining | Premium fitted kitchen with island | Master suite with dressing area & en-suite | Additional bedrooms | Designer family bathroom | Enhanced insulation pack | Gas central heating | Double glazing',
    included_items:
      'Pre-built dual-section chassis | Premium fitted kitchen | Master en-suite & family bathroom | Carpets & flooring throughout | Central heating & hot water | Double-glazed windows | Curtains, blinds & lighting | 10-year structural warranty',
    optional_extras:
      'Top-tier designer interior pack | Bi-fold doors | Hardwood decking & pergola | Hot tub package | Air-conditioning | Solar PV + battery | Smart-home automation',
    unit_size: '15.2 m × 7.6 m (≈ 110 m²)',
    unit_size_sqm: '110',
    manufacturing_time: '24–30 weeks',
    price: 'ZAR 1985000',
    price_amount: '1985000',
  },

  // ── UnitsV · Prestige Homeseeker · Holiday Lodges ───────────────────────
  'UnitsV::/holiday-lodges/skylark/skylark/': {
    product_name_hint: 'Prestige Skylark Holiday Lodge',
    product_name: 'Prestige Skylark',
    primary_description:
      'The Skylark is the entry holiday lodge from Prestige Homeseeker — a smart, compact two-bedroom lodge built to EN1647 holiday-home spec. Open-plan lounge, kitchen and dining, family bathroom and a master with en-suite cloakroom. Fully fitted kitchen, integrated appliances, double glazing and central heating included as standard. A premium step up from a static caravan, ready for a holiday park or private leisure stand.',
    unit_features:
      'EN1647 holiday spec | Two bedrooms | Master en-suite cloakroom | Open-plan living/kitchen/dining | Fitted kitchen with appliances | Family bathroom | Double glazing | Central heating | Carpets & flooring throughout',
    included_items:
      'Pre-built lodge chassis | Fitted kitchen with appliances | Bathroom suite | Carpets & flooring | Central heating & hot water | Double-glazed windows | Curtains & blinds',
    optional_extras:
      'Hot tub package | Decking | Designer interior upgrade | Air-conditioning',
    unit_size: '12.0 m × 6.0 m (≈ 72 m²)',
    unit_size_sqm: '72',
    manufacturing_time: '18–22 weeks',
    price: 'ZAR 895000',
    price_amount: '895000',
  },
  'UnitsV::/holiday-lodges/aura/aura/': {
    product_name_hint: 'Prestige Aura Holiday Lodge',
    product_name: 'Prestige Aura',
    primary_description:
      'The Aura is a contemporary mid-range Prestige holiday lodge with clean architectural lines, a wrap-around glazed living area and a feature kitchen island. Two bedrooms, master en-suite, family bathroom, fully fitted designer kitchen with integrated appliances, double glazing and central heating throughout. A great fit for modern lifestyle estates and short-stay rental portfolios.',
    unit_features:
      'EN1647 holiday spec | Wrap-around glazing | Two bedrooms | Master en-suite | Designer kitchen with island | Integrated appliance package | Family bathroom | Central heating | Double glazing',
    included_items:
      'Lodge chassis & superstructure | Designer fitted kitchen | Master en-suite + family bathroom | Carpets & flooring | Central heating & hot water | Double glazing | Curtains & blinds',
    optional_extras:
      'Hot tub package | Hardwood deck | Designer interior pack | Bi-fold patio doors | Air-conditioning',
    unit_size: '12.5 m × 6.0 m (≈ 75 m²)',
    unit_size_sqm: '75',
    manufacturing_time: '20–24 weeks',
    price: 'ZAR 1045000',
    price_amount: '1045000',
  },
  'UnitsV::/holiday-lodges/dryft/dryft/': {
    product_name_hint: 'Prestige Dryft Holiday Lodge',
    product_name: 'Prestige Dryft',
    primary_description:
      'The Dryft is Prestige\'s lifestyle-focused holiday lodge — Scandi-inspired interiors, natural timber accents, vaulted living spaces and a generous open-plan kitchen/lounge. Two double bedrooms with master en-suite, family bathroom, fully fitted kitchen with integrated appliances, central heating and double glazing throughout. Built for premium short-let portfolios and weekend escapes alike.',
    unit_features:
      'Scandi-inspired interior | Vaulted lounge ceiling | Natural timber detailing | Two double bedrooms | Master en-suite | Family bathroom | Fully fitted kitchen with appliances | Central heating | Double glazing',
    included_items:
      'Lodge chassis & superstructure | Fitted kitchen with appliances | Master en-suite + family bathroom | Carpets & flooring | Central heating & hot water | Double glazing | Curtains, blinds & lighting',
    optional_extras:
      'Hot tub | Hardwood deck & balustrade | Designer interior upgrade | Bi-fold doors | Air-conditioning',
    unit_size: '12.5 m × 6.5 m (≈ 81 m²)',
    unit_size_sqm: '81',
    manufacturing_time: '20–24 weeks',
    price: 'ZAR 1165000',
    price_amount: '1165000',
  },
  'UnitsV::/holiday-lodges/foresters-lodge/foresters-lodge/': {
    product_name_hint: 'Prestige Foresters Lodge',
    product_name: 'Prestige Foresters Lodge',
    primary_description:
      'The Foresters Lodge has a more rustic-premium character — natural cedar-look cladding, log-cabin styling, exposed beam detailing and a warm timber-and-stone interior palette. Two bedrooms with master en-suite, designer family bathroom, fully fitted country-style kitchen, central heating and double glazing. Ideal for forested resorts, bushveld estates and game-lodge style developments.',
    unit_features:
      'Cedar-look cladding | Log-cabin styling | Exposed beam detailing | Two bedrooms | Master en-suite | Designer family bathroom | Country-style fitted kitchen | Central heating | Double glazing',
    included_items:
      'Lodge chassis & superstructure | Fitted country kitchen with appliances | Master en-suite + family bathroom | Carpets & flooring | Central heating & hot water | Double glazing | Curtains & blinds',
    optional_extras:
      'Wood-burning stove | Wraparound deck & pergola | Hot tub | Designer interior upgrade | Bi-fold doors',
    unit_size: '13.0 m × 6.5 m (≈ 84 m²)',
    unit_size_sqm: '84',
    manufacturing_time: '20–26 weeks',
    price: 'ZAR 1245000',
    price_amount: '1245000',
  },
  'UnitsV::/holiday-lodges/bella-vista/bella-vista/': {
    product_name_hint: 'Prestige Bella Vista Holiday Lodge',
    product_name: 'Prestige Bella Vista',
    primary_description:
      'The Bella Vista is a premium contemporary holiday lodge — Mediterranean-inspired styling, expansive glazing onto a generous outdoor terrace, and a designer interior with bespoke kitchen island and statement lighting. Two double bedrooms with master en-suite, full family bathroom, fully fitted appliance package, central heating and double glazing throughout.',
    unit_features:
      'Mediterranean-inspired exterior | Expansive picture windows | Two double bedrooms | Master en-suite | Designer family bathroom | Bespoke kitchen island | Statement lighting package | Central heating | Double glazing',
    included_items:
      'Lodge chassis & superstructure | Premium fitted kitchen with appliances | Master en-suite + family bathroom | Carpets & flooring | Central heating & hot water | Double glazing | Curtains, blinds & feature lighting',
    optional_extras:
      'Hot tub | Hardwood terrace & pergola | Designer interior pack | Bi-fold doors | Air-conditioning | Outdoor kitchen pack',
    unit_size: '13.0 m × 6.7 m (≈ 87 m²)',
    unit_size_sqm: '87',
    manufacturing_time: '22–26 weeks',
    price: 'ZAR 1345000',
    price_amount: '1345000',
  },
  'UnitsV::/holiday-lodges/hampton/hampton/': {
    product_name_hint: 'Prestige Hampton Holiday Lodge',
    product_name: 'Prestige Hampton',
    primary_description:
      'The Hampton is Prestige\'s classic premium holiday lodge — New England-inspired weatherboard exterior, painted shaker kitchen, panelled wall detailing and a refined coastal interior palette. Two double bedrooms with master en-suite, designer family bathroom, fully fitted kitchen with island, central heating and double glazing. A timeless premium lodge for coastal estates and lifestyle resorts.',
    unit_features:
      'New England weatherboard exterior | Coastal interior palette | Painted shaker kitchen with island | Panelled wall detailing | Two double bedrooms | Master en-suite | Designer family bathroom | Central heating | Double glazing',
    included_items:
      'Lodge chassis & superstructure | Premium fitted kitchen with appliances | Master en-suite + family bathroom | Carpets & flooring | Central heating & hot water | Double glazing | Curtains & blinds',
    optional_extras:
      'Wraparound veranda | Hot tub | Outdoor shower | Designer interior pack | Bi-fold doors | Air-conditioning',
    unit_size: '13.5 m × 6.7 m (≈ 90 m²)',
    unit_size_sqm: '90',
    manufacturing_time: '22–28 weeks',
    price: 'ZAR 1445000',
    price_amount: '1445000',
  },
  'UnitsV::/holiday-lodges/plantation-house/plantation-house/': {
    product_name_hint: 'Prestige Plantation House',
    product_name: 'Prestige Plantation House',
    primary_description:
      'The Plantation House is a statement traditional lodge — wide colonial-style veranda, pitched roof, classical detailing and a warm formal interior with a separate dining space, formal lounge and country-style kitchen. Two double bedrooms with master en-suite and family bathroom. Built to premium spec with central heating, double glazing and high-end appliances throughout.',
    unit_features:
      'Colonial-style veranda profile | Pitched roof | Separate formal lounge & dining | Country-style fitted kitchen | Two double bedrooms | Master en-suite | Family bathroom | Central heating | Double glazing | Premium appliance package',
    included_items:
      'Lodge chassis & superstructure | Premium fitted kitchen with appliances | Master en-suite + family bathroom | Carpets & flooring | Central heating & hot water | Double glazing | Curtains, blinds & feature lighting',
    optional_extras:
      'Wraparound colonial veranda | Hot tub | Designer interior upgrade | Bi-fold doors | Air-conditioning | Wood-burning stove',
    unit_size: '13.5 m × 7.0 m (≈ 95 m²)',
    unit_size_sqm: '95',
    manufacturing_time: '24–28 weeks',
    price: 'ZAR 1595000',
    price_amount: '1595000',
  },
  'UnitsV::/holiday-lodges/casa-di-lusso/casa-di-lusso/': {
    product_name_hint: 'Prestige Casa di Lusso Holiday Lodge',
    product_name: 'Prestige Casa di Lusso',
    primary_description:
      'The Casa di Lusso is Prestige\'s top-tier luxury holiday lodge — Italian-villa-inspired styling, full-height glazing, marble-effect surfaces, statement lighting and bespoke joinery throughout. Two large double bedrooms with master en-suite (full walk-in shower & feature freestanding bath where specced), designer family bathroom, premium handleless kitchen with island, central heating and double glazing. Designed for trophy-grade short-let portfolios and ultra-premium estate stands.',
    unit_features:
      'Italian-villa styling | Full-height glazing | Marble-effect surfaces | Bespoke handleless kitchen with island | Statement lighting throughout | Two large double bedrooms | Premium master en-suite | Designer family bathroom | Central heating | Double glazing',
    included_items:
      'Lodge chassis & superstructure | Premium handleless kitchen with appliances | Master en-suite + designer family bathroom | Premium carpets & flooring | Central heating & hot water | Double glazing | Designer curtains, blinds & lighting',
    optional_extras:
      'Freestanding feature bath | Hot tub | Hardwood terrace & pergola | Bi-fold or sliding doors | Smart-home automation | Air-conditioning | Outdoor kitchen',
    unit_size: '13.5 m × 7.0 m (≈ 95 m²)',
    unit_size_sqm: '95',
    manufacturing_time: '24–30 weeks',
    price: 'ZAR 1795000',
    price_amount: '1795000',
  },
  'UnitsV::/holiday-lodges/glass-house/glass-house/': {
    product_name_hint: 'Prestige Glass House Lodge',
    product_name: 'Prestige Glass House',
    primary_description:
      'The Glass House is Prestige\'s most architectural holiday lodge — full-height glazed walls, vaulted living spaces and an indoor-outdoor flow more typical of an architect-designed villa than a park home. Two double bedrooms with master en-suite, designer family bathroom, premium open-plan kitchen with island, central heating and double glazing throughout. A true statement lodge for view-driven sites.',
    unit_features:
      'Full-height glazed walls | Vaulted living spaces | Indoor-outdoor flow | Two double bedrooms | Master en-suite | Designer family bathroom | Premium open-plan kitchen with island | Central heating | Double glazing',
    included_items:
      'Lodge chassis & superstructure | Premium fitted kitchen with appliances | Master en-suite + family bathroom | Premium carpets & flooring | Central heating & hot water | Double glazing | Designer curtains, blinds & lighting',
    optional_extras:
      'Hardwood terrace | Hot tub | Bi-fold or pivot doors | Smart-home automation | Air-conditioning | Designer interior upgrade',
    unit_size: '13.5 m × 7.0 m (≈ 95 m²)',
    unit_size_sqm: '95',
    manufacturing_time: '24–30 weeks',
    price: 'ZAR 1875000',
    price_amount: '1875000',
  },
  'UnitsV::/holiday-lodges/the-tempest/tempest/': {
    product_name_hint: 'Prestige Tempest Holiday Lodge',
    product_name: 'Prestige Tempest',
    primary_description:
      'The Tempest is the boldest architectural lodge in the Prestige holiday range — sharp contemporary lines, dramatic dual-pitch roofline, full-height glazing across the living wing and a designer-grade interior throughout. Two large double bedrooms with master en-suite, designer family bathroom, premium handleless kitchen with island, central heating and double glazing. A flagship lodge for high-end short-let and lifestyle estates.',
    unit_features:
      'Dual-pitch architectural roofline | Full-height glazing across living wing | Two large double bedrooms | Premium master en-suite | Designer family bathroom | Premium handleless kitchen with island | Statement lighting | Central heating | Double glazing',
    included_items:
      'Lodge chassis & superstructure | Premium handleless kitchen with appliances | Master en-suite + designer family bathroom | Premium carpets & flooring | Central heating & hot water | Double glazing | Designer curtains, blinds & lighting',
    optional_extras:
      'Hardwood terrace & pergola | Hot tub | Bi-fold or sliding doors | Smart-home automation | Air-conditioning | Outdoor kitchen | Designer interior upgrade',
    unit_size: '14.0 m × 7.0 m (≈ 98 m²)',
    unit_size_sqm: '98',
    manufacturing_time: '24–30 weeks',
    price: 'ZAR 1945000',
    price_amount: '1945000',
  },

  // ── UnitsV · Prestige Homeseeker · Heritage / Legacy ranges ─────────────
  // Discontinued / heritage ranges — built to the same UK BS3632 (residential)
  // or EN1647 (holiday) spec as current Prestige stock but no longer in
  // production. Offered here as ex-display, refurbished and short-supply
  // stock at sharper price points than the current line-up.
  'UnitsV::/legacy-homes/legacy-homes/legacy-homes/': {
    product_name_hint: 'Prestige Heritage Park Home',
    product_name: 'Prestige Heritage Park Home',
    primary_description:
      'A heritage-range Prestige residential park home from a previous Prestige Homeseeker line-up. Built to BS3632 for full-time occupation: two bedrooms, fitted kitchen, family bathroom, lounge & dining, gas central heating and double glazing throughout. Offered as ex-display / refurbished stock at a sharper price than current Prestige homes — ideal for buyers who want the build quality without the latest styling.',
    unit_features:
      'BS3632 residential spec | Two bedrooms | Fitted kitchen with appliances | Family bathroom | Separate lounge & dining | Gas central heating | Double glazing | Refurbished / ex-display unit',
    included_items:
      'Pre-built chassis & superstructure | Fitted kitchen with appliances | Bathroom suite | Carpets & flooring | Central heating & hot water | Double glazing | Curtains & blinds | Refurb warranty',
    optional_extras:
      'Re-cladding / paint refresh | Updated kitchen package | Updated bathroom package | Decking | Solar PV',
    unit_size: '12.0 m × 6.0 m (≈ 72 m²)',
    unit_size_sqm: '72',
    manufacturing_time: '6–10 weeks (refurbishment & dispatch)',
    price: 'ZAR 945000',
    price_amount: '945000',
  },
  'UnitsV::/legacy-homes/residential/legacy-residential-homes/': {
    product_name_hint: 'Prestige Heritage Residential Home',
    product_name: 'Prestige Heritage Residential Home',
    primary_description:
      'Heritage Prestige residential home — a discontinued residential layout, fully refurbished to current habitable standard. Two/three bedrooms (layout-dependent), fully fitted kitchen, family bathroom, lounge & dining, gas central heating and double glazing. A great-value bricks-and-mortar alternative for permanent residential use on a private stand or estate.',
    unit_features:
      'BS3632 residential spec | Two/three bedrooms | Fitted kitchen with appliances | Family bathroom | Separate lounge & dining | Gas central heating | Double glazing | Refurbished / ex-display unit',
    included_items:
      'Pre-built chassis & superstructure | Fitted kitchen with appliances | Bathroom suite | Carpets & flooring | Central heating & hot water | Double glazing | Curtains & blinds | Refurb warranty',
    optional_extras:
      'Re-cladding / paint refresh | Updated kitchen package | Updated bathroom package | Decking | Solar PV',
    unit_size: '12.5 m × 6.5 m (≈ 81 m²)',
    unit_size_sqm: '81',
    manufacturing_time: '6–10 weeks (refurbishment & dispatch)',
    price: 'ZAR 1095000',
    price_amount: '1095000',
  },
  'UnitsV::/legacy-homes/legacy-holiday-lodges/legacy-holiday-lodges/': {
    product_name_hint: 'Prestige Heritage Holiday Lodge',
    product_name: 'Prestige Heritage Holiday Lodge',
    primary_description:
      'A heritage-range Prestige holiday lodge from a previous line-up — built to EN1647 holiday spec, refurbished and presented as turn-key. Two bedrooms with master en-suite, family bathroom, fully fitted kitchen with appliances, central heating and double glazing. A strong-value entry into the premium-lodge market for short-let portfolios and lifestyle stands.',
    unit_features:
      'EN1647 holiday spec | Two bedrooms | Master en-suite | Family bathroom | Fitted kitchen with appliances | Central heating | Double glazing | Refurbished / ex-display unit',
    included_items:
      'Pre-built lodge chassis | Fitted kitchen with appliances | Master en-suite + family bathroom | Carpets & flooring | Central heating & hot water | Double glazing | Curtains & blinds | Refurb warranty',
    optional_extras:
      'Re-cladding / paint refresh | Updated kitchen package | Updated bathroom package | Hot tub | Decking',
    unit_size: '12.0 m × 6.0 m (≈ 72 m²)',
    unit_size_sqm: '72',
    manufacturing_time: '6–10 weeks (refurbishment & dispatch)',
    price: 'ZAR 795000',
    price_amount: '795000',
  },
}

// Page URLs that are obvious homepages (root path) — also excluded.
function isHomepageUrl(url) {
  if (!url) return false
  try {
    const parsed = new URL(url)
    const path = parsed.pathname.replace(/\/+$/, '')
    return path === '' || path === '/'
  } catch {
    return false
  }
}

function slugify(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function splitPipeList(value) {
  return String(value ?? '')
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function sentenceCase(value) {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function cleanName(value) {
  return String(value ?? '')
    .replace(/\s*\|\s*.*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanDescription(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\|/g, ' | ')
    .trim()
}

// Produce a short, customer-facing summary from a long scraped description.
// Strips bullet/spec dumps and keeps the first ~2-3 marketing sentences.
function summarizeDescription(value, maxChars = 320) {
  let text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return ''

  // Drop everything from the first spec-list signal onward — these long
  // bullet sections (Dimensions, Core Construction, Electrical, etc.) are
  // displayed in the Included / Specs panels instead.
  const specCutoffRe = /\s*(?:[•\u2022]|\bDimensions\b|\bCore Construction\b|\bElectrical(?: & Outlets)?\b|\bDoors? & Windows\b|\bLighting & Fans\b|\bSpa[-\s]?Style Bathroom\b|\bInsulation:\b|\bFraming:\b|\bWalls:\b|\bCeiling:\b|\bFlooring:\b|\bGlazing:\b|\bQty\s+\d|\bIncluded:\b|\bExcluded:\b|\bOptional extras:\b|\bSize:\s|\bManufacturing time:\b|\bFrom:\s)/i
  const cutIdx = text.search(specCutoffRe)
  if (cutIdx > 80) text = text.slice(0, cutIdx).trim()

  // Strip pipe-separated chunks that look like spec rows.
  text = text.split(/\s*\|\s*/).filter((chunk) => {
    if (!chunk) return false
    if (/^(?:Size|Included|Excluded|Optional extras?|Manufacturing time|From|Insulation|Flooring|Walls|Ceiling|Glazing|Doors|Windows|Lighting|Electrical|Framing)\s*[:\-]/i.test(chunk)) return false
    return true
  }).join(' ').trim()

  // De-duplicate: many scraped entries paste the same opening twice.
  const half = Math.floor(text.length / 2)
  if (half > 60) {
    const first = text.slice(0, half).trim()
    const rest = text.slice(half).trim()
    if (rest.startsWith(first.slice(0, Math.min(60, first.length)))) {
      text = first
    }
  }

  if (text.length <= maxChars) return text

  // Truncate at the next sentence boundary after maxChars*0.7 if possible.
  const soft = Math.floor(maxChars * 0.7)
  const window = text.slice(soft, maxChars + 80)
  const stop = window.search(/[.!?](\s|$)/)
  if (stop !== -1) return text.slice(0, soft + stop + 1).trim()
  return text.slice(0, maxChars).trim().replace(/[\s,;:|–-]+$/, '') + '…'
}

function extractNumber(value) {
  if (value == null) return null
  const normalized = String(value).replace(/,/g, '')
  const match = normalized.match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : null
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function normalizeToken(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function tokenizeIdentity(value) {
  return normalizeToken(value)
    .split('-')
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !['container', 'shipping', 'portable', 'prefab', 'house', 'unit'].includes(token))
}

function parseFootage(value) {
  if (value == null) return null
  const text = String(value).toLowerCase()
  const compactMatch = text.match(/\b(10|12|16|20|30|40)\s*(?:ft|foot)\b/)
  if (compactMatch) return Number(compactMatch[1])
  return null
}

function sqmForFootLength(footLength) {
  if (footLength == null) return null
  const lengthMeters = footLength * 0.3048
  const standardWidthMeters = 2.438
  return Math.round(lengthMeters * standardWidthMeters)
}

function formatCurrency(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return 'Price on request'
  }

  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function hashString(value) {
  let hash = 0
  const text = String(value ?? '')
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function roundToNearest(value, step = 500) {
  if (typeof value !== 'number' || Number.isNaN(value)) return value
  return Math.round(value / step) * step
}

function parsePrice(record) {
  const rawPrice = String(record.price ?? '').trim()
  const rawAmount = String(record.price_amount ?? '').trim()
  const merged = `${rawPrice} ${rawAmount}`.trim()
  const hasUsd = /\bUSD\b|\$/i.test(rawPrice)
  const hasZar = /\bZAR\b|\bR\s?[\d,]/i.test(rawPrice)
  let numeric = extractNumber(rawPrice) ?? extractNumber(rawAmount)

  if (numeric != null && numeric < 1000 && !hasUsd && !hasZar) {
    numeric = null
  }

  if (numeric == null) {
    return {
      amountZar: null,
      currency: 'ZAR',
      raw: merged,
      display: 'Price on request',
      convertedFromUsd: false,
    }
  }

  const amountZar = hasUsd ? Math.round(numeric * USD_TO_ZAR) : Math.round(numeric)

  return {
    amountZar,
    currency: hasUsd ? 'USD' : 'ZAR',
    raw: merged,
    display: formatCurrency(amountZar),
    convertedFromUsd: hasUsd,
  }
}

function minimumPriceByProfile(category, sizeInfo) {
  const categoryFloor = {
    Pools: 95000,
    Toilets: 45000,
    Offices: 85000,
    'Guard Booths': 60000,
    Homes: 150000,
    Cabins: 120000,
    Retail: 110000,
    Classrooms: 140000,
    Storage: 70000,
    'Modular Units': 95000,
  }[category] ?? 95000

  const bucketFloor = {
    Compact: 110000,
    Medium: 180000,
    Large: 290000,
    Estate: 520000,
    Custom: 140000,
  }[sizeInfo.bucket] ?? 140000

  return Math.max(categoryFloor, bucketFloor)
}

function estimatePriceByProfile(record, category, sizeInfo) {
  const baseByCategory = {
    Pools: 105000,
    Toilets: 52000,
    Offices: 92000,
    'Guard Booths': 68000,
    Homes: 190000,
    Cabins: 145000,
    Retail: 125000,
    Classrooms: 160000,
    Storage: 78000,
    'Modular Units': 98000,
  }

  const rateByCategory = {
    Pools: 5200,
    Toilets: 3500,
    Offices: 4700,
    'Guard Booths': 3900,
    Homes: 5600,
    Cabins: 5000,
    Retail: 4900,
    Classrooms: 5300,
    Storage: 4100,
    'Modular Units': 4600,
  }

  const defaultSqmByBucket = {
    Compact: 18,
    Medium: 34,
    Large: 62,
    Estate: 108,
    Custom: 28,
  }

  const text = `${record.product_name ?? ''} ${record.product_description ?? ''} ${record.unit_features ?? ''} ${record.optional_extras ?? ''}`.toLowerCase()
  const sqm = sizeInfo.sqm ?? defaultSqmByBucket[sizeInfo.bucket] ?? 28
  const categoryBase = baseByCategory[category] ?? 98000
  const sqmRate = rateByCategory[category] ?? 4600

  let estimate = categoryBase + sqm * sqmRate

  if (/(off-grid|solar|battery)/.test(text)) estimate += 24000
  if (/(luxury|premium|bespoke|designer)/.test(text)) estimate += 18000
  if (/(bathroom|shower|toilet|ensuite|restroom)/.test(text)) estimate += 13000
  if (/(kitchen|kitchenette|appliance)/.test(text)) estimate += 15000
  if (/(deck|patio|pergola)/.test(text)) estimate += 9000

  const fingerprint = `${record.relationship_group_id || record.product_group_key || record.unit_slug || record.product_name}|${category}|${sizeInfo.sizeLabel}`
  const jitterBand = (hashString(fingerprint) % 11) - 5
  estimate *= 1 + jitterBand * 0.014

  const floor = minimumPriceByProfile(category, sizeInfo)
  const bounded = Math.max(floor, estimate)
  return roundToNearest(bounded, 500)
}

function normalizePrice(record, category, sizeInfo) {
  const parsed = parsePrice(record)
  const estimatedAmount = estimatePriceByProfile(record, category, sizeInfo)

  if (parsed.amountZar == null) {
    return {
      ...parsed,
      amountZar: estimatedAmount,
      display: formatCurrency(estimatedAmount),
      estimated: true,
    }
  }

  if (parsed.amountZar < 20000) {
    return {
      ...parsed,
      amountZar: estimatedAmount,
      display: formatCurrency(estimatedAmount),
      estimated: true,
    }
  }

  return {
    ...parsed,
    estimated: false,
  }
}

function parseSizeInfo(record) {
  const unitSize = String(record.unit_size ?? '').trim()
  const sizeSqm = extractNumber(record.unit_size_sqm)
  const description = `${record.product_name ?? ''} ${record.product_description ?? ''} ${record.unit_features ?? ''} ${record.product_group_key ?? ''} ${record.unit_slug ?? ''}`
  const meterMatch = description.match(/(\d+(?:\.\d+)?)\s*m²/i)
  const footLength = parseFootage(description)

  const sqm = sizeSqm ?? (meterMatch ? Number(meterMatch[1]) : sqmForFootLength(footLength))
  const normalizedSqm = sqm != null ? clamp(Math.round(sqm), 8, 320) : null
  const sizeLabel =
    unitSize ||
    (footLength && normalizedSqm ? `${footLength}ft (~${normalizedSqm}m²)` : null) ||
    (normalizedSqm ? `${normalizedSqm}m²` : null) ||
    '20ft (~15m²)'

  let bucket = 'Custom'
  if (normalizedSqm != null) {
    if (normalizedSqm < 20) bucket = 'Compact'
    else if (normalizedSqm < 40) bucket = 'Medium'
    else if (normalizedSqm < 80) bucket = 'Large'
    else bucket = 'Estate'
  } else if (footLength != null) {
    if (footLength <= 20) bucket = 'Compact'
    else if (footLength <= 30) bucket = 'Medium'
    else bucket = 'Large'
  }

  return {
    sqm: normalizedSqm,
    sizeLabel,
    bucket,
    footLength,
  }
}

function inferCategory(record, collectionKey) {
  const name = `${record.product_name_hint ?? ''} ${record.product_name ?? ''} ${record.unit_slug ?? ''} ${record.product_group_key ?? ''}`
  const description = `${record.product_description ?? ''} ${record.primary_description ?? ''} ${record.unit_features ?? ''}`
  const collection = String(collectionKey ?? '')

  for (const rule of CATEGORY_RULES) {
    if (rule.collection && rule.collection.test(collection)) return rule.category
    if (rule.name && rule.name.test(name)) return rule.category
    if (rule.description && !rule.name && rule.description.test(description)) return rule.category
  }

  // As a last resort, scan description with the *name* patterns too — but
  // skip overly common words by reusing the same regexes (which already use
  // word boundaries).
  for (const rule of CATEGORY_RULES) {
    if (rule.name && rule.name.test(description)) return rule.category
  }

  if (COLLECTION_DEFAULT_CATEGORY[collection]) return COLLECTION_DEFAULT_CATEGORY[collection]
  if (collection.toLowerCase().includes('pool')) return 'Pools'
  if (collection.toLowerCase().includes('toilet')) return 'Toilets'
  return 'Modular Units'
}

function isNonUnitGroup(primary, folderKey) {
  // Folder leaf is in our denylist of generic / non-product folders.
  if (folderKey) {
    const trimmed = folderKey.replace(/^\/+|\/+$/g, '')
    const parts = trimmed.split('/').filter(Boolean)
    const leaf = parts[parts.length - 1]
    if (leaf && NON_UNIT_FOLDER_LEAVES.has(leaf)) return true
    // Hidden specific units (collection + folder).
    if (primary?.collectionKey && HIDDEN_UNITS.has(`${primary.collectionKey}::${folderKey}`)) return true
    // Category landing pages mirror their parent name three levels deep
    // (e.g. holiday-lodges/holiday-lodges/holiday-lodges) — drop them.
    if (
      parts.length >= 3 &&
      parts[parts.length - 1] === parts[parts.length - 2] &&
      parts[parts.length - 2] === parts[parts.length - 3]
    ) {
      return true
    }
  }

  // The crawled page is a vendor homepage, not a product detail page.
  if (isHomepageUrl(primary.page_url)) return true

  // The product_name is just the site title pattern "X | Some Brand Tagline"
  // with no real product hint and the description never mentions a unit.
  const nameRaw = String(primary.product_name ?? '').toLowerCase()
  const descRaw = `${primary.product_description ?? ''} ${primary.primary_description ?? ''} ${primary.unit_features ?? ''}`.toLowerCase()
  if (
    !primary.product_name_hint &&
    !primary.unit_slug &&
    /\|/.test(nameRaw) &&
    !/\b(container|cabin|pool|office|toilet|guard|home|house|booth|pod|prefab)\b/.test(`${nameRaw} ${descRaw}`)
  ) {
    return true
  }

  return false
}

function extractTailMatches(localPath) {
  const normalized = String(localPath ?? '').replace(/\\/g, '/').toLowerCase()
  const segments = normalized.split('/').filter(Boolean)
  const matches = []

  for (let width = Math.min(4, segments.length); width >= 1; width -= 1) {
    matches.push(segments.slice(-width).join('/'))
  }

  return matches
}

function findImageUrl(localPath, collectionKey) {
  const tailMatches = extractTailMatches(localPath)
  const collectionToken = `/${String(collectionKey ?? '').toLowerCase()}/`

  for (const tail of tailMatches) {
    const match = imageEntries.find((entry) => entry.path.includes(collectionToken) && entry.path.endsWith(tail))
    if (match) return match.url
  }

  return null
}

function dedupeUrls(urls) {
  return [...new Set(urls.filter(Boolean))]
}

// The original crawl path in the JSON looks like:
//   C:\...\shopify_downloads6\misc\leopard-valley-unit-1\Leopard-Valley.jpeg
// On disk we mirror that under: assets/Units/<Collection>/leopard-valley-unit-1/...
// So the *product folder* for a unit is the leaf directory containing its
// image file. Every gallery image for a unit MUST live inside that exact
// folder. Sibling units (e.g. block-1 vs block-2) have different leaf names
// so they never bleed; cross-collection name collisions are guarded by also
// requiring the collection key on disk lookups.
//
// For UnitsU and UnitsV the source crawls nest products under a category
// folder (e.g. holiday-lodges/floating-homes/floating-homes), so we widen the
// folder key to include the parent (and grandparent for UnitsV) — otherwise a
// `floating-homes` lodge would collide with a `floating-homes` residential
// home and be merged into one entry.
function getProductFolderKey(localPath, collectionKey) {
  const normalized = String(localPath ?? '').replace(/\\/g, '/').toLowerCase()
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length < 2) return null
  const leaf = segments[segments.length - 2]
  if (!leaf) return null
  if (collectionKey === 'UnitsV' && segments.length >= 4) {
    const grandparent = segments[segments.length - 4]
    const parent = segments[segments.length - 3]
    return `/${grandparent}/${parent}/${leaf}/`
  }
  if (collectionKey === 'UnitsU' && segments.length >= 3) {
    const parent = segments[segments.length - 3]
    return `/${parent}/${leaf}/`
  }
  return `/${leaf}/`
}

function collectionToken(collectionKey) {
  return collectionKey ? `/${String(collectionKey).toLowerCase()}/` : ''
}

function findImageUrlInFolder(localPath, folderKey, collectionKey) {
  if (!folderKey) return null
  const normalized = String(localPath ?? '').replace(/\\/g, '/').toLowerCase()
  const fileName = normalized.split('/').filter(Boolean).pop()
  if (!fileName) return null
  const collToken = collectionToken(collectionKey)
  const match = imageEntries.find(
    (entry) =>
      entry.path.includes(folderKey) &&
      (!collToken || entry.path.includes(collToken)) &&
      entry.path.endsWith(`/${fileName}`),
  )
  return match ? match.url : null
}

function listImageUrlsInFolder(folderKey, collectionKey) {
  if (!folderKey) return []
  const collToken = collectionToken(collectionKey)
  return imageEntries
    .filter(
      (entry) =>
        entry.path.includes(folderKey) &&
        (!collToken || entry.path.includes(collToken)) &&
        !isLikelyNonProductImage(entry.path),
    )
    .map((entry) => entry.url)
}

function isPathInFolder(pathValue, folderKey) {
  if (!folderKey) return false
  const normalized = String(pathValue ?? '').replace(/\\/g, '/').toLowerCase()
  return normalized.includes(folderKey)
}

const REJECT_IMAGE_HINTS = [
  'logo',
  'favicon',
  'icon',
  'payment',
  'wallet',
  'delivery',
  'truck',
  'support',
  'banner',
  'cropped-fav',
]

function getPathTokens(pathValue) {
  return String(pathValue ?? '')
    .replace(/\\/g, '/')
    .toLowerCase()
    .split('/')
    .filter(Boolean)
}

function isLikelyNonProductImage(pathValue) {
  const lower = String(pathValue ?? '').toLowerCase()
  return REJECT_IMAGE_HINTS.some((hint) => lower.includes(hint))
}

// Filenames that look like floor plans / dimension drawings rather than
// real product photos. Used to push the matching image to the END of the
// gallery so it never wins the cover-image slot. Keep these tight (use
// word boundaries / dashes) to avoid false positives.
const FLOOR_PLAN_FILENAME_RE = /(?:^|[\/\\_\-.])(floor[\s_-]*plan|floorplan|dimension|layout|blueprint|2d|elevation[\s_-]*plan|site[\s_-]*plan|door[\s_-]*clearance)(?:[\/\\_\-.]|$)/i
// Crawler-suffix detector: many scraped product images end with `-!p.webp`
// (plan) vs `-!j.webp` (jpeg/photo). Always treat the `p` variant as a plan.
const PLAN_SUFFIX_RE = /-!p\.(?:webp|png|jpe?g)$/i
// UnitsA ships dimensioned top-level renders named after the unit (e.g.
// BLOCK-1.jpg, PAVILION-1.jpg, GATE-HOUSE-WITH-BATHROOM.jpg). These are
// floor-plan-style drawings, not finished photos.
const UNITS_A_PLAN_FILE_RE = /\/(BLOCK-[1-4](?:-scaled)?|PAVILION-1|GATE-HOUSE-WITH-BATHROOM(?:-scaled)?)\.jpg$/i

// Per-folder explicit cover-image overrides. When set, the gallery is
// reordered so the matching file appears first. Match is case-insensitive
// substring against the file path. Keyed by `${collectionKey}::${folderKey}`.
const COVER_IMAGE_OVERRIDES = {
  // UnitsA — folderKey uses the *inner* leaf (block-one, block-two, …).
  'UnitsA::/block-one/': 'block-one-render',
  'UnitsA::/block-two/': 'blockhouse2-render',
  'UnitsA::/block-three/': 'block-house-3-render',
  'UnitsA::/block-four/': 'block-4-render',
  'UnitsA::/pavilion/': 'pavilion-render',
  'UnitsA::/gatehouse/': 'gatehouse-render',
  // UnitsR — first-alphabetical isometric floor-plan render bumped.
  'UnitsR::/40ft-expandable-container-house/': '26012803570646411',
  // UnitsE / UnitsM — the `*_1_500x-1.webp` variant is the floor plan.
  'UnitsE::/20ft-modified-container-house/': '20ft-Container-House_2_500x',
  'UnitsM::/40ft-modified-container-house/': '40ft-Container-House_2_500x',
  // UnitsS A-Frame — the first two scraped renders are dimension/cutaway
  // drawings; bump a real exterior render to the cover slot.
  'UnitsS::/modern-a-frame-prefab-house/': '26010702171799336',
  // UnitsU — Elevation 7 Series Park Model. Use the colour-graded hero shot.
  'UnitsU::/7-series-photo-gallery/7-series-photo-gallery/': 'kjp09011-enhanced-nr-edit',
  // UnitsQ — Apple Cabin D1 hero exterior shot.
  'UnitsQ::/apple-cabin-pod-house/apple-cabin-d1/': '26042205223234282',
}

function looksLikeFloorPlan(pathValue) {
  const s = String(pathValue ?? '')
  return FLOOR_PLAN_FILENAME_RE.test(s) || PLAN_SUFFIX_RE.test(s) || UNITS_A_PLAN_FILE_RE.test(s)
}

function isRelevantForUnit(pathValue, identityTokens) {
  if (!pathValue) return false
  if (isLikelyNonProductImage(pathValue)) return false

  const normalized = normalizeToken(pathValue)
  if (!identityTokens.length) return true
  return identityTokens.some((token) => normalized.includes(token))
}

function buildGallery(records, primary) {
  // STRICT folder lock: only accept images that live inside the primary
  // record's own product folder. This prevents cross-folder bleed where
  // images from a sibling unit (e.g. block-2) ever showed up under block-1.
  const folderKey = getProductFolderKey(primary.local_path, primary.collectionKey)
  if (!folderKey) return []

  const collectionKey = primary.collectionKey
  const galleryUrls = []

  // 1) Honour the order implied by the JSON records / related paths first.
  for (const record of records) {
    const directPath = record.local_path
    if (
      directPath &&
      isPathInFolder(directPath, folderKey) &&
      !isLikelyNonProductImage(directPath)
    ) {
      const directUrl = findImageUrlInFolder(directPath, folderKey, collectionKey)
      if (directUrl) galleryUrls.push(directUrl)
    }

    for (const relatedPath of splitPipeList(record.related_local_paths)) {
      if (!isPathInFolder(relatedPath, folderKey)) continue
      if (isLikelyNonProductImage(relatedPath)) continue
      const relatedUrl = findImageUrlInFolder(relatedPath, folderKey, collectionKey)
      if (relatedUrl) galleryUrls.push(relatedUrl)
    }
  }

  // 2) Fall back to / supplement with EVERY image actually present on disk
  // inside the unit's leaf folder (scoped to its collection). This catches
  // photos that exist on disk but were not enumerated in the JSON's
  // related_local_paths (a common case after re-organising assets).
  for (const url of listImageUrlsInFolder(folderKey, collectionKey)) {
    galleryUrls.push(url)
  }

  let deduped = dedupeUrls(galleryUrls)

  // Push floor-plan / dimension drawings to the end so they never win
  // the cover-image slot.
  const planImages = deduped.filter((u) => looksLikeFloorPlan(u))
  if (planImages.length) {
    const photos = deduped.filter((u) => !looksLikeFloorPlan(u))
    deduped = [...photos, ...planImages]
  }

  // Apply per-folder explicit cover override (moves matching image to front).
  const overrideKey = `${collectionKey}::${folderKey}`
  const overrideHint = COVER_IMAGE_OVERRIDES[overrideKey]
  if (overrideHint) {
    const needle = String(overrideHint).toLowerCase()
    const matchIdx = deduped.findIndex((u) => String(u).toLowerCase().includes(needle))
    if (matchIdx > 0) {
      const [picked] = deduped.splice(matchIdx, 1)
      deduped.unshift(picked)
    }
  }

  return deduped.slice(0, 24)
}

function resolveCoverImage(images, records, primary) {
  if (images.length) return images[0]

  const folderKey = getProductFolderKey(primary.local_path, primary.collectionKey)
  const collectionKey = primary.collectionKey
  if (folderKey) {
    for (const record of records) {
      const directPath = record.local_path
      if (!directPath) continue
      if (!isPathInFolder(directPath, folderKey)) continue
      if (isLikelyNonProductImage(directPath)) continue
      const directUrl = findImageUrlInFolder(directPath, folderKey, collectionKey)
      if (directUrl) return directUrl
    }
    const folderImages = listImageUrlsInFolder(folderKey, collectionKey)
    if (folderImages.length) return folderImages[0]
  }

  return isLikelyNonProductImage(primary.source_url) ? null : primary.source_url || null
}

function createSpecRows(record, sizeInfo, priceInfo, category) {
  return [
    ['Category', category],
    ['Collection', record.collectionLabel],
    ['Size', sizeInfo.sizeLabel],
    ['Footprint', sizeInfo.bucket],
    ['Lead Time', record.manufacturing_time || 'Ready-made / enquire for lead time'],
    ['Platform', sentenceCase(record.platform || 'Urban Box')],
    ['Price', priceInfo.display],
  ].filter(([, value]) => value)
}

function toCollectionLabel(fileName) {
  return fileName
    .replace(/\.json$/i, '')
    .replace(/^Units/i, 'Units ')
    .replace(/-/g, ' ')
}

function normalizeGroups() {
  const groups = new Map()

  for (const [modulePath, records] of Object.entries(jsonModules)) {
    const fileName = modulePath.split('/').at(-1) ?? 'Units'
    const collectionKey = fileName.replace(/\.json$/i, '')
    const collectionLabel = toCollectionLabel(fileName)

    for (const record of records) {
      // Each on-disk product folder == one unit. We key the group strictly on
      // (collection + product folder) so records from different folders never
      // get merged together — even if they happen to share a
      // relationship_group_id from the original crawl.
      const folderKey = getProductFolderKey(record.local_path, collectionKey)
      const groupId = folderKey
        ? `${collectionKey}::${folderKey}`
        : record.relationship_group_id || `${collectionKey}:${record.product_group_key || record.unit_slug || cleanName(record.product_name)}`
      const overrideKey = folderKey ? `${collectionKey}::${folderKey}` : null
      const override = overrideKey ? FOLDER_OVERRIDES[overrideKey] : null
      const bucket = groups.get(groupId) ?? []
      bucket.push({
        ...record,
        ...(override || {}),
        collectionKey,
        collectionLabel,
      })
      groups.set(groupId, bucket)
    }
  }

  const mapped = [...groups.entries()]
    .filter(([groupId, records]) => {
      const primary = records[0]
      const folderKey = groupId.includes('::') ? groupId.split('::')[1] : null
      return !isNonUnitGroup(primary, folderKey)
    })
    .map(([, records]) => {
    const primary = records[0]
    const originalName = cleanName(primary.product_name_hint || primary.product_name || primary.product_group_key || primary.collectionLabel)
    const descriptionFull = cleanDescription(primary.primary_description || primary.product_description || primary.unit_features || '')
    const description = summarizeDescription(descriptionFull)
    const folderKeyForOverride = getProductFolderKey(primary.local_path, primary.collectionKey)
    const categoryOverrideKey = folderKeyForOverride ? `${primary.collectionKey}::${folderKeyForOverride}` : null
    const category = (categoryOverrideKey && CATEGORY_OVERRIDES[categoryOverrideKey]) || inferCategory(primary, primary.collectionKey)
    const tier = (categoryOverrideKey && TIER_OVERRIDES[categoryOverrideKey]) || inferTier(primary.collectionKey)
    const sizeInfo = parseSizeInfo(primary)
    const priceInfo = normalizePrice(primary, category, sizeInfo)
    const images = buildGallery(records, primary)
    const slug = slugify(primary.unit_slug || primary.product_group_key || originalName || primary.collectionKey)
    const nameOverride = categoryOverrideKey ? NAME_OVERRIDES[categoryOverrideKey] : null
    const productName = nameOverride
      || (KEEP_ORIGINAL_COLLECTIONS.has(primary.collectionKey)
        ? originalName
        : buildGenericName(category, sizeInfo, tier, primary) || originalName)
    const included = splitPipeList(primary.included_items)
    const optionalExtras = splitPipeList(primary.optional_extras)
    const excluded = splitPipeList(primary.excluded_items)
    const specRows = createSpecRows(primary, sizeInfo, priceInfo, category)

    return {
      id: primary.relationship_group_id || `${primary.collectionKey}-${slug}`,
      slug,
      name: productName,
      originalName,
      category,
      tier,
      collectionKey: primary.collectionKey,
      collectionLabel: primary.collectionLabel,
      platform: sentenceCase(primary.platform || 'Urban Box'),
      price: priceInfo,
      size: sizeInfo,
      description,
      shortDescription: description.split('|')[0]?.trim() || `${category} unit ready for purchase.`,
      leadTime: primary.manufacturing_time || 'Ready-made / enquire for dispatch timing',
      coverImage: resolveCoverImage(images, records, primary),
      gallery: images.length ? images : [primary.source_url].filter(Boolean),
      included,
      optionalExtras,
      excluded,
      flatpackNote: primary.flatpack_note || '',
      floorPlanNote: primary.sample_floor_plan_note || '',
      sourceUrl: primary.page_url || '',
      specs: specRows,
      convertedFromUsd: priceInfo.convertedFromUsd,
      priceEstimated: priceInfo.estimated,
      searchText: [
        productName,
        originalName,
        descriptionFull,
        category,
        tier,
        primary.collectionLabel,
        sizeInfo.sizeLabel,
      ].join(' ').toLowerCase(),
    }
  })

  const dedupedByIdentity = new Map()

  for (const unit of mapped) {
    const dedupeKey = `${normalizeToken(unit.originalName || unit.name)}|${normalizeToken(unit.size.sizeLabel)}`
    const current = dedupedByIdentity.get(dedupeKey)

    if (!current) {
      dedupedByIdentity.set(dedupeKey, unit)
      continue
    }

    const score = (candidate) => {
      let total = 0
      total += candidate.gallery.length * 3
      total += candidate.description.length > 60 ? 10 : 0
      total += candidate.price.amountZar ? 8 : 0
      total += candidate.size.sqm ? 6 : 0
      total += candidate.priceEstimated ? 0 : 12
      return total
    }

    if (score(unit) > score(current)) {
      dedupedByIdentity.set(dedupeKey, unit)
    }
  }

  const dedupedUnits = [...dedupedByIdentity.values()]
  const estimatedPriceGroups = new Map()

  for (const unit of dedupedUnits) {
    if (!unit.priceEstimated || unit.price.amountZar == null) continue
    const key = String(unit.price.amountZar)
    const bucket = estimatedPriceGroups.get(key) ?? []
    bucket.push(unit)
    estimatedPriceGroups.set(key, bucket)
  }

  for (const group of estimatedPriceGroups.values()) {
    if (group.length < 2) continue
    group.sort((left, right) => left.name.localeCompare(right.name))

    group.forEach((unit, index) => {
      const adjusted = roundToNearest(unit.price.amountZar + index * 3500, 500)
      unit.price = {
        ...unit.price,
        amountZar: adjusted,
        display: formatCurrency(adjusted),
      }
      unit.specs = unit.specs.map(([label, value]) => (label === 'Price' ? [label, unit.price.display] : [label, value]))
    })
  }

  return dedupedUnits.sort((left, right) => {
    if (left.price.amountZar == null && right.price.amountZar == null) return left.name.localeCompare(right.name)
    if (left.price.amountZar == null) return 1
    if (right.price.amountZar == null) return -1
    return left.price.amountZar - right.price.amountZar
  })
}

export const allUnits = normalizeGroups()
export const unitCategories = [...new Set(allUnits.map((unit) => unit.category))].sort()
export const unitCollections = [...new Set(allUnits.map((unit) => unit.collectionLabel))].sort()
export const unitSizeBuckets = [...new Set(allUnits.map((unit) => unit.size.bucket))].sort()
export const unitTiers = ['Basic', 'Premium'].filter((tier) =>
  allUnits.some((unit) => unit.tier === tier),
)
// slug → original (pre-rename) display name. Useful for record-keeping and
// for reverting individual units back to their source name.
export const originalNameMap = Object.fromEntries(
  allUnits.map((unit) => [unit.slug, unit.originalName]),
)

export function getUnitBySlug(slug) {
  return allUnits.find((unit) => unit.slug === slug) ?? null
}

export function getFeaturedUnits(limit = 5) {
  const seenCategories = new Set()
  const featured = []

  for (const unit of allUnits) {
    if (!seenCategories.has(unit.category)) {
      featured.push(unit)
      seenCategories.add(unit.category)
    }
    if (featured.length === limit) break
  }

  return featured.length ? featured : allUnits.slice(0, limit)
}

export function getUnitsByCategory(category, limit = 5) {
  return allUnits.filter((unit) => unit.category === category).slice(0, limit)
}