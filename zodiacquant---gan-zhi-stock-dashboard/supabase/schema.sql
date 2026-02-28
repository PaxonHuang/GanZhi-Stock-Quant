-- Supabase SQL Schema for GanZhi Stock Dashboard
-- Run this in your Supabase SQL Editor

-- Create stock_data table to store OHLC data
CREATE TABLE IF NOT EXISTS stock_data (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL DEFAULT '000001',
  date DATE NOT NULL,
  open DECIMAL(12, 2) NOT NULL,
  high DECIMAL(12, 2) NOT NULL,
  low DECIMAL(12, 2) NOT NULL,
  close DECIMAL(12, 2) NOT NULL,
  volume BIGINT NOT NULL,
  amount DECIMAL(20, 2),
  ganzhi VARCHAR(10),
  wuxing VARCHAR(5),
  ma5 DECIMAL(12, 2),
  ma10 DECIMAL(12, 2),
  ma20 DECIMAL(12, 2),
  ma30 DECIMAL(12, 2),
  ma60 DECIMAL(12, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_data_symbol_date ON stock_data(symbol, date DESC);

-- Enable Row Level Security
ALTER TABLE stock_data ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access" ON stock_data
  FOR SELECT USING (true);

-- Create policy for authenticated insert
CREATE POLICY "Allow authenticated insert" ON stock_data
  FOR INSERT WITH CHECK (true);

-- Create policy for authenticated update
CREATE POLICY "Allow authenticated update" ON stock_data
  FOR UPDATE USING (true);

-- Create stock_info table for latest stock summary
CREATE TABLE IF NOT EXISTS stock_info (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(12, 2) NOT NULL,
  change_value DECIMAL(12, 2) NOT NULL,
  change_percent DECIMAL(8, 4) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stock_info ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read stock_info" ON stock_info
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated update stock_info" ON stock_info
  FOR UPDATE USING (true);
