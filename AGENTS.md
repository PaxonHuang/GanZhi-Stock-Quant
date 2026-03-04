# AGENTS.md - GanZhi Stock Dashboard

This file provides context for AI agents working on this codebase.

## Project Overview

GanZhi Stock Dashboard is a Chinese stock K-line visualization application that combines traditional Chinese calendar (GanZhi 干支) with modern financial charts. The project consists of:

- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS + ECharts
- **Backend**: Cloudflare Workers (Python)
- **Database**: Supabase (PostgreSQL)
- **Testing**: Vitest

## Build & Development Commands

### Frontend (from `frontend/` directory)

```bash
# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Build for production (runs TypeScript check first)
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Run tests with coverage
npm run test -- --coverage

# Run a single test file
npm run test -- src/utils/dateConverter.test.ts

# Run tests in watch mode
npm run test -- --watch
```

### Backend (from `workers/` directory)

```bash
# Install dependencies
pip install -e .

# Local development
wrangler dev

# Deploy to Cloudflare
wrangler deploy
```

## Code Style Guidelines

### TypeScript Configuration

The project uses strict TypeScript mode:
- `strict: true` - Full type checking
- `noUnusedLocals: true` - Error on unused variables
- `noUnusedParameters: true` - Error on unused params
- `noFallthroughCasesInSwitch: true` - Require all switch cases

Always define proper types - never use `any`.

### Import Conventions

```typescript
// Use path aliases (@/*) for internal imports
import { formatDateToGanZhi } from '@/utils/dateConverter';
import type { StockData } from '@/config/supabase';

// External imports
import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `KLineChart.tsx`, `Dashboard.tsx` |
| Utils/Helpers | camelCase | `dateConverter.ts`, `supabase.ts` |
| Interfaces/Types | PascalCase | `StockData`, `GanZhiResult` |
| Constants | UPPER_SNAKE_CASE | `COLORS`, `API_ENDPOINTS` |
| Enums | PascalCase | `ChartType` |
| Boolean props | is/has/can prefix | `loading`, `isVisible`, `hasData` |

### Component Structure

```typescript
// Preferred component pattern
import React from 'react';
import type { StockData } from '@/config/supabase';

interface ChartProps {
  data: StockData[];
  loading?: boolean;
  height?: number | string;
}

export const KLineChart: React.FC<ChartProps> = ({
  data,
  loading = false,
  height = 600,
}) => {
  // 1. Refs for external libs
  const chartRef = useRef<HTMLDivElement>(null);
  
  // 2. Memoized computed data
  const chartData = useMemo(() => {
    // ...
  }, [data]);
  
  // 3. Effects for lifecycle
  useEffect(() => {
    // Initialize chart
    return () => {
      // Cleanup
    };
  }, []);
  
  // 4. Early returns for loading/empty states
  if (loading) {
    return <div>加载中...</div>;
  }
  
  // 5. Main render
  return <div ref={chartRef} />;
};

export default KLineChart;
```

### Error Handling

```typescript
// API/async errors - always handle and log
async function fetchStockData(): Promise<StockData[]> {
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching stock data:', error);
    throw error;  // Re-throw for callers to handle
  }
  
  return data || [];
}

// Environment validation
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables are not set.');
}

// Validate inputs at function boundaries
export function formatDateToGanZhi(date: Date | string): GanZhiResult {
  if (!date) {
    throw new Error('Date is required');
  }
  // ...
}
```

### Testing Conventions

```typescript
import { describe, it, expect } from 'vitest';
import { formatDateToGanZhi, type GanZhiResult } from '@/utils/dateConverter';

describe('dateConverter', () => {
  describe('formatDateToGanZhi', () => {
    it('should convert a valid date to GanZhi format', () => {
      const result = formatDateToGanZhi('2024-01-01');
      
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('day');
      expect(typeof result.year).toBe('string');
    });
  });
});
```

### TailwindCSS Usage

The project uses a dark financial theme. Custom colors are defined in `tailwind.config.js`:

```html
<!-- Background colors -->
<div class="bg-fin-bg">...</div>
<div class="bg-fin-card">...</div>

<!-- Financial colors -->
<div class="text-bullish">...</div>
<div class="text-bearish">...</div>
<div class="text-gold">...</div>

<!-- Text colors -->
<div class="text-text-primary">...</div>
<div class="text-text-secondary">...</div>
<div class="text-text-muted">...</div>
```

### API/Backend Patterns

Python Worker follows these patterns:
- Async functions with `async/await`
- Type hints for all function parameters
- Docstrings for all public functions
- CORS headers on all responses
- Environment variable access via `os.environ.get()`

```python
async def fetch_stock_data(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: Optional[int] = None
) -> list:
    """Fetch stock data from Supabase using PostgREST API."""
    # Implementation
```

## Database Schema

Table: `stock_data`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| trade_date | date | Trading date (unique) |
| open | float | Opening price |
| high | float | Highest price |
| low | float | Lowest price |
| close | float | Closing price |
| volume | bigint | Trading volume |
| amount | float | Trading amount |
| ganzi_year | text | Year in GanZhi (e.g., "庚午年") |
| ganzi_day | text | Day in GanZhi (e.g., "甲子日") |
| created_at | timestamp | Record creation time |

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Workers (.dev.vars)
```
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-role-key
```

## Key Libraries

- **echarts**: Financial charting (candlestick, line series)
- **lunar-javascript**: Chinese calendar conversion (GanZhi)
- **dayjs**: Date formatting
- **xlsx (SheetJS)**: Excel file parsing
- **@supabase/supabase-js**: Database client
- **lunar-python**: Backend GanZhi conversion
- **httpx**: Async HTTP for Python workers
