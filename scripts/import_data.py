#!/usr/bin/env python3
"""
GanZhi Stock Data Import Script

This script imports stock data from 上证指数.xlsx to Supabase.
It uses the existing MCP modules for Excel parsing and GanZhi conversion.

Usage:
    python scripts/import_data.py [--env .env]

Requirements:
    - SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables
    - Excel file at ../上证指数.xlsx (relative to project root)
"""

import os
import sys
import argparse
from datetime import date, datetime
from pathlib import Path
from typing import Optional

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "ganzhi-stock-validator-mcp" / "src"))

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client
from lunar_python import Solar, Lunar


def parse_date(date_str) -> Optional[date]:
    """
    Parse date from various formats including M/D/YY.
    
    Examples:
        - "12/19/90" -> 1990-12-19
        - "1/5/05" -> 2005-01-05
        - "1990-12-19" -> 1990-12-19
    """
    if pd.isna(date_str) or date_str is None:
        return None
    
    date_str = str(date_str).strip()
    
    # Try M/D/YY format
    if "/" in date_str:
        parts = date_str.split("/")
        if len(parts) == 3:
            try:
                month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
                # Convert 2-digit year
                if year < 100:
                    year = 1900 + year if year >= 90 else 2000 + year
                return date(year, month, day)
            except ValueError:
                pass
    
    # Try standard formats
    for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y"]:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    
    return None


def solar_to_ganzhi(dt: date) -> tuple[str, str]:
    """Convert solar date to GanZhi (干支) information."""
    solar = Solar.fromYmd(dt.year, dt.month, dt.day)
    lunar = solar.getLunar()
    
    return (
        lunar.getYearInGanZhi(),  # ganzi_year like "庚午年"
        lunar.getDayInGanZhi()    # ganzi_day like "甲子日"
    )


def load_excel_data(excel_path: str) -> pd.DataFrame:
    """Load stock data from Excel file."""
    df = pd.read_excel(excel_path)
    
    # Clean column names
    df.columns = df.columns.str.strip()
    
    return df


def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to standard format."""
    column_mapping = {
        '日期': 'trade_date',
        'date': 'trade_date',
        'Date': 'trade_date',
        '开盘': 'open',
        'open': 'open',
        'Open': 'open',
        '最高': 'high',
        'high': 'high',
        'High': 'high',
        '最低': 'low',
        'low': 'low',
        'Low': 'low',
        '收盘': 'close',
        'close': 'close',
        'Close': 'close',
        '成交量': 'volume',
        'volume': 'volume',
        'Volume': 'volume',
        '成交额': 'amount',
        'amount': 'amount',
        'Amount': 'amount',
    }
    
    # Rename columns
    df = df.rename(columns=column_mapping)
    
    # Keep only required columns
    required_cols = ['trade_date', 'open', 'high', 'low', 'close', 'volume']
    existing_cols = [col for col in required_cols if col in df.columns]
    
    return df[existing_cols]


def process_stock_data(df: pd.DataFrame) -> list[dict]:
    """Process stock data and add GanZhi fields."""
    processed = []
    
    for idx, row in df.iterrows():
        # Parse date
        trade_date = parse_date(row.get('trade_date'))
        if trade_date is None:
            print(f"Warning: Could not parse date at row {idx}: {row.get('trade_date')}")
            continue
        
        # Calculate GanZhi
        ganzi_year, ganzi_day = solar_to_ganzhi(trade_date)
        
        # Build record
        record = {
            'trade_date': trade_date.isoformat(),
            'open': float(row['open']),
            'high': float(row['high']),
            'low': float(row['low']),
            'close': float(row['close']),
            'volume': float(row['volume']),
            'amount': float(row['amount']) if pd.notna(row.get('amount')) else None,
            'ganzi_year': ganzi_year,
            'ganzi_day': ganzi_day,
        }
        
        processed.append(record)
    
    return processed


def import_to_supabase(
    data: list[dict], 
    supabase_url: str, 
    supabase_key: str,
    batch_size: int = 100
) -> tuple[int, int]:
    """
    Import data to Supabase using upsert.
    
    Returns:
        (success_count, error_count)
    """
    client: Client = create_client(supabase_url, supabase_key)
    
    success_count = 0
    error_count = 0
    
    # Process in batches
    for i in range(0, len(data), batch_size):
        batch = data[i:i + batch_size]
        
        try:
            # Upsert data (using trade_date as unique key)
            response = client.table('stock_data').upsert(
                batch,
                on_conflict='trade_date'
            ).execute()
            
            success_count += len(batch)
            print(f"Imported batch {i//batch_size + 1}: {len(batch)} records")
            
        except Exception as e:
            error_count += len(batch)
            print(f"Error importing batch {i//batch_size + 1}: {e}")
    
    return success_count, error_count


def main():
    parser = argparse.ArgumentParser(description='Import stock data to Supabase')
    parser.add_argument(
        '--env', 
        default='.env',
        help='Path to .env file (default: .env in project root)'
    )
    parser.add_argument(
        '--excel',
        default='上证指数.xlsx',
        help='Path to Excel file (default: 上证指数.xlsx in project root)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Process data but do not import to Supabase'
    )
    
    args = parser.parse_args()
    
    # Load environment variables
    env_path = PROJECT_ROOT / args.env
    if env_path.exists():
        load_dotenv(env_path)
        print(f"Loaded environment from {env_path}")
    
    # Get Supabase credentials
    supabase_url = os.environ.get('SUPABASE_URL')
    supabase_key = os.environ.get('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        print(f"Please check your {args.env} file")
        sys.exit(1)
    
    # Load Excel data
    excel_path = PROJECT_ROOT / args.excel
    if not excel_path.exists():
        print(f"Error: Excel file not found at {excel_path}")
        sys.exit(1)
    
    print(f"Loading data from {excel_path}...")
    df = load_excel_data(str(excel_path))
    print(f"Loaded {len(df)} rows")
    
    # Normalize columns
    df = normalize_columns(df)
    print(f"Columns after normalization: {list(df.columns)}")
    
    # Process data
    print("Processing data and calculating GanZhi...")
    processed_data = process_stock_data(df)
    print(f"Processed {len(processed_data)} valid records")
    
    if args.dry_run:
        print("\nDry run - first 5 records:")
        for record in processed_data[:5]:
            print(f"  {record}")
        return
    
    # Import to Supabase
    print("\nImporting to Supabase...")
    success, errors = import_to_supabase(processed_data, supabase_url, supabase_key)
    
    print(f"\nImport complete!")
    print(f"  Success: {success} records")
    print(f"  Errors: {errors} records")


if __name__ == '__main__':
    main()
