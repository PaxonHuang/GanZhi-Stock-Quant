# AGENTS.md - Agent Guidelines for ZodiacQuant GANZHI Stock Dashboard

## Project Overview

This is a React + TypeScript stock dashboard application that displays Chinese stock data with Gan-Zhi (干支) and Five Elements (五行) analysis. The project uses Vite as the build tool and integrates with Supabase for data storage.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Note: There is currently no test framework configured. Do not write tests unless explicitly requested.

## Code Style Guidelines

### TypeScript Configuration
- Target: ES2022
- Module: ESNext with bundler resolution
- Path alias: `@/` maps to project root (use `@/` for imports)
- JSX: react-jsx

### Naming Conventions
- **Components**: PascalCase (e.g., `StockChart`, `FiveElementsAnalysis`)
- **Interfaces/Types**: PascalCase (e.g., `StockInfo`, `ChartInterval`)
- **Functions/Variables**: camelCase (e.g., `loadStockData`, `selectedSymbol`)
- **Constants**: PascalCase for exported constants (e.g., `STOCK_GROUPS`, `WUXING_COLORS`)
- **Enums**: PascalCase with PascalCase members (e.g., `WuXing.WOOD`)

### Import Organization
1. React imports first
2. Third-party library imports
3. Internal type imports
4. Internal service/utility imports
5. Component imports

Example:
```typescript
import React, { useState, useEffect, useMemo } from 'react';
import { Search, Bell, Settings } from 'lucide-react';
import { StockInfo, ChartInterval } from './types';
import { loadStockData } from './services/dataService';
import StockChart from './components/StockChart';
```

### Component Patterns
- Use functional components with TypeScript
- Use `React.FC<Props>` type for component typing
- Destructure props in component parameters
- Extract complex logic into custom hooks when appropriate
- Use `useMemo` for expensive computations
- Use `useEffect` with proper cleanup (return cleanup function)

### Error Handling
- Use try-catch for async operations
- Log errors with descriptive messages: `console.error('Error loading stock data:', error);`
- Return null or appropriate fallback values on error
- Use optional chaining and nullish coalescing for safe access

### State Management
- Use React useState for local component state
- Use useMemo for derived/computed values
- Avoid unnecessary state; derive from existing state when possible

### Type Definitions
- Define interfaces in `types.ts` for shared types
- Use type aliases for unions (e.g., `type ChartInterval = 'Daily' | 'Xun' | ...`)
- Use enums for fixed sets of values (e.g., `enum WuXing`)
- Make optional properties explicit with `?`

### CSS & Styling
- Use Tailwind CSS classes for styling
- Use color constants from `WUXING_COLORS` in `constants.ts` for consistency
- Follow existing patterns in components for layout

### File Organization
```
src/ or project root
├── components/     # React components
├── services/      # Data fetching and API logic
├── utils/         # Utility functions
├── types.ts       # Shared TypeScript interfaces
├── constants.ts   # Application constants
├── App.tsx        # Main application component
└── index.tsx      # Entry point
```

## Key Features (v2.0)

### K-Line Aggregation
- **Daily K-Line**: Standard candlestick chart (Tonghua style: red for up, green for down)
- **Xun K-Line (旬K)**: Aggregated by 10-day cycles starting from 甲子日 (Jiazi day)
- **Monthly K-Line**: Aggregated by 24 solar terms (节气)

### X-Axis Display Modes
- **Gregorian**: Show only Western calendar dates
- **Ganzhi**: Show only Chinese Gan-Zhi dates
- **Dual**: Show both for direct comparison

### POI (Points of Interest) Detection
- **Gan-Zhi Cycle**: 甲子日 (first day of 60-year cycle)
- **Solar Terms**: 24 solar term dates
- **Candlestick Patterns**: Doji, Hammer, Shooting Star, Engulfing
- **Local Extremas**: 5-day high/low points

## Key Files

- `types.ts` - Core type definitions (StockData, StockInfo, ChartInterval, WuXing enum, POI types)
- `constants.ts` - Application constants (TIANGAN, DIZHI, STOCK_GROUPS, WUXING_COLORS)
- `services/dataService.ts` - Stock data loading, aggregation, and POI detection
- `services/supabase.ts` - Supabase client configuration
- `utils/ganzhi.ts` - Gan-Zhi calculation utilities
- `components/StockChart.tsx` - Stock price chart with dual X-axis and POI markers
- `components/FiveElementsAnalysis.tsx` - Five Elements analysis component
- `vite.config.ts` - Vite configuration (port 3000, path aliases)
- `tsconfig.json` - TypeScript configuration

- `types.ts` - Core type definitions (StockData, StockInfo, ChartInterval, WuXing enum)
- `constants.ts` - Application constants (TIANGAN, DIZHI, STOCK_GROUPS, WUXING_COLORS)
- `services/dataService.ts` - Stock data loading and processing
- `services/supabase.ts` - Supabase client configuration
- `utils/ganzhi.ts` - Gan-Zhi calculation utilities
- `components/StockChart.tsx` - Stock price chart component
- `components/FiveElementsAnalysis.tsx` - Five Elements analysis component
- `vite.config.ts` - Vite configuration (port 3000, path aliases)
- `tsconfig.json` - TypeScript configuration

## Supabase Integration

The application connects to Supabase for data storage. Environment variables should be configured in `.env.local`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Dependencies

- React 19
- TypeScript 5.8
- Vite 6
- Recharts (charting)
- Lucide React (icons)
- Supabase JS client
