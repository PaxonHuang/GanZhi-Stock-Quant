-- Stock Data Table
CREATE TABLE IF NOT EXISTS stock_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_date DATE NOT NULL UNIQUE,
    open NUMERIC NOT NULL,
    high NUMERIC NOT NULL,
    low NUMERIC NOT NULL,
    close NUMERIC NOT NULL,
    volume NUMERIC NOT NULL,
    amount NUMERIC,
    ganzi_year TEXT,
    ganzi_day TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for trade_date queries
CREATE INDEX stock_data_trade_date_idx ON stock_data(trade_date);

-- RLS Policies
ALTER TABLE stock_data ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read access" ON stock_data
    FOR SELECT USING (true);

-- Authenticated write access
CREATE POLICY "Allow authenticated insert" ON stock_data
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Authenticated update access
CREATE POLICY "Allow authenticated update" ON stock_data
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Authenticated delete access
CREATE POLICY "Allow authenticated delete" ON stock_data
    FOR DELETE USING (auth.role() = 'authenticated');
