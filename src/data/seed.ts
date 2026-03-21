// Centralized seed/default data for the app.
// Swap this file for an empty config to start fresh.

import type { Location, Net } from '../types'

export const SEED_LOCATIONS: Omit<Location, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'loc-gcbs',
    banderLocationId: 'GCBS',
    bblLocationId: null,
    name: 'Galindo Creek Banding Station',
    latitude: 37.9365,
    longitude: -122.0855,
    country: 'US',
    stateProvince: 'CA',
    remarks: '',
  },
  {
    id: 'loc-mcfs',
    banderLocationId: 'MCFS',
    bblLocationId: null,
    name: 'Mitchell Canyon Field Station',
    latitude: 37.9218,
    longitude: -121.9414,
    country: 'US',
    stateProvince: 'CA',
    remarks: '',
  },
]

export const SEED_NETS: Omit<Net, 'createdAt' | 'updatedAt'>[] = [
  // GCBS nets (from banding log book: nets visible in data)
  { id: 'net-gcbs-1', locationId: 'loc-gcbs', label: '1' },
  { id: 'net-gcbs-2', locationId: 'loc-gcbs', label: '2' },
  { id: 'net-gcbs-3', locationId: 'loc-gcbs', label: '3' },
  { id: 'net-gcbs-4', locationId: 'loc-gcbs', label: '4' },
  { id: 'net-gcbs-5', locationId: 'loc-gcbs', label: '5' },
  { id: 'net-gcbs-6', locationId: 'loc-gcbs', label: '6' },
  { id: 'net-gcbs-7', locationId: 'loc-gcbs', label: '7' },
  { id: 'net-gcbs-8', locationId: 'loc-gcbs', label: '8' },
  { id: 'net-gcbs-9', locationId: 'loc-gcbs', label: '9' },
  { id: 'net-gcbs-10', locationId: 'loc-gcbs', label: '10' },
]
