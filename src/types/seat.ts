export enum SeatElementType {
  SEAT = 'seat',
  EMPTY = 'empty',
  GALLEY = 'galley',
  LAVATORY = 'lavatory',
  EXIT_DOOR = 'exit_door',
  STAIRS = 'stairs',
  BASSINET = 'bassinet',
}

export interface SeatAvailableService {
  serviceId: string;
  totalAmount: string;
  totalCurrency: string;
}

export interface SeatElement {
  type: SeatElementType | string;
  designator?: string | null; // e.g. "12A", "14F"
  name?: string | null; // e.g. "Extra Legroom Seat"
  disclosures?: string[]; // e.g. ["Extra legroom", "Exit row"]
  availableServices?: SeatAvailableService[];
}

export interface SeatRowSection {
  elements: SeatElement[];
}

export interface SeatRow {
  sections: SeatRowSection[];
}

export interface SeatWings {
  firstRowIndex: number;
  lastRowIndex: number;
}

export interface SeatCabin {
  cabinClass: string;
  deck: number;
  wings?: SeatWings | null;
  rows: SeatRow[];
}

export interface SeatMapResult {
  id: string;
  sliceId: string;
  segmentId: string;
  cabins: SeatCabin[];
}
