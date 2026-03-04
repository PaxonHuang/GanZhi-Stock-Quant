/**
 * K-Line Chart Component with ECharts
 * Displays candlestick chart with moving averages
 */
import React, { useEffect, useRef, useMemo } from 'react';
import * as echarts from 'echarts';
import type { StockData } from '@/config/supabase';
import { formatDateToGanZhi } from '@/utils/dateConverter';

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

interface KLineChartProps {
  data: StockData[];
  loading?: boolean;
  height?: number | string;
}

// Calculate moving average
function calculateMA(period: number, data: StockData[]): (number | null)[] {
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

export const KLineChart: React.FC<KLineChartProps> = ({
  data,
  loading = false,
  height = 600,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return { dates: [], ohlc: [], volumes: [], ma5: [], ma10: [], ma20: [] };
    }
    
    const dates = data.map(d => d.trade_date);
    const ohlc = data.map(d => [d.open, d.close, d.low, d.high]);
    const volumes = data.map(d => d.volume);
    const ma5 = calculateMA(5, data);
    const ma10 = calculateMA(10, data);
    const ma20 = calculateMA(20, data);
    
    return { dates, ohlc, volumes, ma5, ma10, ma20 };
  }, [data]);

  useEffect(() => {
    if (chartData.dates.length === 0) return;
    if (!chartRef.current) return;
    
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current, undefined, {
        renderer: 'canvas',
      });
      console.log('[KLineChart] ECharts initialized');
    }
    
    const volumeColors = data.map((d, i) => {
      if (i === 0) return d.close >= d.open ? COLORS.bullish : COLORS.bearish;
      return data[i].close >= data[i - 1].close ? COLORS.bullish : COLORS.bearish;
    });

    const tooltipFormatter = (params: any) => {
      if (!params || params.length === 0) return '';
      const item = params[0];
      const index = item.dataIndex;
      const stockData = data[index];
      if (!stockData) return '';
      
      const ganzhi = formatDateToGanZhi(stockData.trade_date);
      
      return `<div style="font-family: monospace;">
        <div>📅 ${item.axisValue}</div>
        <div>${ganzhi.year} ${ganzhi.day}</div>
        <div style="color: ${COLORS.gold};">━━━</div>
        <div>开盘: ${stockData.open}</div>
        <div>收盘: ${stockData.close}</div>
        <div>最高: ${stockData.high}</div>
        <div>最低: ${stockData.low}</div>
        <div>成交量: ${stockData.volume.toLocaleString()}</div>
      </div>`;
    };

    const option: echarts.EChartsOption = {
      backgroundColor: COLORS.background,
      animation: false,
      legend: {
        show: true,
        top: 10,
        textStyle: { color: COLORS.text },
        data: ['K线', 'MA5', 'MA10', 'MA20'],
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
          data: chartData.dates,
          axisLine: { lineStyle: { color: COLORS.border } },
          axisLabel: { color: COLORS.text },
          splitLine: { show: false },
        },
        {
          type: 'category',
          gridIndex: 1,
          data: chartData.dates,
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
        { type: 'inside', xAxisIndex: [0, 1], start: 50, end: 100 },
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: chartData.ohlc,
          itemStyle: {
            color: COLORS.bullish,
            color0: COLORS.bearish,
            borderColor: COLORS.bullish,
            borderColor0: COLORS.bearish,
          },
        },
        { name: 'MA5', type: 'line', data: chartData.ma5, smooth: true, lineStyle: { width: 1, color: COLORS.ma5 }, symbol: 'none' },
        { name: 'MA10', type: 'line', data: chartData.ma10, smooth: true, lineStyle: { width: 1, color: COLORS.ma10 }, symbol: 'none' },
        { name: 'MA20', type: 'line', data: chartData.ma20, smooth: true, lineStyle: { width: 1, color: COLORS.ma20 }, symbol: 'none' },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: chartData.volumes.map((v, i) => ({ value: v, itemStyle: { color: volumeColors[i] } })),
        },
      ],
    };
    
    chartInstance.current.setOption(option);
    
    return () => {
      // Don't dispose on every update
    };
  }, [chartData, data]);

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
  
  console.log('[KLineChart] Rendering chart, data length:', data.length);
  return (
    <div ref={chartRef} style={containerStyle} />
  );
};

export default KLineChart;
