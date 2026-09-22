export type Category = 'eat' | 'nature' | 'water' | 'culture' | 'wellness' | 'town';

export type Area =
  | 'punta-uva'
  | 'cocles'
  | 'playa-chiquita'
  | 'puerto-viejo'
  | 'hone-creek-bribri'
  | 'cahuita'
  | 'manzanillo';

export type TimeOfDay = 'early' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'any';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** ["08:00","16:00"], null = closed that day, missing key = hours unknown. */
export type HoursRange = [string, string] | null;

export type Hours = Partial<Record<Weekday, HoursRange>>;

export interface Booking {
  method: string;
  phone?: string;
  whatsapp?: string;
  url?: string;
  email?: string;
}

export interface Activity {
  id: string;
  name: string;
  category: Category;
  area: Area;
  lat: number;
  lng: number;
  description: string;
  highlights: string[];
  notes?: string;
  hours: Hours;
  price?: string;
  duration?: string;
  timeOfDay: TimeOfDay[];
  /** ISO dates this fits; empty = any day. */
  bestDays: string[];
  requiresBooking: boolean;
  bookingLeadTime?: string;
  booking?: Booking;
  website?: string;
  tags: string[];
  pairsWith?: string[];
  alternatives?: string[];
}

export type LodgingId = 'dragonfly' | 'congo-bongo';

export interface Anchor {
  time: string;
  title: string;
  note?: string;
  phone?: string;
  whatsapp?: string;
}

export interface OptionSet {
  name: string;
  blurb: string;
  activityIds: string[];
}

export interface Day {
  date: string;
  lodgingId: LodgingId;
  anchors: Anchor[];
  optionSets: OptionSet[];
  warnings?: string[];
}

export const CATEGORIES: Category[] = ['eat', 'nature', 'water', 'culture', 'wellness', 'town'];

export const CATEGORY_LABEL: Record<Category, string> = {
  eat: 'Eat',
  nature: 'Nature',
  water: 'Water',
  culture: 'Culture',
  wellness: 'Wellness',
  town: 'Town',
};

export const AREAS: Area[] = [
  'punta-uva',
  'cocles',
  'playa-chiquita',
  'puerto-viejo',
  'hone-creek-bribri',
  'cahuita',
  'manzanillo',
];

export const AREA_LABEL: Record<Area, string> = {
  'punta-uva': 'Punta Uva',
  cocles: 'Cocles',
  'playa-chiquita': 'Playa Chiquita',
  'puerto-viejo': 'Puerto Viejo',
  'hone-creek-bribri': 'Hone Creek / Bribri',
  cahuita: 'Cahuita',
  manzanillo: 'Manzanillo',
};

export const TIME_OF_DAY_ORDER: Record<TimeOfDay, number> = {
  early: 0,
  morning: 1,
  midday: 2,
  afternoon: 3,
  evening: 4,
  any: 5,
};

export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};
