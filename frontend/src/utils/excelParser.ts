/**
 * Excel Data Parser Utility
 * Parses uploaded Excel files with stock data
 */
import * as XLSX from 'xlsx';
import { formatDateToGanZhi } from './dateConverter';

export interface RawStockData {
  [key: string]: any;
}

export interface ParsedStockData {
  trade_date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount: number | null;
  ganzi_year: string | null;
  ganzi_day: string | null;
}

// Column name mappings (case-insensitive, supports Chinese and English)
const DATE_COLUMNS = ['date', '日期', '交易日期', 'trade_date'];
const OPEN_COLUMNS = ['open', '开盘', '开盘价'];
const HIGH_COLUMNS = ['high', '最高', '最高价'];
const LOW_COLUMNS = ['low', '最低', '最低价'];
const CLOSE_COLUMNS = ['close', '收盘', '收盘价'];
const VOLUME_COLUMNS = ['volume', '成交量', 'vol'];
const AMOUNT_COLUMNS = ['amount', '成交额', 'turnover'];

/**
 * Parse date from various formats (Excel serial, string, etc.)
 */
function parseDate(dateValue: any): Date | null {
  if (!dateValue && dateValue !== 0) return null;
  
  // Handle Excel serial date number
  if (typeof dateValue === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  // Handle string date
  const dateStr = String(dateValue).trim();
  if (!dateStr) return null;
  
  // Try M/D/YY or M/D/YYYY format
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      let [month, day, year] = parts.map(p => parseInt(p, 10));
      if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
        if (year < 100) {
          year = year >= 90 ? 1900 + year : 2000 + year;
        }
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
          return new Date(year, month - 1, day);
        }
      }
    }
  }
  
  // Try standard formats
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d;
  }
  
  return null;
}

/**
 * Find column from candidates (case-insensitive, trim whitespace)
 */
function findColumn(columns: string[], candidates: string[]): string | undefined {
  return columns.find(c => 
    candidates.some(cand => c.toLowerCase().trim() === cand.toLowerCase().trim())
  );
}

/**
 * Find numeric value from row
 */
function getNumericValue(row: RawStockData, colName: string | undefined): number | null {
  if (!colName || row[colName] === null || row[colName] === undefined) return null;
  const val = Number(row[colName]);
  return isNaN(val) ? null : val;
}

/**
 * Parse Excel file and convert to stock data array
 */
export function parseExcelFile(file: File): Promise<ParsedStockData[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json<RawStockData>(worksheet, { defval: null });
        
        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty'));
          return;
        }
        
        // Get column names from first row - trim whitespace
        const firstRow = jsonData[0];
        const columns = Object.keys(firstRow).map(c => c.trim());
        
        console.log('Excel columns found:', columns);
        
        // Find actual column names
        const dateCol = findColumn(columns, DATE_COLUMNS);
        const openCol = findColumn(columns, OPEN_COLUMNS);
        const highCol = findColumn(columns, HIGH_COLUMNS);
        const lowCol = findColumn(columns, LOW_COLUMNS);
        const closeCol = findColumn(columns, CLOSE_COLUMNS);
        const volumeCol = findColumn(columns, VOLUME_COLUMNS);
        const amountCol = findColumn(columns, AMOUNT_COLUMNS);
        
        console.log('Mapped columns:', { dateCol, openCol, highCol, lowCol, closeCol, volumeCol, amountCol });
        
        if (!dateCol) {
          reject(new Error(`Cannot find date column. Available columns: ${columns.join(', ')}`));
          return;
        }
        
        // Parse and transform data
        const parsedData: ParsedStockData[] = [];
        
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i];
          
          // Get raw date value
          const rawDate = row[dateCol];
          if (!rawDate) continue;
          
          const date = parseDate(rawDate);
          if (!date) {
            console.warn(`Row ${i + 2}: Invalid date value: ${rawDate}`);
            continue;
          }
          
          // Get numeric values
          const open = getNumericValue(row, openCol);
          const high = getNumericValue(row, highCol);
          const low = getNumericValue(row, lowCol);
          const close = getNumericValue(row, closeCol);
          const volume = getNumericValue(row, volumeCol);
          const amount = getNumericValue(row, amountCol);
          
          // Validate required fields
          if (open === null || high === null || low === null || close === null || volume === null) {
            console.warn(`Row ${i + 2}: Missing required fields`);
            continue;
          }
          
          const dateStr = date.toISOString().split('T')[0];
          const ganzhi = formatDateToGanZhi(date);
          
          parsedData.push({
            trade_date: dateStr,
            open,
            high,
            low,
            close,
            volume,
            amount,
            ganzi_year: ganzhi.year,
            ganzi_day: ganzhi.day,
          });
        }
        
        if (parsedData.length === 0) {
          reject(new Error('No valid data rows found in Excel file'));
          return;
        }
        
        console.log(`Successfully parsed ${parsedData.length} rows`);
        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsBinaryString(file);
  });
}

/**
 * Validate stock data
 */
export function validateStockData(data: ParsedStockData[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (data.length === 0) {
    errors.push('No data found in file');
    return { valid: false, errors };
  }
  
  data.forEach((row, index) => {
    const rowNum = index + 2;
    
    if (!row.trade_date) {
      errors.push(`Row ${rowNum}: Missing trade date`);
    }
    
    if (row.open === undefined || isNaN(row.open)) {
      errors.push(`Row ${rowNum}: Invalid open price`);
    }
    
    if (row.high === undefined || isNaN(row.high)) {
      errors.push(`Row ${rowNum}: Invalid high price`);
    }
    
    if (row.low === undefined || isNaN(row.low)) {
      errors.push(`Row ${rowNum}: Invalid low price`);
    }
    
    if (row.close === undefined || isNaN(row.close)) {
      errors.push(`Row ${rowNum}: Invalid close price`);
    }
    
    if (row.volume === undefined || isNaN(row.volume)) {
      errors.push(`Row ${rowNum}: Invalid volume`);
    }
    
    // Validate OHLC relationship
    if (row.high < row.low) {
      errors.push(`Row ${rowNum}: High price is less than low price`);
    }
    
    if (row.close > row.high || row.close < row.low) {
      errors.push(`Row ${rowNum}: Close price is outside high-low range`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
