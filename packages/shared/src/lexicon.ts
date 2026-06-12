export type LexiconCategory =
  | 'feather_tract'
  | 'molt'
  | 'age_sex'
  | 'capture'
  | 'condition'
  | 'morphometric'
  | 'protocol'
  | 'band'

export interface LexiconEntry {
  term: string
  abbreviation?: string
  aliases?: string[]
  definition: string
  category: LexiconCategory
  seeAlso?: string[]
}

export const LEXICON: LexiconEntry[] = [
  // ── Feather tracts ──────────────────────────────────────────────────────────
  {
    term: 'Primary Coverts',
    abbreviation: 'P Covs',
    definition: 'Row of feathers covering the bases of the primaries. Commonly examined for molt limits because primary coverts are replaced with the primaries they overlie.',
    category: 'feather_tract',
    seeAlso: ['Primaries', 'Molt limits'],
  },
  {
    term: 'Secondary Coverts',
    abbreviation: 'S Covs',
    aliases: ['G Covs', 'Greater Coverts', 'Greater Secondary Coverts'],
    definition: 'The large row of feathers covering the bases of the secondaries. In banding usage "S covs" and "G covs" (greater coverts) are synonyms — both refer to the greater secondary coverts. A key tract for detecting molt limits.',
    category: 'feather_tract',
    seeAlso: ['Secondaries', 'Molt limits'],
  },
  {
    term: 'Alula',
    definition: 'Small group of feathers attached to the first digit (thumb) of the wing. An accessory wing tract examined for molt limits, especially in species that replace it independently.',
    category: 'feather_tract',
    seeAlso: ['Molt limits'],
  },
  {
    term: 'Primaries',
    abbreviation: 'PP',
    definition: 'The main flight feathers attached to the "hand" bones of the wing; numbered P1 (innermost) through P10. Replaced sequentially during primary molt.',
    category: 'feather_tract',
    seeAlso: ['Primary Coverts', 'FF Molt'],
  },
  {
    term: 'Secondaries',
    abbreviation: 'SS',
    definition: 'Flight feathers attached to the "forearm" (ulna) of the wing. Replaced in a complex sequence during molt.',
    category: 'feather_tract',
    seeAlso: ['Secondary Coverts', 'FF Molt'],
  },
  {
    term: 'Tertials',
    abbreviation: 'Tert',
    definition: 'The innermost secondary feathers (typically 3), attached to the humerus ("upper arm"). Often treated as a separate tract because they may be replaced on a different schedule than the rest of the secondaries.',
    category: 'feather_tract',
    seeAlso: ['Secondaries', 'Molt limits'],
  },
  {
    term: 'Rectrices',
    abbreviation: 'Rec',
    definition: 'The tail feathers; numbered R1 (central pair) through R6 outward on each side. Molt sequence and limit detection are used to age some species.',
    category: 'feather_tract',
    seeAlso: ['TF Molt'],
  },

  // ── Molt ────────────────────────────────────────────────────────────────────
  {
    term: 'Molt limits',
    definition: 'Boundaries within a feather tract where feathers of different generations (and thus different ages and wear) meet. The presence and pattern of molt limits is a primary aging criterion in the Pyle guide.',
    category: 'molt',
    seeAlso: ['WRP', 'Primary Coverts', 'Secondary Coverts'],
  },
  {
    term: 'WRP',
    definition: 'Wolfe-Ryder-Pyle system. A standardized coding system for describing a bird\'s molt cycle and resultant plumage using short codes (e.g., FCF = First Cycle Formative, DPB = Definitive Prebasic). Replaces the older HY/AHY cycle-based terminology for detailed molt assessment.',
    category: 'molt',
    seeAlso: ['Molt limits'],
  },
  {
    term: 'Body Molt',
    definition: 'Active replacement of body (contour) feathers, scored 0–4 (0 = none, 4 = very heavy). Distinct from flight-feather molt.',
    category: 'molt',
    seeAlso: ['FF Molt'],
  },
  {
    term: 'FF Molt',
    definition: 'Flight Feather Molt. Active replacement of primaries or secondaries; coded N (none), S (symmetrical), A (asymmetrical), J (juvenile growth).',
    category: 'molt',
    seeAlso: ['Primaries', 'Secondaries', 'TF Molt'],
  },
  {
    term: 'TF Molt',
    definition: 'Tail Feather Molt. Active replacement of rectrices; same N/S/A/J scale as FF Molt.',
    category: 'molt',
    seeAlso: ['Rectrices', 'FF Molt'],
  },
  {
    term: 'FF Wear',
    definition: 'Flight Feather Wear. Degree of abrasion on flight feathers; scored 0 (none) through 5 (excessive). Heavily worn feathers appear frayed and faded.',
    category: 'molt',
    seeAlso: ['Primaries', 'Secondaries'],
  },
  {
    term: 'Juvenile Body Plumage',
    abbreviation: 'Juv Body Plum',
    definition: 'Proportion of retained juvenal body plumage; scored 0 (none remaining) through 3 (heavy retention). Juvenal body feathers are typically replaced in the first preformative molt.',
    category: 'molt',
  },

  // ── Age / Sex ────────────────────────────────────────────────────────────────
  {
    term: 'Hatch Year',
    abbreviation: 'HY',
    definition: 'Bird hatched in the current calendar year. In BBL numeric coding, age code 2.',
    category: 'age_sex',
    seeAlso: ['After Hatch Year', 'Skull ossification'],
  },
  {
    term: 'After Hatch Year',
    abbreviation: 'AHY',
    definition: 'Bird hatched before the current calendar year; at least 1 year old. In BBL numeric coding, age code 1.',
    category: 'age_sex',
    seeAlso: ['Hatch Year', 'Second Year'],
  },
  {
    term: 'Second Year',
    abbreviation: 'SY',
    definition: 'Bird in its second calendar year — hatched last year. In BBL numeric coding, age code 5.',
    category: 'age_sex',
    seeAlso: ['After Second Year', 'After Hatch Year'],
  },
  {
    term: 'After Second Year',
    abbreviation: 'ASY',
    definition: 'Bird beyond its second calendar year; hatched 2+ years ago. In BBL numeric coding, age code 6.',
    category: 'age_sex',
  },
  {
    term: 'Third Year',
    abbreviation: 'TY',
    definition: 'Bird in its third calendar year — hatched 2 years ago. In BBL numeric coding, age code 7.',
    category: 'age_sex',
  },
  {
    term: 'After Third Year',
    abbreviation: 'ATY',
    definition: 'Bird beyond its third calendar year; hatched 3+ years ago. In BBL numeric coding, age code 8.',
    category: 'age_sex',
  },
  {
    term: 'Local',
    abbreviation: 'L',
    definition: 'Recently fledged bird unable to sustain flight; captured near the nest. In BBL numeric coding, age code 4.',
    category: 'age_sex',
  },

  // ── Condition ────────────────────────────────────────────────────────────────
  {
    term: 'Skull ossification',
    abbreviation: 'Skull',
    definition: 'Process by which the inner layer of the skull becomes pneumatized (filled with bony struts). An unossified (single-layered) skull indicates a bird hatched in the current year. Scored 0–8: 0 = no skull visible, 6 = fully complete, 8 = invisible.',
    category: 'condition',
    seeAlso: ['Hatch Year'],
  },
  {
    term: 'Brood Patch',
    abbreviation: 'BP',
    definition: 'Defeathered, thickened, and vascularized area of abdominal skin used to incubate eggs. Indicates breeding females (and some males). Scored 0 (none) through 5 (feathered/regressing).',
    category: 'condition',
    seeAlso: ['Cloacal Protuberance'],
  },
  {
    term: 'Cloacal Protuberance',
    abbreviation: 'CP',
    definition: 'Enlarged, rounded protrusion of the cloaca in breeding males, caused by accumulation of seminal fluid. Scored 0 (none) through 3 (large).',
    category: 'condition',
    seeAlso: ['Brood Patch'],
  },
  {
    term: 'Fat',
    definition: 'Subcutaneous fat deposits visible at the furculum (wishbone notch) and abdomen. Scored 0 (none) through 7 (very excessive). An important indicator of migration readiness.',
    category: 'condition',
  },
  {
    term: 'Feather pull',
    definition: 'Indicates whether a feather was collected from this bird for isotope analysis, genetic sampling, or other lab use.',
    category: 'condition',
  },

  // ── Capture codes ────────────────────────────────────────────────────────────
  {
    term: 'BBP Code',
    aliases: ['Capture status', 'How obtained'],
    definition: 'IBP/MAPS capture status code recorded on the banding sheet. Key values: 1 = new band, U = unbanded, R = recapture (same station), F = foreign recapture, D = band destroyed, L = band lost.',
    category: 'capture',
    seeAlso: ['MAPS', 'BBL'],
  },
  {
    term: 'Recapture',
    abbreviation: 'R',
    definition: 'A previously banded bird captured again at the same station. Triggers recapture-specific fields (present condition, replaced band number).',
    category: 'capture',
    seeAlso: ['Foreign recapture', 'BBP Code'],
  },
  {
    term: 'Foreign recapture',
    abbreviation: 'F',
    definition: 'A bird originally banded at a different station. The band number identifies the banding origin.',
    category: 'capture',
    seeAlso: ['Recapture', 'BBL'],
  },

  // ── Protocol ─────────────────────────────────────────────────────────────────
  {
    term: 'MAPS',
    definition: 'Monitoring Avian Productivity and Survivorship. A standardized long-term banding protocol developed by IBP. Stations operate fixed mist-net arrays during 10 defined sampling periods across the breeding season.',
    category: 'protocol',
    seeAlso: ['IBP', 'MAPS period'],
  },
  {
    term: 'IBP',
    definition: 'Institute for Bird Populations. The organization that developed the MAPS protocol, publishes banding guidelines (including the Pyle guide), and provides station support.',
    category: 'protocol',
    seeAlso: ['MAPS', 'BBL'],
  },
  {
    term: 'BBL',
    definition: 'Bird Banding Laboratory. USGS program that issues banding permits, assigns band numbers, and maintains the North American bird banding database. Banders submit data to BBL annually.',
    category: 'protocol',
    seeAlso: ['MAPS', 'IBP'],
  },
  {
    term: 'MAPS period',
    definition: 'One of 10 defined sampling windows within the MAPS breeding season. Each period is approximately 1 week long; stations must operate at least 6 of the 10 periods to count as a valid station-year.',
    category: 'protocol',
    seeAlso: ['MAPS'],
  },

  // ── Morphometrics ────────────────────────────────────────────────────────────
  {
    term: 'Wing chord',
    aliases: ['Wing'],
    definition: 'Length of the folded wing from the bend of the wrist (carpal joint) to the tip of the longest primary, measured in mm with a ruler. A standard size measurement for most banding programs.',
    category: 'morphometric',
  },
  {
    term: 'Exposed culmen',
    definition: 'Length of the bill from the base of the feathering on the culmen (top of the bill) to the tip, measured in mm with calipers.',
    category: 'morphometric',
  },
  {
    term: 'Tarsus',
    definition: 'Length of the tarsometatarsus (the main lower-leg bone), measured in mm with calipers. Used as a structural body-size index.',
    category: 'morphometric',
  },
  {
    term: 'Tail length',
    definition: 'Distance from the point of insertion of the central rectrices to the tip of the longest rectrix, measured in mm.',
    category: 'morphometric',
    seeAlso: ['Rectrices'],
  },
  {
    term: 'Body mass',
    aliases: ['Weight'],
    definition: 'Mass of the bird in grams, measured with a balance or digital scale. Combined with fat score, it indicates condition and migration readiness.',
    category: 'morphometric',
    seeAlso: ['Fat'],
  },

  // ── Band ─────────────────────────────────────────────────────────────────────
  {
    term: 'Band size',
    definition: 'BBL standardized size code (e.g., 0, 0A, 1, 1B, 3, 7A) indicating band diameter. Must match the leg circumference of the species being banded. Sizes are assigned species-by-species in BBL publications.',
    category: 'band',
    seeAlso: ['BBL'],
  },
  {
    term: 'Band type',
    definition: 'Physical construction of the band. Standard aluminum (most common), stainless-steel (larger/longer-lived birds), 4-short (short-tarsus species), or lock-on (raptors, shorebirds).',
    category: 'band',
  },
]
