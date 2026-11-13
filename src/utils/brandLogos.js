/**
 * brandLogos.js — Centralized brand → logo mapping utility.
 *
 * Covers every brand in the Indian car dataset CSV plus the full
 * brand-logos-main library.  All normalisation lives here so that
 * individual UI components stay clean.
 *
 * Logo files live in /public/brand-logos-main/
 * Usage:
 *   import { getLogoPath, normalizeBrand } from '../utils/brandLogos';
 *   const src = getLogoPath('Maruti Suzuki'); // '/brand-logos-main/maruti-logo.svg'
 */

const BASE = '/brand-logos-main/';

/**
 * Raw mapping: exact key → filename (as it appears in brands.json + extras for
 * the Indian dataset's naming quirks).
 */
const RAW_MAP = {
  // ── Indian dataset brands (CSV) ──────────────────────────────────────
  'Maruti Suzuki':  'maruti-logo.svg',
  'Maruti':         'maruti-logo.svg',
  'Suzuki':         'suzuki-logo.svg',
  'Mercedes':       'mercedes-benz-logo.svg',
  'Mercedes Benz':  'mercedes-benz-logo.svg',
  'Mercedes-Benz':  'mercedes-benz-logo.svg',
  'Force':          null,                        // no logo available
  'BYD':            'byd-logo.svg',
  'MG':             'mg-logo.png',
  'Tata':           'tata-logo.png',
  'Mahindra':       'mahindra-logo.png',
  'Hyundai':        'hyundai-logo.svg',
  'Kia':            'kia-logo.svg',
  'Toyota':         'toyota-logo.svg',
  'Honda':          'honda-logo.png',
  'Nissan':         'nissan-logo.svg',
  'Renault':        'renault-logo.svg',
  'Volkswagen':     'volkswagen-logo.svg',
  'Skoda':          'skoda-logo.svg',
  'Audi':           'audi-logo.svg',
  'BMW':            'bmw-logo.svg',
  'Jeep':           'jeep-logo.svg',
  'Citroen':        'citroen-logo.svg',
  'Citroën':        'citroen-logo.svg',
  'Lexus':          'lexus-logo.png',
  // ── Full library brands (brands.json) ────────────────────────────────
  'AITO':           'aito-logo.svg',
  'Abarth':         'abarth-logo.svg',
  'Acura':          'acura-logo.svg',
  'Aion':           'aion-logo.svg',
  'Aiways':         'aiways-logo.svg',
  'Aixam':          'aixam-logo.svg',
  'Alfa Romeo':     'alfa-romeo-logo.svg',
  'Alpina':         'alpina-logo.svg',
  'Alpine':         'alpine-logo.svg',
  'Ariel':          'ariel-logo.svg',
  'Aro':            'aro-logo.svg',
  'Aston Martin':   'aston-martin-logo.svg',
  'Austin':         'austin-logo.svg',
  'Autobianchi':    'autobianchi-logo.svg',
  'Avatr':          'avatr-logo.svg',
  'BAC':            'bac-logo.svg',
  'BAIC':           'baic-logo.svg',
  'BAW':            'baw-logo.svg',
  'Bentley':        'bentley-logo.svg',
  'Bertone':        'bertone-logo.svg',
  'Bollinger':      'bollinger-logo.svg',
  'Brabham':        'brabham-logo.svg',
  'Brilliance':     'brilliance-logo.png',
  'Bugatti':        'bugatti-logo.svg',
  'Buick':          'buick-logo.png',
  'Cadillac':       'cadillac-logo.png',
  'Callaway':       'callaway-logo.svg',
  'Caterham':       'caterham-logo.svg',
  'ChangAn':        'changan-logo.png',
  'Changan':        'changan-logo.png',
  'Chery':          'chery-logo.png',
  'Chevrolet':      'chevrolet-logo.png',
  'Chrysler':       'chrysler-logo.svg',
  'Cupra':          'cupra-logo.svg',
  'DFSK':           'dfsk-logo.svg',
  'DS':             'ds-logo.svg',
  'Dacia':          'dacia-logo.svg',
  'Dadi':           'dadi-logo.svg',
  'Daewoo':         'daewoo-logo.png',
  'Daihatsu':       'daihatsu-logo.svg',
  'Daimler':        'daimler-logo.svg',
  'Datsun':         'datsun-logo.png',
  'De Lorean':      'de-lorean-logo.svg',
  'DeLorean':       'de-lorean-logo.svg',
  'De Tomaso':      'de-tomaso-logo.png',
  'DeSoto':         'desoto-logo.png',
  'Deepal':         'deepal-logo.svg',
  'Denza':          'denza-logo.svg',
  'Dodge':          'dodge-logo.png',
  'DongFeng':       'dongfeng-logo.png',
  'EMC':            'emc-logo.svg',
  'EVO':            'evo-logo.svg',
  'FAW':            'faw-logo.svg',
  'Ferrari':        'ferrari-logo.svg',
  'Fiat':           'fiat-logo.svg',
  'Fisker':         'fisker-logo.png',
  'Ford':           'ford-logo.png',
  'GAZ':            'gaz-logo.png',
  'GMC':            'gmc-logo.png',
  'Geely':          'geely-logo.svg',
  'Genesis':        'genesis-logo.svg',
  'Geo':            'geo-logo.svg',
  'Geometry':       'geometry-logo.svg',
  'Ginetta':        'ginetta-logo.svg',
  'Great Wall':     'great-wall-logo.png',
  'Haval':          'haval-logo.png',
  'Hennessey':      'hennessey-logo.svg',
  'Hispano Suiza':  'hispano-suiza-logo.png',
  'Holden':         'holden-logo.svg',
  'Hongqi':         'hongqi-logo.png',
  'Hummer':         'hummer-logo.svg',
  'ICH-X':          'ich-x-logo.svg',
  'IMSA':           'imsa-logo.svg',
  'INEOS':          'ineos-logo.svg',
  'Infiniti':       'infiniti-logo.svg',
  'Invicta':        'invicta-logo.svg',
  'Isdera':         'isdera-logo.svg',
  'Isuzu':          'isuzu-logo.svg',
  'JAC':            'jac-logo.png',
  'Jaecoo':         'jaecoo-logo.svg',
  'Jaguar':         'jaguar-logo.svg',
  'Jetour':         'jetour-logo.svg',
  'KGM':            'kgm-logo.svg',
  'Karma':          'karma-logo.png',
  'Koenigsegg':     'koenigsegg-logo.svg',
  'Lada':           'lada-logo.svg',
  'Lamborghini':    'lamborghini-logo.png',
  'Lancia':         'lancia-logo.png',
  'Land Rover':     'land-rover-logo.svg',
  'Leapmotor':      'leapmotor-logo.png',
  'Ligier':         'ligier-logo.png',
  'Lincoln':        'lincoln-logo.svg',
  'Lister':         'lister-logo.png',
  'Lotus':          'lotus-logo.svg',
  'Lucid':          'lucid-logo.png',
  'Maserati':       'maserati-logo.png',
  'Maxus':          'maxus-logo.png',
  'Maybach':        'maybach-logo.png',
  'Mazda':          'mazda-logo.svg',
  'McLaren':        'mclaren-logo.svg',
  'Mercury':        'mercury-logo.png',
  'Mini':           'mini-logo.svg',
  'MINI':           'mini-logo.svg',
  'Mitsubishi':     'mitsubishi-logo.svg',
  'Mitsuoka':       'mitsuoka-logo.png',
  'Morgan':         'morgan-logo.png',
  'Morris':         'morris-logo.png',
  'NIO':            'nio-logo.png',
  'Noble':          'noble-logo.png',
  'ORA':            'ora-logo.png',
  'Oldsmobile':     'oldsmobile-logo.png',
  'Omoda':          'omoda-logo.png',
  'Opel':           'opel-logo.svg',
  'PUCH':           'puch-logo.svg',
  'Pagani':         'pagani-logo.png',
  'Perodua':        'perodua-logo.png',
  'Peugeot':        'peugeot-logo.svg',
  'Pininfarina':    'pininfarina-logo.png',
  'Plymouth':       'plymouth-logo.png',
  'Polaris':        'polaris-logo.png',
  'Polestar':       'polestar-logo.png',
  'Pontiac':        'pontiac-logo.png',
  'Porsche':        'porsche-logo.svg',
  'Praga':          'praga-logo.png',
  'Proton':         'proton-logo.png',
  'Puma':           'puma-logo.png',
  'RAM':            'ram-logo.svg',
  'RUF':            'ruf-logo.png',
  'Reliant':        'reliant-logo.png',
  'Rimac':          'rimac-logo.png',
  'Rivian':         'rivian-logo.svg',
  'Rolls-Royce':    'rolls-royce-logo.svg',
  'Rolls Royce':    'rolls-royce-logo.svg',
  'Rover':          'rover-logo.png',
  'SCG':            'scg-logo.png',
  'SWM':            'swm-logo.png',
  'Saab':           'saab-logo.png',
  'Saleen':         'saleen-logo.png',
  'Saturn':         'saturn-logo.png',
  'Scion':          'scion-logo.png',
  'Seat':           'seat-logo.svg',
  'SEAT':           'seat-logo.svg',
  'Seres':          'seres-logo.png',
  'Smart':          'smart-logo.png',
  'SsangYong':      'ssangyong-logo.png',
  'Ssangyong':      'ssangyong-logo.png',
  'Subaru':         'subaru-logo.png',
  'TVR':            'tvr-logo.png',
  'Talbot':         'talbot-logo.png',
  'Tatra':          'tatra-logo.png',
  'Tesla':          'tesla-logo.svg',
  'Togg':           'togg-logo.svg',
  'Trabant':        'trabant-logo.svg',
  'UAZ':            'uaz-logo.png',
  'Vauxhall':       'vauxhall-logo.png',
  'Venturi':        'venturi-logo.png',
  'VinFast':        'vinfast-logo.png',
  'Volvo':          'volvo-logo.svg',
  'W Motors':       'w-motors-logo.png',
  'Wartburg':       'wartburg-logo.png',
  'Westfield':      'westfield-logo.png',
  'XPENG':          'xpeng-logo.png',
  'Xpeng':          'xpeng-logo.png',
  'Xiaomi':         'xiaomi-logo.svg',
  'Yangwang':       'yangwang-logo.svg',
  'ZAZ':            'zaz-logo.png',
  'Zeekr':          'zeekr-logo.png',
  'Zenvo':          'zenvo-logo.png',
  'Zotye':          'zotye-logo.png',
  'e.GO':           'ego-logo.svg',
  'iCAR':           'icar-logo.svg',
};

/**
 * Normalise a brand name from any source (CSV, DB, user input) to a
 * consistent lookup key.  Returns the original string if no alias found.
 */
export function normalizeBrand(brand) {
  if (!brand) return '';
  const trimmed = brand.trim();

  // Direct hit
  if (RAW_MAP[trimmed] !== undefined) return trimmed;

  // Case-insensitive scan
  const lower = trimmed.toLowerCase();
  const found = Object.keys(RAW_MAP).find(k => k.toLowerCase() === lower);
  if (found) return found;

  // Partial / fuzzy: check if input starts with or contains a known key
  const partial = Object.keys(RAW_MAP).find(k =>
    lower.startsWith(k.toLowerCase()) || k.toLowerCase().startsWith(lower)
  );
  return partial || trimmed;
}

/**
 * Returns the absolute public path to the brand's logo image.
 * Returns null if no logo is mapped (use a fallback icon in the component).
 *
 * @param {string} brand  — raw brand string from DB / CSV / user input
 * @returns {string|null}
 */
export function getLogoPath(brand) {
  if (!brand) return null;
  const key = normalizeBrand(brand);
  const file = RAW_MAP[key];
  if (!file) return null;
  return `${BASE}${file}`;
}

/**
 * Returns display-friendly brand name (cleaned up).
 * e.g. "Maruti Suzuki" stays "Maruti Suzuki", "Mercedes" → "Mercedes-Benz"
 */
export function getFriendlyBrandName(brand) {
  if (!brand) return '';
  const aliases = {
    'Mercedes':      'Mercedes-Benz',
    'Mercedes Benz': 'Mercedes-Benz',
    'Maruti':        'Maruti Suzuki',
  };
  return aliases[brand.trim()] || brand.trim();
}
