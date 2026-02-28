import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, LineData, ColorType, CrosshairMode } from 'lightweight-charts';

interface KLineChartProps {
  symbol?: string;
  interval?: string;
}

// K线数据接口
interface KLineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const KLineChart: React.FC<KLineChartProps> = ({ symbol = '000001.SS', interval = '1d' }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ma5SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma10SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  
  const [chartData, setChartData] = useState<KLineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMA5, setShowMA5] = useState(true);
  const [showMA10, setShowMA10] = useState(true);
  const [showMA20, setShowMA20] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');

  // 模拟获取K线数据
  const fetchKLineData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await new Promise<KLineData[]>((resolve) => {
        setTimeout(() => {
          const result: KLineData[] = [];
          let basePrice = symbol === '000001.SS' ? 3000 : 170;
          
          const now = new Date();
          
          for (let i = 100; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(now.getDate() - i);
            
            const day = date.getDay();
            if (day === 0 || day === 6) continue;
            
            const volatility = basePrice * 0.02;
            const change = (Math.random() - 0.48) * volatility;
            const open = basePrice + change;
            const close = open + (Math.random() - 0.5) * (volatility * 0.8);
            const high = Math.max(open, close) + Math.random() * (volatility * 0.3);
            const low = Math.min(open, close) - Math.random() * (volatility * 0.3);
            const volume = Math.floor(1000000 + Math.random() * 10000000);
            
            result.push({
              time: Math.floor(date.getTime() / 1000),
              open: parseFloat(open.toFixed(2)),
              high: parseFloat(high.toFixed(2)),
              low: parseFloat(low.toFixed(2)),
              close: parseFloat(close.toFixed(2)),
              volume: volume
            });
            
            basePrice = close;
          }
          
          resolve(result);
        }, 500);
      });
      
      setChartData(data);
    } catch (err) {
      setError('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  // 初始化图表
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0b0e11' },
        textColor: '#848e9c',
        fontFamily: 'Roboto Mono, monospace',
      },
      grid: {
        vertLines: { color: '#1c2128' },
        horzLines: { color: '#1c2128' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#474d57', width: 1, style: 2, labelBackgroundColor: '#30363d' },
        horzLine: { color: '#474d57', width: 1, style: 2, labelBackgroundColor: '#30363d' },
      },
      rightPriceScale: {
        borderColor: '#30363d',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      timeScale: {
        borderColor: '#30363d',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // K线系列
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#f6465d',
      downColor: '#0ac193',
      borderUpColor: '#f6465d',
      borderDownColor: '#0ac193',
      wickUpColor: '#f6465d',
      wickDownColor: '#0ac193',
    });
    candlestickSeriesRef.current = candlestickSeries;

    // 成交量系列
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeriesRef.current = volumeSeries;

    // MA线系列
    ma5SeriesRef.current = chart.addLineSeries({
      color: '#ffffff', lineWidth: 1, priceLineVisible: false, crosshairMarkerVisible: false, lastValueVisible: false,
    });
    ma10SeriesRef.current = chart.addLineSeries({
      color: '#f59e0b', lineWidth: 1, priceLineVisible: false, crosshairMarkerVisible: false, lastValueVisible: false,
    });
    ma20SeriesRef.current = chart.addLineSeries({
      color: '#3b82f6', lineWidth: 1, priceLineVisible: false, crosshairMarkerVisible: false, lastValueVisible: false,
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // 更新图表数据
  useEffect(() => {
    if (!chartData.length || !candlestickSeriesRef.current) return;

    const candleData: CandlestickData[] = chartData.map(d => ({
      time: d.time as any, open: d.open, high: d.high, low: d.low, close: d.close,
    }));

    const volumeData: HistogramData[] = chartData.map(d => ({
      time: d.time as any,
      value: d.volume || 0,
      color: d.close >= d.open ? 'rgba(246, 70, 93, 0.5)' : 'rgba(10, 193, 147, 0.5)',
    }));

    const calculateMA = (period: number): LineData[] => {
      return chartData.map((d, i) => {
        if (i < period - 1) return { time: d.time as any, value: NaN };
        const sum = chartData.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
        return { time: d.time as any, value: sum / period };
      });
    };

    candlestickSeriesRef.current.setData(candleData);
    volumeSeriesRef.current?.setData(volumeData);
    ma5SeriesRef.current?.setData(calculateMA(5));
    ma10SeriesRef.current?.setData(calculateMA(10));
    ma20SeriesRef.current?.setData(calculateMA(20));

    ma5SeriesRef.current?.applyOptions({ visible: showMA5 });
    ma10SeriesRef.current?.applyOptions({ visible: showMA10 });
    ma20SeriesRef.current?.applyOptions({ visible: showMA20 });
    volumeSeriesRef.current?.applyOptions({ visible: showVolume });
    candlestickSeriesRef.current.applyOptions({ visible: chartType === 'candlestick' });

    chartRef.current?.timeScale().fitContent();
  }, [chartData, showMA5, showMA10, showMA20, showVolume, chartType]);

  useEffect(() => { fetchKLineData(); }, [fetchKLineData]);

  if (loading) return <div className="flex items-center justify-center h-full bg-[#0b0e11]"><div className="text-[#848e9c]">Loading...</div></div>;
  if (error) return <div className="flex items-center justify-center h-full bg-[#0b0e11]"><div className="text-red-500">{error}</div></div>;

  return (
    <div className="flex flex-col h-full bg-[#0b0e11]">
      <div className="flex items-center gap-4 p-3 bg-[#14171c] border-b border-[#1e2329]">
        <div className="flex bg-[#1e2329] rounded-lg p-0.5">
          <button onClick={() => setChartType('candlestick')} className={`px-3 py-1 text-xs rounded-md ${chartType === 'candlestick' ? 'bg-[#3d444d] text-white' : 'text-[#848e9c]'}`}>K线</button>
          <button onClick={() => setChartType('line')} className={`px-3 py-1 text-xs rounded-md ${chartType === 'line' ? 'bg-[#3d444d] text-white' : 'text-[#848e9c]'}`}>折线</button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showMA5} onChange={e => setShowMA5(e.target.checked)} className="w-3 h-3" /><span className="text-white">MA5</span></label>
          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showMA10} onChange={e => setShowMA10(e.target.checked)} className="w-3 h-3" /><span className="text-yellow-400">MA10</span></label>
          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showMA20} onChange={e => setShowMA20(e.target.checked)} className="w-3 h-3" /><span className="text-blue-400">MA20</span></label>
          <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={showVolume} onChange={e => setShowVolume(e.target.checked)} className="w-3 h-3" /><span className="text-[#848e9c]">成交量</span></label>
        </div>
        <button onClick={fetchKLineData} className="ml-auto px-3 py-1 text-xs bg-[#1e2329] text-[#848e9c] rounded">刷新</button>
      </div>
      <div ref={chartContainerRef} className="flex-1" />
    </div>
  );
};

export default KLineChart;
