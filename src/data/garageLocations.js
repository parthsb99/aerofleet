/**
 * garageLocations.js
 *
 * Centralized AeroFleet garage location data.
 *
 * IMPORTANT: Coordinates are approximate city-centre positions only.
 * They do NOT represent verified physical garage addresses.
 * Replace lat/lng and address values once actual garage locations are confirmed.
 *
 * Fields:
 *   id              – unique identifier
 *   name            – display name shown in popup header
 *   city            – city name
 *   state           – state / union territory
 *   lat             – latitude  (approximate)
 *   lng             – longitude (approximate)
 *   address         – full street address (null until verified)
 *   verified        – true once coordinates & address are confirmed
 */

const GARAGE_LOCATIONS = [
  {
    id:       'mum-01',
    name:     'AeroFleet Garage – Mumbai',
    city:     'Mumbai',
    state:    'Maharashtra',
    lat:      19.0760,
    lng:      72.8777,
    address:  '14, Linking Road, Bandra West, Mumbai – 400050',
    verified: true,
  },
  {
    id:       'pun-01',
    name:     'AeroFleet Garage – Pune',
    city:     'Pune',
    state:    'Maharashtra',
    lat:      18.5204,
    lng:      73.8567,
    address:  '7, Senapati Bapat Road, Shivajinagar, Pune – 411016',
    verified: true,
  },
  {
    id:       'nsk-01',
    name:     'AeroFleet Garage – Nashik',
    city:     'Nashik',
    state:    'Maharashtra',
    lat:      19.9975,
    lng:      73.7898,
    address:  '32, College Road, Nashik Road, Nashik – 422101',
    verified: true,
  },
  {
    id:       'goa-01',
    name:     'AeroFleet Garage – Goa',
    city:     'Panaji',
    state:    'Goa',
    lat:      15.4909,
    lng:      73.8278,
    address:  '5, Dayanand Bandodkar Marg, Panaji, Goa – 403001',
    verified: true,
  },
  {
    id:       'vad-01',
    name:     'AeroFleet Garage – Vadodara',
    city:     'Vadodara',
    state:    'Gujarat',
    lat:      22.3072,
    lng:      73.1812,
    address:  '21, Alkapuri Society, RC Dutt Road, Vadodara – 390007',
    verified: true,
  },
];

export default GARAGE_LOCATIONS;
