import { supabase } from "@/integrations/supabase/client";

export interface CascadingSearchParams {
  tableName: string;
  selectedDivision: string;
  selectedMonth?: string;
  selectedYear?: string;
  customStartDate?: Date;
  customEndDate?: Date;
  dateColumn?: string;
  additionalFilters?: Record<string, any>;
}

export interface CascadingSearchResult {
  data: any[];
  source: 'master' | 'history' | 'combined';
  totalFound: number;
}

const isCurrentMonth = (month?: string, year?: string): boolean => {
  if (!month || !year || month === 'all' || year === 'all') {
    return true; // Default to current month behavior
  }
  
  const currentDate = new Date();
  const currentMonth = (currentDate.getMonth() + 1).toString();
  const currentYear = currentDate.getFullYear().toString();
  
  return month === currentMonth && year === currentYear;
};

const isCustomDateCurrent = (startDate?: Date, endDate?: Date): boolean => {
  if (!startDate || !endDate) return true;
  
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Check if custom date range is within current month
  const startMonth = startDate.getMonth();
  const startYear = startDate.getFullYear();
  const endMonth = endDate.getMonth();
  const endYear = endDate.getFullYear();
  
  return (startMonth === currentMonth && startYear === currentYear) &&
         (endMonth === currentMonth && endYear === currentYear);
};

const executeQuery = async (
  tableName: string,
  params: CascadingSearchParams,
  tableType: 'master' | 'history' | 'combined'
) => {
  return await fallbackQuery(tableName, params, tableType);
};

const fallbackQuery = async (
  tableName: string,
  params: CascadingSearchParams,
  tableType: 'master' | 'history' | 'combined'
) => {
  // Fallback to known table queries for type safety
  const dateCol = params.dateColumn || 'tanggal';
  
  try {
    let query: any;
    
    if (tableType === 'master') {
      if (tableName === 'pembelian') {
        query = supabase.from('pembelian').select('*');
      } else if (tableName === 'penjualans') {
        query = supabase.from('penjualans').select('*');
      } else if (tableName === 'cicilan') {
        query = supabase.from('cicilan').select('*');
      } else if (tableName === 'pembukuan') {
        query = supabase.from('pembukuan').select('*');
      } else if (tableName === 'pencatatan_asset') {
        query = supabase.from('pencatatan_asset').select('*');
      } else if (tableName === 'fee_penjualan') {
        query = supabase.from('fee_penjualan').select('*');
      } else if (tableName === 'operational') {
        query = supabase.from('operational').select('*');
      } else if (tableName === 'biro_jasa') {
        query = supabase.from('biro_jasa').select('*');
      } else if (tableName === 'assets') {
        query = supabase.from('assets').select('*');
      } else {
        return { data: [], error: 'Table not supported' };
      }
    } else if (tableType === 'history') {
      if (tableName === 'pembelian') {
        query = supabase.from('pembelian_history').select('*');
      } else if (tableName === 'penjualans') {
        query = supabase.from('penjualans_history').select('*');
      } else if (tableName === 'cicilan') {
        query = supabase.from('cicilan_history').select('*');
      } else if (tableName === 'pembukuan') {
        query = supabase.from('pembukuan_history').select('*');
      } else if (tableName === 'pencatatan_asset') {
        query = supabase.from('pencatatan_asset_history').select('*');
      } else if (tableName === 'fee_penjualan') {
        query = supabase.from('fee_penjualan_history').select('*');
      } else if (tableName === 'operational') {
        query = supabase.from('operational_history').select('*');
      } else if (tableName === 'biro_jasa') {
        query = supabase.from('biro_jasa_history').select('*');
      } else if (tableName === 'assets') {
        query = supabase.from('assets_history').select('*');
      } else {
        return { data: [], error: 'History table not supported' };
      }
    } else if (tableType === 'combined') {
      if (tableName === 'pembelian') {
        query = supabase.from('pembelian_combined').select('*');
      } else if (tableName === 'penjualans') {
        query = supabase.from('penjualans_combined').select('*');
      } else if (tableName === 'pembukuan') {
        query = supabase.from('pembukuan_combined').select('*');
      } else if (tableName === 'assets') {
        query = supabase.from('assets_combined').select('*');
      } else {
        return { data: [], error: 'Combined table not supported' };
      }
    }
    
    if (!query) {
      return { data: [], error: 'Query not built' };
    }
    
    // Apply filters
    if (params.selectedDivision !== 'all') {
      query = query.eq('divisi', params.selectedDivision);
    }
    
    if (params.additionalFilters) {
      Object.entries(params.additionalFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== 'all') {
          query = query.eq(key, value);
        }
      });
    }
    
    // Apply date filters
    if (params.selectedMonth && params.selectedYear && 
        params.selectedMonth !== 'all' && params.selectedYear !== 'all') {
      const startDate = `${params.selectedYear}-${params.selectedMonth.padStart(2, '0')}-01`;
      const nextMonth = parseInt(params.selectedMonth) === 12 ? 1 : parseInt(params.selectedMonth) + 1;
      const nextYear = parseInt(params.selectedMonth) === 12 ? parseInt(params.selectedYear) + 1 : parseInt(params.selectedYear);
      const endDate = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
      
      query = query.gte(dateCol, startDate).lt(dateCol, endDate);
    }
    
    // Apply custom date range
    if (params.customStartDate && params.customEndDate) {
      const startDate = params.customStartDate.toISOString().split('T')[0];
      const endDate = params.customEndDate.toISOString().split('T')[0];
      query = query.gte(dateCol, startDate).lte(dateCol, endDate);
    }
    
    query = query.order(dateCol, { ascending: false });
    
    const { data, error } = await query;
    return { data: data || [], error };
  } catch (error) {
    return { data: [], error };
  }
};

export const cascadingSearch = async (
  params: CascadingSearchParams
): Promise<CascadingSearchResult> => {
  console.log('🔍 Starting cascading search:', {
    table: params.tableName,
    division: params.selectedDivision,
    month: params.selectedMonth,
    year: params.selectedYear,
    isCurrentMonth: isCurrentMonth(params.selectedMonth, params.selectedYear),
    isCustomCurrent: isCustomDateCurrent(params.customStartDate, params.customEndDate)
  });

  // If filtering by current month/period, only search master table
  if (isCurrentMonth(params.selectedMonth, params.selectedYear) && 
      isCustomDateCurrent(params.customStartDate, params.customEndDate)) {
    console.log('📅 Using master table for current period');
    
    const { data, error } = await executeQuery(params.tableName, params, 'master');
    
    if (error) {
      console.error('❌ Error querying master table:', error);
      return { data: [], source: 'master', totalFound: 0 };
    }
    
    return {
      data: data || [],
      source: 'master',
      totalFound: (data || []).length
    };
  }

  // For non-current periods, implement cascading search
  console.log('🔄 Using cascading search for non-current period');
  
  // Step 1: Try master table
  console.log('1️⃣ Searching master table...');
  const { data: masterData, error: masterError } = await executeQuery(params.tableName, params, 'master');
  
  if (!masterError && masterData && masterData.length > 0) {
    console.log(`✅ Found ${masterData.length} records in master table`);
    return {
      data: masterData,
      source: 'master',
      totalFound: masterData.length
    };
  }

  // Step 2: Try history table
  console.log('2️⃣ Searching history table...');
  const { data: historyData, error: historyError } = await executeQuery(params.tableName, params, 'history');
  
  if (!historyError && historyData && historyData.length > 0) {
    console.log(`✅ Found ${historyData.length} records in history table`);
    return {
      data: historyData,
      source: 'history',
      totalFound: historyData.length
    };
  }

  // Step 3: Try combined table
  console.log('3️⃣ Searching combined table...');
  const { data: combinedData, error: combinedError } = await executeQuery(params.tableName, params, 'combined');
  
  if (!combinedError && combinedData && combinedData.length > 0) {
    console.log(`✅ Found ${combinedData.length} records in combined table`);
    return {
      data: combinedData,
      source: 'combined',
      totalFound: combinedData.length
    };
  }

  console.log('❌ No data found in any table');
  return { data: [], source: 'master', totalFound: 0 };
};

// Helper function to get the appropriate date column for different table types
export const getDateColumn = (tableName: string): string => {
  const dateColumnMap: Record<string, string> = {
    'pembelian': 'tanggal_pembelian',
    'penjualans': 'tanggal',
    'cicilan': 'tanggal_bayar',
    'pembukuan': 'tanggal',
    'pencatatan_asset': 'tanggal',
    'fee_penjualan': 'tanggal_fee',
    'operational': 'tanggal',
    'biro_jasa': 'tanggal',
    'assets': 'tanggal_perolehan'
  };
  
  return dateColumnMap[tableName] || 'tanggal';
};