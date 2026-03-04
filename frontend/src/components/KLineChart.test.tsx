/**
 * Unit tests for KLineChart component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KLineChart } from '@/components/KLineChart';
import type { StockData } from '@/config/supabase';

// Mock echarts
vi.mock('echarts', () => {
  const mockInstance = {
    setOption: vi.fn(),
    dispose: vi.fn(),
    resize: vi.fn(),
  };

  return {
    __esModule: true,
    default: {
      init: vi.fn(() => mockInstance),
    },
    init: vi.fn(() => mockInstance),
  };
});

// Mock dateConverter
vi.mock('@/utils/dateConverter', () => ({
  formatDateToGanZhi: vi.fn(() => ({
    year: '甲子年',
    day: '甲子日',
    zodiac: '鼠',
  })),
}));

describe('KLineChart', () => {
  const mockData: StockData[] = [
    {
      id: '1',
      trade_date: '2024-01-02',
      open: 100.0,
      high: 105.0,
      low: 99.0,
      close: 104.0,
      volume: 1000000,
      amount: 100000000,
      ganzi_year: '癸卯年',
      ganzi_day: '甲子日',
      created_at: '2024-01-01',
    },
    {
      id: '2',
      trade_date: '2024-01-03',
      open: 104.0,
      high: 106.0,
      low: 102.0,
      close: 103.0,
      volume: 1100000,
      amount: 110000000,
      ganzi_year: '癸卯年',
      ganzi_day: '乙丑日',
      created_at: '2024-01-01',
    },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    render(<KLineChart data={[]} loading={true} />);
    
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('should render empty state', () => {
    render(<KLineChart data={[]} loading={false} />);
    
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('should render chart with data', () => {
    const { container } = render(
      <KLineChart data={mockData} loading={false} height={400} />
    );
    
    // Chart container should be rendered
    const chartContainer = container.querySelector('[ref]');
    expect(chartContainer).toBeInTheDocument();
  });

  it('should apply custom height', () => {
    const { container } = render(
      <KLineChart data={mockData} loading={false} height={500} />
    );
    
    const chartContainer = container.querySelector('[ref]');
    expect(chartContainer).toHaveStyle({ height: '500px' });
  });
});
