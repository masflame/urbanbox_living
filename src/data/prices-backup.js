/**
 * PRICES BACKUP — Created 2026-05-28
 *
 * This file preserves the original scraped/listed prices before the
 * BASE_SHELL_PRICE_FACTOR (27% reduction) was applied in unitsCatalog.js.
 *
 * ── HOW TO REVERT ────────────────────────────────────────────────────────
 * In src/data/unitsCatalog.js, find:
 *   const BASE_SHELL_PRICE_FACTOR = 0.73
 * and change it to:
 *   const BASE_SHELL_PRICE_FACTOR = 1.0
 * That restores every catalog listing to its original scraped price.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * NOTE: Premium-tier collections (UnitsA, UnitsG, UnitsP, UnitsS, UnitsU,
 * UnitsV, UnitsX, UnitsZZZ) are NOT affected by BASE_SHELL_PRICE_FACTOR and
 * continue to show their original prices unchanged.
 *
 * ORIGINAL PRICES — Basic-tier container collections (affected by factor)
 * ─────────────────────────────────────────────────────────────────────────
 * Collection     | Representative product                             | Original price (scraped)
 * UnitsB         | 2 Bedroom Refurbished Shipping Container Home      | R 141,750.00 excl. VAT  (R 163,012.50 incl. VAT)
 * UnitsC         | Custom 20ft Cozy Cabin Container House             | R87 999,00
 * UnitsD         | High Quality 20ft Prefab Shipping Container House  | R 488,000.00
 * UnitsE         | 20ft Office Refurbished Shipping Container         | R 49,500.00 excl. VAT  (R 56,925.00 incl. VAT)
 * UnitsF-Pools   | 12M / 40ft Portable Container Swimming Pool        | R 76,185.00 excl. VAT  (R 87,612.75 incl. VAT)
 * UnitsH         | Customized 40ft Shipping Container 1 Bedroom       | R 145 600,00
 * UnitsI         | Custom 20ft Shipping Container Home with Water Tank| R 93 699,00
 * UnitsJ         | Custom 20ft Cozy Cabin Container House             | R 87 999,00
 * UnitsK-Toilet  | 1+1 Double Mains Toilet 8ft×5ft                   | R 33,490.00
 * UnitsL         | Modified 20ft Container Office with Glass Door & AC| R 80,810.00
 * UnitsM         | 1 Bedroom Portable Cabin with Verandah             | R 89,100.00 excl. VAT  (R 102,465.00 incl. VAT)
 * UnitsN         | Custom 20ft Shipping Container Home with Water Tank| R 110,440.00
 * UnitsO         | 20ft Expandable Container House                    | $6,999 USD (~R 131,231 ZAR at 18.75 rate)
 * UnitsQ         | Apple Cabin D1                                     | $12,000 USD (~R 225,000 ZAR)
 * UnitsR         | 40ft Expandable Container House                    | $13,000 USD (~R 243,750 ZAR)
 * UnitsT         | 40ft Prefab Container Tiny House                   | $3,300 USD (~R 61,875 ZAR)
 * UnitsZ         | Contemporary 12m Luxury Studio                    | ZAR 165,000
 * UnitsZZ        | Modern Modular 1 or 2 Bedroom Container Homes      | ZAR 495,000
 *
 * ORIGINAL PRICES — Premium-tier collections (NOT affected, listed for reference)
 * ─────────────────────────────────────────────────────────────────────────
 * UnitsG         | 40ft Prefab Container (easy-fold sandwich panels)  | R 88,820.00  [Premium tier — unchanged]
 * UnitsS         | Modern A-Frame Prefab House                        | $21,000 USD  [Premium tier — unchanged]
 * UnitsX         | Sophisticated Modern Micro-Home w/ Deck & Braai    | ZAR 450,000  [Premium tier — unchanged]
 * UnitsZZZ       | Elite Expandable 2-Bedroom Home                    | ZAR 415,000  [Premium tier — unchanged]
 *
 * UnitsU (Elevation Park Models — FOLDER_OVERRIDES in unitsCatalog.js):
 *   3 Series Park Model        ZAR 685,000
 *   5 Series Park Model        ZAR 845,000
 *   7 Series Park Model        ZAR 1,045,000
 *
 * UnitsV (Prestige Homeseeker — FOLDER_OVERRIDES in unitsCatalog.js):
 *   Residential park homes:
 *     Avanti                   ZAR 1,395,000
 *     Residence                ZAR 1,695,000
 *     Majestic                 ZAR 1,985,000
 *   Holiday lodges:
 *     Skylark                  ZAR 895,000
 *     Aura                     ZAR 1,045,000
 *     Dryft                    ZAR 1,165,000
 *     Foresters Lodge          ZAR 1,245,000
 *     Bella Vista              ZAR 1,345,000
 *     Hampton                  ZAR 1,445,000
 *     Plantation House         ZAR 1,595,000
 *     Casa di Lusso            ZAR 1,795,000
 *     Glass House              ZAR 1,875,000
 *     Tempest                  ZAR 1,945,000
 *   Heritage / Legacy ranges:
 *     Heritage Park Home       ZAR 945,000
 *     Heritage Residential     ZAR 1,095,000
 *     Heritage Holiday Lodge   ZAR 795,000
 */

// This file is documentation only — it is not imported by any source file.
export default {}
