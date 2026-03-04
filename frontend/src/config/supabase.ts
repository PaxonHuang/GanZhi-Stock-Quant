import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate environment
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set. Please check your .env file.');
}

// Stock data type from database schema
export interface StockData {
  id: string;
  trade_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number | null;
  ganzi_year: string | null;
  ganzi_day: string | null;
  created_at: string;
}

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Query options
export interface StockQueryOptions {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

// Helper function to fetch stock data
export async function fetchStockData(options: StockQueryOptions = {}): Promise<StockData[]> {
  let query = supabase
    .from('stock_data')
    .select('*')
    .order('trade_date', { ascending: true });

  if (options.startDate) {
    query = query.gte('trade_date', options.startDate);
  }

  if (options.endDate) {
    query = query.lte('trade_date', options.endDate);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching stock data:', error);
    throw error;
  }

  return data || [];
}

/**
 * Import stock data into database (upsert)
 */
export async function importStockData(data: StockData[]): Promise<{ success: boolean; imported: number; errors: string[] }> {
  if (data.length === 0) {
    return { success: false, imported: 0, errors: ['No data to import'] };
  }

  const errors: string[] = [];
  let imported = 0;

  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('stock_data')
      .upsert(batch, { 
        onConflict: 'trade_date',
        ignoreDuplicates: true 
      });

    if (error) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      console.error('Batch import error:', error);
    } else {
      imported += batch.length;
    }
  }

  return {
    success: errors.length === 0,
    imported,
    errors,
  };
}

/**
 * Delete all stock data
 */
export async function clearStockData(): Promise<{ success: boolean; deleted: number }> {
  const { count } = await supabase
    .from('stock_data')
    .select('*', { count: 'exact', head: true });

  const { error } = await supabase
    .from('stock_data')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error('Error clearing stock data:', error);
    return { success: false, deleted: 0 };
  }

  return { success: true, deleted: count || 0 };
}
