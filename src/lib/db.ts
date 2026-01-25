import Dexie, { type Table } from 'dexie';

// 1. Member (Updated with subunit & role)
export interface Member {
  id: string;
  unit_id: string;
  full_name: string;
  category: string;
  // --- NEW FIELDS ---
  subunit_id?: number;
  role_in_unit?: string; // 'unit_head', 'subunit_head', 'member'
  // ------------------
  image_url?: string;
  email?: string;
  phone_number?: string;
  whatsapp_number?: string;
  telegram_number?: string;
  gender?: string;
  dob?: string;
  nationality?: string;
  state_of_origin?: string;
  marital_status?: string;
  spouse_name?: string;
  wedding_anniversary?: string;
  is_born_again?: boolean;
  is_spirit_filled?: boolean;
  previous_church?: string;
  joined_clc?: string;
  joined_workforce?: string;
  attended_membership_class?: boolean;
  completed_ces?: boolean;
  ces_completion_date?: string;
  occupation?: string | null;
  workplace_address?: string;
  workplace_location?: string;
  institution?: string;
  course_of_study?: string;
  level_of_study?: string;
  degree_type?: string;
  residential_address?: string;
  permanent_address?: string;
  permanent_state?: string;
  country_outside_nigeria?: string;
  parent_name?: string;
  parent_address?: string;
  parent_phone?: string;
  relatives_in_clc?: string;
  hobbies?: string;
  social_media?: string;
  medical_conditions?: string;
  medical_details?: string;
  synced?: boolean;
  updated_at?: string;
  employment_status?: string[] | null;
  nysc_status?: string | null;
}

// 2. Unit Metadata (NEW)
export interface UnitProfile {
  id: string; // matches unit_id
  name: string;
  pastor_name?: string;
  unit_head_id?: string; // member_id of the head
  description?: string;
  synced?: number;
}

// 3. Subunit (NEW)
export interface Subunit {
  id?: number;
  unit_id: string;
  name: string;
  synced?: number;
}

// 4. Attendance
export interface LocalAttendance {
  id?: number;
  member_id: string;
  unit_id: string;
  event_id: string;
  event_date: string;
  status: 'present' | 'absent';
  reason?: string;
  synced: number;
}

// 5. Inventory
export interface InventoryItem {
  id?: number;
  unit_id: string;
  item_name: string;
  condition: 'new' | 'good' | 'fair' | 'faulty' | 'scrapped';
  quantity: number;
  date_purchased?: string;
  notes?: string;
  location?: string;
  image_url?: string;
  synced?: number;
}

// 6. Finances
export interface FinanceItem {
  id?: number;
  unit_id: string;
  type: 'income' | 'expense';
  title: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  status: 'approved';
  synced?: number;
}

// 7. Budget Requests
export interface BudgetRequest {
  id?: number;
  unit_id: string;
  title: string;
  amount: number;
  description?: string;
  request_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  admin_comment?: string;
  synced?: number;
}

// 8. Performance
export interface PerformanceReview {
  id?: number;
  unit_id: string;
  member_id: string;
  rating_punctuality: number;
  rating_availability: number;
  rating_skill: number;
  rating_teamwork: number;
  rating_spiritual: number;
  comment?: string;
  review_date: string;
  synced?: number;
}

// 9. Souls Won
export interface SoulsRecord {
  id?: number;
  unit_id: string;
  member_id: string;
  total_count: number;
  converts_names: string;
  record_date: string;
  synced?: number;
}

// Database Class
export class MinistryDatabase extends Dexie {
  members!: Table<Member>;
  attendanceLogs!: Table<LocalAttendance>;
  inventory!: Table<InventoryItem>;
  finances!: Table<FinanceItem>;
  requests!: Table<BudgetRequest>;
  performance!: Table<PerformanceReview>;
  souls!: Table<SoulsRecord>;
  units!: Table<UnitProfile>; // <--- NEW
  subunits!: Table<Subunit>;  // <--- NEW

  constructor() {
    super('MinistryDB');

    // Schema Version 11: Adds units, subunits, and updates members
    this.version(11).stores({
      members: 'id, unit_id, full_name, category, subunit_id, role_in_unit, synced',
      attendanceLogs: '++id, member_id, event_id, event_date, [unit_id+event_id]',
      inventory: '++id, unit_id, item_name, condition, location',
      finances: '++id, unit_id, type, date',
      requests: '++id, unit_id, status, request_date',
      performance: '++id, unit_id, member_id, review_date',
      souls: '++id, unit_id, member_id, record_date',
      units: 'id, name',        // <--- NEW
      subunits: '++id, unit_id' // <--- NEW
    });
  }
}

export const db = new MinistryDatabase();