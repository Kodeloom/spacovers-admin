// Shared constants for the warehouse scanning system

export interface StationMapping {
  [key: string]: string;
}

// Station code mapping - single source of truth
export const STATION_CODES: StationMapping = {
  'O': 'Office',
  'C': 'Cutting',
  'S': 'Sewing',
  'F': 'Foam Cutting',
  'P': 'Packaging'
};

// Reverse mapping for getting codes from station names
export const STATION_NAME_TO_CODE: { [key: string]: string } = {
  'Office': 'O',
  'Cutting': 'C',
  'Sewing': 'S', 
  'Foam Cutting': 'F',
  'Packaging': 'P'
};