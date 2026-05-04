import { supabase } from '@/integrations/supabase/client';

/**
 * Check if a specific month and year is already closed
 * @param date - Date object to check
 * @returns Promise<boolean> - true if month is closed, false otherwise
 */
export const isMonthClosed = async (date: Date): Promise<boolean> => {
  try {
    const month = date.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
    const year = date.getFullYear();

    const { data, error } = await supabase
      .from('monthly_closures')
      .select('id')
      .eq('closure_month', month)
      .eq('closure_year', year)
      .maybeSingle();

    if (error) {
      console.error('Error checking if month is closed:', error);
      return false; // Default to allowing transaction if check fails
    }

    return !!data; // Returns true if data exists (month is closed)
  } catch (error) {
    console.error('Error in isMonthClosed:', error);
    return false; // Default to allowing transaction if check fails
  }
};

/**
 * Check if a specific month and year is already closed (using month/year numbers)
 * @param month - Month number (1-12)
 * @param year - Year number
 * @returns Promise<boolean> - true if month is closed, false otherwise
 */
export const isMonthClosedByNumbers = async (month: number, year: number): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('monthly_closures')
      .select('id')
      .eq('closure_month', month)
      .eq('closure_year', year)
      .maybeSingle();

    if (error) {
      console.error('Error checking if month is closed:', error);
      return false; // Default to allowing transaction if check fails
    }

    return !!data; // Returns true if data exists (month is closed)
  } catch (error) {
    console.error('Error in isMonthClosedByNumbers:', error);
    return false; // Default to allowing transaction if check fails
  }
};

/**
 * Get formatted month/year string for display
 * @param date - Date object
 * @returns string - formatted as "MM/YYYY"
 */
export const formatMonthYear = (date: Date): string => {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  return `${month.toString().padStart(2, '0')}/${year}`;
};