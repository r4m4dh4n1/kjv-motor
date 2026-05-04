export interface RetroactiveOperational {
  id: string;
  original_month: string; // Format: YYYY-MM
  original_year: number;
  adjustment_date: string;
  category: string;
  nominal: number;
  description: string;
  company_id: string;
  divisi: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejected_reason?: string;
  notes?: string;
  auto_approved?: boolean; // Menandakan apakah otomatis disetujui
  requires_approval?: boolean; // Konfigurasi apakah perlu approval
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlyAdjustment {
  id: string;
  month: string; // Format: YYYY-MM
  year: number;
  divisi: string;
  total_adjustments: number;
  total_impact_profit: number;
  total_impact_modal: number;
  adjustment_count: number;
  last_adjustment_date: string;
  created_at: string;
  updated_at: string;
}

export interface RetroactiveOperationalForm {
  original_month: string;
  category: string;
  nominal: number;
  description: string;
  company_id: string;
  divisi: string;
  notes?: string;
}

export interface AdjustmentImpact {
  profit_impact: number;
  modal_impact: number;
  company_name: string;
  current_modal: number;
  new_modal: number;
}

export type RetroactiveStatus = 'pending' | 'approved' | 'rejected';

export const RETROACTIVE_CATEGORIES = [
  'Operasional Kantor',
  'Transportasi',
  'Komunikasi',
  'Listrik & Air',
  'Maintenance',
  'Marketing',
  'Gaji Kurang Profit',
  'Gaji Kurang Modal',
  'Bonus Kurang Profit',
  'Bonus Kurang Modal',
  'Ops Bulanan Kurang Profit',
  'Ops Bulanan Kurang Modal',
  'OP Global',
  'Pajak & Retribusi',
  'Asuransi',
  'Lain-lain'
] as const;

export type RetroactiveCategory = typeof RETROACTIVE_CATEGORIES[number];