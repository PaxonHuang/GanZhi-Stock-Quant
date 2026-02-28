import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://ldzbwhlrfpypvoalcqia.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkemJ3aGxyZnB5cHZvYWxjcWlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMDU3MDMsImV4cCI6MjA4NzU4MTcwM30.qMP9XaVKee5FkoSnCe_P7J8lnE7cm6jGYu6BrU_zbPQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export for use in other files
export default supabase;
