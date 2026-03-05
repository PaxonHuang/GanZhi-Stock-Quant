/**
 * Monthly K-Line Chart Component with ECharts
 * Displays candlestick chart with monthly aggregation and GanZhi month labels
 */
import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import type { StockData } from '@/config/supabase';
import { Solar } from 'lunar-javascript';

// Color scheme
const COLORS = {
  bullish: '#ff3333',
  bearish: '#00cc00',
  ma5: '#ffffff',
  ma10: '#ffff00',
  ma20: '#bf00ff',
  background: '#0b0e11',
  border: '#2a3441',
  text: '#9aa0a6',
  gold: '#c5a065',
};

interface MonthlyStockData {
  date: string;           // YYYY-MM format
  year: number;
  month: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ganzhiMonth: string;    // e.g., "甲子月"
  displayLabel: string;   // e.g., "2024 年 1 月 甲子月"
}

interface MonthlyKLineChartProps {
  data: StockData[];
  loading?: boolean;
  height?: number | string;
  onAnnotate?: (index: number) => void;
  annotatedIndices?: number[];
}

// Aggregate daily data into monthly OHLC
function aggregateMonthlyData(data: StockData[]): MonthlyStockData[] {
  if (!data || data.length === 0) return [];
  
  // Sort by date first
  const sorted = [...data].sort((a, b) => 
    new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );
  
  const monthlyMap = new Map<string, StockData[]>();
  
  // Group by year-month
  sorted.forEach(dayData => {
    const date = new Date(dayData.trade_date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, []);
    }
    monthlyMap.get(key)!.push(dayData);
  });
  
  // Convert to monthly OHLC
  const monthlyData: MonthlyStockData[] = [];
  
  monthlyMap.forEach((days, key) => {
    const [year, month] = key.split('-').map(Number);
    
    // Get first day's open and last day's close
    const open = days[0].open;
    const close = days[days.length - 1].close;
    
    // Get max high and min low
    const high = Math.max(...days.map(d => d.high));
    const low = Math.min(...days.map(d => d.low));
    
    // Sum volume
    const volume = days.reduce((sum, d) => sum + d.volume, 0);
    
    // Calculate GanZhi month using first day of month
    const firstDay = days[0];
    const solarDate = new Date(firstDay.trade_date);
    const ganzhiMonth = getMonthGanZhi(solarDate);
    
    // Create display label
    const displayLabel = `${year}年${month}月 ${ganzhiMonth}`;
    
    monthlyData.push({
      date: key,
      year,
      month,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
      ganzhiMonth,
      displayLabel,
    });
  });
  
  // Sort by date
  monthlyData.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
  
  return monthlyData;
}

// Get month GanZhi from date
function getMonthGanZhi(date: Date): string {
  try {
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const lunar = solar.getLunar();
    
    // Get year GanZhi and extract the stem (first character)
    const yearGanZhi = lunar.getYearInGanZhi();
    const yearStem = yearGanZhi.charAt(0);
    
    // Get lunar month (1-12) - cast to any to bypass type definition issues
    const lunarMonth = (lunar as any).getMonth() as number;
    
    // Calculate month GanZhi
    return calculateMonthGanZhi(yearStem, lunarMonth);
  } catch (error) {
    console.error('Error getting month GanZhi:', error);
    return '未知月';
  }
}

// Calculate month GanZhi from year stem and lunar month
function calculateMonthGanZhi(yearStem: string, lunarMonth: number): string {
  // Heavenly Stems (天干)
  const tianGan = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  
  // Earthly Branches for months (地支) - starting from 寅 (month 1)
  const diZhi = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  
  // Find year stem index
  const yearStemIndex = tianGan.indexOf(yearStem);
  if (yearStemIndex === -1) return '未知月';
  
  // Calculate month stem using the formula:
  // Month stem index = (yearStemIndex × 2 + month - 1) mod 10
  // Month 1 (寅月) starts with stem at index (yearStemIndex × 2) mod 10
  const monthStemIndex = (yearStemIndex * 2 + lunarMonth - 1) % 10;
  
  // Get month branch (lunarMonth is 1-12, array is 0-11)
  const monthBranch = diZhi[lunarMonth - 1];
  
  // Combine stem and branch
  const monthStem = tianGan[monthStemIndex];
  
  return `${monthStem}${monthBranch}月`;
}

// Calculate moving average for monthly data
function calculateMonthlyMA(period: number, data: MonthlyStockData[]): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push(Number((sum / period).toFixed(2)));
    }
  }
  return result;
}

export const MonthlyKLineChart: React.FC<MonthlyKLineChartProps> = ({
  data,
  loading = false,
  height = 600,
  onAnnotate,
  annotatedIndices = [],
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  const monthlyData = useMemo(() => {
    return aggregateMonthlyData(data);
  }, [data]);
  
  const chartData = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) {
      return { labels: [], ohlc: [], volumes: [], ma5: [], ma10: [], ma20: [] };
    }
    
    const labels = monthlyData.map(d => d.displayLabel);
    const ohlc = monthlyData.map(d => [d.open, d.close, d.low, d.high]);
    const volumes = monthlyData.map(d => d.volume);
    const ma5 = calculateMonthlyMA(5, monthlyData);
    const ma10 = calculateMonthlyMA(10, monthlyData);
    const ma20 = calculateMonthlyMA(20, monthlyData);
    
    return { labels, ohlc, volumes, ma5, ma10, ma20 };
  }, [monthlyData]);
  
  useEffect(() => {
    if (chartData.labels.length === 0) return;
    if (!chartRef.current) return;
    
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, undefined, {
        renderer: 'canvas',
      });
      console.log('[MonthlyKLineChart] ECharts initialized');
    }
    
    // Calculate volume colors based on price movement
    const volumeColors = monthlyData.map((d, i) => {
      if (i === 0) return d.close >= d.open ? COLORS.bullish : COLORS.bearish;
      return d.close >= monthlyData[i - 1].close ? COLORS.bullish : COLORS.bearish;
    });
    
    // Tooltip formatter
    const tooltipFormatter = (params: any) => {
      if (!params || params.length === 0) return '';
      const item = params[0];
      const index = item.dataIndex;
      const monthData = monthlyData[index];
      if (!monthData) return '';
      
      return `<div style="font-family: monospace;">
        <div>📅 ${monthData.displayLabel}</div>
        <div style="color: ${COLORS.gold};">━━━</div>
        <div>开盘: ${monthData.open}</div>
        <div>收盘: ${monthData.close}</div>
        <div>最高: ${monthData.high}</div>
        <div>最低: ${monthData.low}</div>
        <div>成交量: ${monthData.volume.toLocaleString()}</div>
      </div>`;
    };
    
    const option: echarts.EChartsOption = {
      backgroundColor: COLORS.background,
      animation: false,
      legend: {
        show: true,
        top: 10,
        textStyle: { color: COLORS.text },
        data: ['K 线', 'MA5', 'MA10', 'MA20'],
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(21, 26, 33, 0.95)',
        borderColor: COLORS.border,
        textStyle: { color: COLORS.text },
        formatter: tooltipFormatter,
      },
      grid: [
        { left: '10%', right: '8%', top: '15%', height: '60%' },
        { left: '10%', right: '8%', top: '80%', height: '15%' },
      ],
      xAxis: [
        {
          type: 'category',
          data: chartData.labels,
          axisLine: { lineStyle: { color: COLORS.border } },
          axisLabel: { 
            color: COLORS.text,
            rotate: 45,
            interval: 'auto',
          },
          splitLine: { show: false },
        },
        {
          type: 'category',
          gridIndex: 1,
          data: chartData.labels,
          axisLine: { lineStyle: { color: COLORS.border } },
          axisLabel: { show: false },
          splitLine: { show: false },
        },
      ],
      yAxis: [
        {
          scale: true,
          splitArea: { show: false },
          axisLine: { lineStyle: { color: COLORS.border } },
          axisLabel: { color: COLORS.text },
          splitLine: { lineStyle: { color: COLORS.border, opacity: 0.3 } },
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLine: { lineStyle: { color: COLORS.border } },
          axisLabel: { color: COLORS.text },
          splitLine: { lineStyle: { color: COLORS.border, opacity: 0.3 } },
        },
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], start: 80, end: 100 },
      ],
      series: [
        {
          name: 'K 线',
          type: 'candlestick',
          data: chartData.ohlc,
          itemStyle: {
            color: COLORS.bullish,
            color0: COLORS.bearish,
            borderColor: COLORS.bullish,
            borderColor0: COLORS.bearish,
          },
        },
        { 
          name: 'MA5', 
          type: 'line', 
          data: chartData.ma5, 
          smooth: true, 
          lineStyle: { width: 1, color: COLORS.ma5 }, 
          symbol: 'none' 
        },
        { 
          name: 'MA10', 
          type: 'line', 
          data: chartData.ma10, 
          smooth: true, 
          lineStyle: { width: 1, color: COLORS.ma10 }, 
          symbol: 'none' 
        },
        { 
          name: 'MA20', 
          type: 'line', 
          data: chartData.ma20, 
          smooth: true, 
          lineStyle: { width: 1, color: COLORS.ma20 }, 
          symbol: 'none' 
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: chartData.volumes.map((v, i) => ({ 
            value: v, 
            itemStyle: { color: volumeColors[i] } 
          })),
        },
        // Annotation markers
        {
          name: 'Annotations',
          type: 'scatter',
          xAxisIndex: 0,
          yAxisIndex: 0,
          data: (annotatedIndices || []).map((idx) => {
            const ohlcData = chartData.ohlc[idx];
            if (!ohlcData) return null;
            const high = ohlcData[1]; // monthly high is at index 1
            const priceRange = Math.max(...chartData.ohlc.map(o => o[1])) - Math.min(...chartData.ohlc.map(o => o[2]));
            return {
              value: [idx, high + priceRange * 0.08],
              symbol: 'pin',
              symbolSize: 32,
              itemStyle: { 
                color: '#00FF00',
                shadowBlur: 10,
                shadowColor: '#00FF00',
              },
            };
          }).filter(Boolean),
          label: {
            show: true,
            position: 'top',
            distance: 5,
            formatter: '📍',
            color: '#00FF00',
            fontSize: 16,
            fontWeight: 'bold',
          },
          z: 100,
        },
      ],
    };
    
    chartInstance.current.setOption(option);
    
    // Add click handler for annotation
    chartInstance.current.on('click', (params: any) => {
      if (params.seriesName === 'K 线' && params.dataIndex !== undefined) {
        console.log('[MonthlyKLineChart] Candlestick clicked, dataIndex:', params.dataIndex);
        if (onAnnotate) {
          onAnnotate(params.dataIndex);
        }
      }
    });
    
    return () => {
      // Don't dispose on every update
    };
  }, [chartData, monthlyData]);
  
  const containerStyle = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: '100%',
  };
  
  if (loading) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, color: COLORS.text }}>
        <div>加载中...</div>
      </div>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, color: COLORS.text }}>
        <div>暂无数据</div>
      </div>
    );
  }
  
  console.log('[MonthlyKLineChart] Rendering chart, monthly data length:', monthlyData.length);
  return (
    <div ref={chartRef} style={containerStyle} />
  );
};

export default MonthlyKLineChart;
