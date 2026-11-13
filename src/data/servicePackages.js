/**
 * servicePackages.js
 * Centralized service package and extra services pricing & specifications.
 */

/* Multiplier based on service level milestone */
export const SERVICE_LEVEL_MULTIPLIERS = {
  1: 1.0,  // 1st Service (Baseline break-in inspection)
  2: 1.2,  // 2nd Service (10,000 km)
  3: 1.5,  // 3rd Service (20,000 km major service)
  4: 1.7,  // 4th Service (30,000 km)
  5: 2.0,  // 5th Service (40,000 km heavy service)
  6: 2.3,  // 6th+ Service (50,000+ km extended service)
};

export const SERVICE_LEVELS = [
  {
    num: 1,
    title: '1st Periodic Service',
    badge: '1,000 – 5,000 km',
    desc: 'Initial break-in inspection, safety audit, fluid level top-ups and basic diagnostics.',
  },
  {
    num: 2,
    title: '2nd Periodic Service',
    badge: '10,000 km / 1 Year',
    desc: 'Standard scheduled maintenance including engine fluid replacement, filter checks, and brake tuning.',
  },
  {
    num: 3,
    title: '3rd Periodic Service',
    badge: '20,000 km / 2 Years',
    desc: 'Major milestone service including full systems flush, brake fluid refresh, and OBD-II diagnostics.',
  },
  {
    num: 4,
    title: '4th Periodic Service',
    badge: '30,000 km / 3 Years',
    desc: 'Comprehensive multi-point mechanical inspection, spark/injector testing, and suspension check.',
  },
  {
    num: 5,
    title: '5th Periodic Service',
    badge: '40,000 km / 4 Years',
    desc: 'Heavy lifecycle overhaul, transmission inspection, coolant renewal, and battery load testing.',
  },
  {
    num: 6,
    title: '6th+ Periodic Service',
    badge: '50,000+ km / 5+ Years',
    desc: 'High-mileage fleet preservation, component wear replacements, and intensive endurance diagnostics.',
  },
];

/* Base package definitions (base prices for 1st service level) */
export const SERVICE_PACKAGES = [
  {
    id: 'Aero',
    name: 'Aero Package',
    badge: 'Basic',
    basePrice: 1499,
    subtitle: 'Essential maintenance',
    description: 'Essential fluid inspection and vehicle health checks to keep your fleet in peak condition.',
    features: [
      'Engine oil inspection',
      'Fluid level checks',
      'Tyre pressure inspection',
      'Battery inspection',
      'Basic vehicle health check',
    ],
  },
  {
    id: 'Pro',
    name: 'Pro Package',
    badge: 'Standard',
    popular: true,
    basePrice: 2999,
    subtitle: 'Comprehensive servicing',
    description: 'Includes everything in Aero, plus oil & filter replacement, brake check, and diagnostics.',
    features: [
      'Includes everything in Aero Package',
      'Engine oil and oil filter replacement',
      'Brake inspection',
      'Air filter inspection',
      'AC inspection',
      'General vehicle diagnostics',
    ],
  },
  {
    id: 'Elite',
    name: 'Elite Package',
    badge: 'Premium',
    basePrice: 4999,
    subtitle: 'Flagship full overhaul',
    description: 'Includes everything in Pro, plus full diagnostics, brake servicing, AC cleaning, and priority handling.',
    features: [
      'Includes everything in Pro Package',
      'Comprehensive vehicle diagnostics',
      'Brake servicing',
      'AC servicing and cleaning',
      'Wheel alignment inspection',
      'Complete vehicle health report',
      'Priority service handling',
    ],
  },
];

/* Helper to get price for package at a given service level */
export function getPackagePriceForLevel(basePrice, levelNum) {
  const mult = SERVICE_LEVEL_MULTIPLIERS[levelNum] || 1.0;
  return Math.round(basePrice * mult);
}

export const EXTRA_SERVICES = [
  {
    id: 'car-washing',
    label: 'Car Washing',
    price: 399,
    category: 'Exterior Care',
    desc: 'Exterior pressure foam wash, wheel rim clean, and spotless micro-fibre drying.',
  },
  {
    id: 'interior-cleaning',
    label: 'Interior Deep Cleaning',
    price: 799,
    category: 'Interior Care',
    desc: 'Deep upholstery vacuuming, dashboard sanitization, and carpet cleaning.',
  },
  {
    id: 'ac-gas',
    label: 'AC Gas Refill',
    price: 1499,
    category: 'Climate Control',
    desc: 'Full refrigerant evacuation, leak inspection, and fresh R134a refrigerant charge.',
  },
  {
    id: 'wheel-alignment',
    label: 'Wheel Alignment',
    price: 699,
    category: 'Wheels & Tyres',
    desc: 'High-precision computerised 4-wheel optical laser camber/toe adjustment.',
  },
  {
    id: 'wheel-balancing',
    label: 'Wheel Balancing',
    price: 499,
    category: 'Wheels & Tyres',
    desc: 'High-speed electronic spin balancing with zinc balance weights for all 4 wheels.',
  },
  {
    id: 'battery-test',
    label: 'Battery Health Test',
    price: 299,
    category: 'Electrical',
    desc: 'Load resistance test, terminal anti-corrosion cleaning, and charging alternator audit.',
  },
  {
    id: 'engine-diag',
    label: 'Engine Diagnostics',
    price: 999,
    category: 'Diagnostics',
    desc: 'Full OBD-II ECU telemetry scan, sensor parameter readout, and fault code reset.',
  },
  {
    id: 'brake-pads',
    label: 'Brake Pad Replacement',
    price: 1999,
    category: 'Braking System',
    desc: 'Installation of high-grade ceramic front brake pads and hydraulic rotor testing.',
  },
  {
    id: 'car-sanitization',
    label: 'Car Sanitization',
    price: 499,
    category: 'Hygiene & Interior',
    desc: 'Hospital-grade antimicrobial ozone mist circulation for all cabin vents.',
  },
];

export const TIME_SLOTS = [
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
];
