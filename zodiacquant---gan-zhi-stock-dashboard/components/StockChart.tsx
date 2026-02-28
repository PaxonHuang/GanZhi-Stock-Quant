import React, { useMemo, useState } from 'react';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ReferenceLine } from 'recharts';
import { ChartInterval, POI, POI_COLORS, XAxisMode } from '../types';
import { WUXING_COLORS } from '../constants';

interface StockChartProps {
  data: any[];
  interval: ChartInterval;
  chartType?: 'candlestick' | 'timeline';
  onChartTypeChange?: (type: 'candlestick' | 'timeline') => void;
  pois?: POI[];
  xAxisMode?: XAxisMode;
  onXAxisModeChange?: (mode: XAxisMode) => void;
  viewCount?: number;
  onViewCountChange?: (count: number) => void;
}

const CandlestickItem = (props: any) => {
  const { x, width, payload, yAxis } = props;
  if (!payload || !yAxis?.scale) return null;
  
  const { open, close, high, low } = payload;
  if (open === undefined || close === undefined || high === undefined || low === undefined) return null;
  
  const yScale = yAxis.scale;
  const isUp = close >= open;
  const color = isUp ? '#f6465d' : '#0ac193';
  const yOpen = yScale(open);
  const yClose = yScale(close);
  const yHigh = yScale(high);
  const yLow = yScale(low);
  const centerX = x + width / 2;
  const bodyTop = Math.min(yOpen, yClose);
  const bodyBottom = Math.max(yOpen, yClose);
  const bodyHeight = Math.max(Math.abs(yOpen - yClose), 1);
  const shadowWidth = Math.max(1, width * 0.1);
  
  return (
    <g>
      <line x1={centerX} y1={yHigh} x2={centerX} y2={bodyTop} stroke={color} strokeWidth={shadowWidth} />
      <line x1={centerX} y1={bodyBottom} x2={centerX} y2={yLow} stroke={color} strokeWidth={shadowWidth} />
      <rect x={x + shadowWidth / 2} y={bodyTop} width={Math.max(width - shadowWidth, 2)} height={bodyHeight} fill={color} stroke={color} strokeWidth={0.5} rx={1} />
    </g>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    if (!data) return null;
    const isUp = data.close >= data.open;
    const wuxingColor = WUXING_COLORS[data.wuxing || ''] || '#fbbf24';
    return (
      <div className="bg-[#1a1f26] border border-[#30363d] p-3 rounded-lg shadow-2xl text-[11px] font-mono z-50 min-w-[200px]">
        <div className="flex justify-between items-center gap-4 mb-2 border-b border-[#30363d] pb-2">
          <span className="text-[#848e9c] font-bold">{new Date(data.date).toLocaleDateString('zh-CN')}</span>
          <span className="text-yellow-500 font-bold text-sm">{data.ganzhi}</span>
          <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: `${wuxingColor}20`, color: wuxingColor }}>{data.wuxing}</span>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
          <div className="flex justify-between"><span className="text-[#848e9c]">开盘</span><span className="text-white">{data.open?.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-[#848e9c]">收盘</span><span className={isUp ? 'text-[#f6465d]' : 'text-[#0ac193]'}>{data.close?.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-[#848e9c]">最高</span><span className="text-[#f6465d]">{data.high?.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-[#848e9c]">最低</span><span className="text-[#0ac193]">{data.low?.toFixed(2)}</span></div>
        </div>
        <div className="flex justify-between text-[10px] border-t border-[#30363d] pt-2">
          <span className="text-white">MA5:{data.ma5?.toFixed(2) || '--'}</span>
          <span className="text-yellow-400">MA10:{data.ma10?.toFixed(2) || '--'}</span>
          <span className="text-blue-400">MA20:{data.ma20?.toFixed(2) || '--'}</span>
        </div>
      </div>
    );
  }
  return null;
};

const StockChart: React.FC<StockChartProps> = ({ 
  data, 
  interval, 
  pois = [], 
  xAxisMode = 'dual', 
  onXAxisModeChange,
  viewCount: externalViewCount,
  onViewCountChange 
}) => {
  const [internalViewCount, setInternalViewCount] = useState(80);
  
  const viewCount = externalViewCount ?? internalViewCount;
  const setViewCount = (count: number) => {
    if (onViewCountChange) {
      onViewCountChange(count);
    } else {
      setInternalViewCount(count);
    }
  };

  const visibleData = useMemo(() => data.slice(-viewCount), [data, viewCount]);
  const visiblePOIs = useMemo(() => {
    if (!visibleData.length || !pois.length) return [];
    const startDate = visibleData[0].date;
    const endDate = visibleData[visibleData.length - 1].date;
    return pois.filter(poi => poi.date >= startDate && poi.date <= endDate);
  }, [visibleData, pois]);

  const yDomain = useMemo(() => {
    if (visibleData.length === 0) return ['auto', 'auto'];
    const values = visibleData.flatMap(d => [d.high, d.low, d.ma5, d.ma10, d.ma20].filter(v => v != null));
    if (values.length === 0) return [0, 100];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    return [min - range * 0.1, max + range * 0.1];
  }, [visibleData]);

  const latestData = visibleData.length > 0 ? visibleData[visibleData.length - 1] : null;
  const isUp = latestData ? latestData.close >= latestData.open : true;

  const wheelTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  
  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (wheelTimeoutRef.current) {
      clearTimeout(wheelTimeoutRef.current);
    }
    
    wheelTimeoutRef.current = setTimeout(() => {
      const zoomIn = e.deltaY < 0;
      const step = Math.max(2, Math.ceil(viewCount * 0.1));
      const newCount = zoomIn 
        ? Math.max(20, viewCount - step) 
        : Math.min(Math.min(200, data.length), viewCount + step);
      
      if (newCount !== viewCount) {
        setViewCount(newCount);
      }
    }, 50);
  };

  return (
    <div className="h-full w-full cursor-crosshair select-none bg-[#0b0e11]" onWheel={handleWheel}>
      <ResponsiveContainer width="100%" height="75%">
        <ComposedChart data={visibleData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
          {/* 移除了网格线以保持图表简洁 */}
          <XAxis dataKey="date" axisLine={false} tickLine={false} interval={0} minTickGap={30}
            tick={({ x, y, payload, index }) => {
              const step = Math.max(1, Math.ceil(visibleData.length / 10));
              if (index % step !== 0) return null;
              const d = visibleData[index];
              const date = new Date(payload.value);
              if (xAxisMode === 'gregorian') {
                return <g transform={`translate(${x},${y})`}><text x={0} y={0} dy={14} textAnchor="middle" fill="#848e9c" fontSize={10}>{`${date.getMonth() + 1}/${date.getDate()}`}</text></g>;
              } else if (xAxisMode === 'ganzhi') {
                return <g transform={`translate(${x},${y})`}><text x={0} y={0} dy={14} textAnchor="middle" fill={WUXING_COLORS[d?.wuxing || ''] || '#fbbf24'} fontSize={12} fontWeight="bold">{d?.ganzhi || ''}</text></g>;
              }
              return (
                <g transform={`translate(${x},${y})`}>
                  <text x={0} y={0} dy={14} textAnchor="middle" fill="#848e9c" fontSize={9}>{`${date.getMonth() + 1}/${date.getDate()}`}</text>
                  <text x={0} y={0} dy={28} textAnchor="middle" fill={WUXING_COLORS[d?.wuxing || ''] || '#fbbf24'} fontSize={11} fontWeight="bold">{d?.ganzhi || ''}</text>
                </g>
              );
            }}
          />
          <YAxis orientation="right" domain={yDomain} axisLine={false} tickLine={false} mirror={true}
            tick={{ fill: '#848e9c', fontSize: 10 }} tickFormatter={(v) => v.toLocaleString()} allowDataOverflow width={55} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#474d57', strokeWidth: 1 }} isAnimationActive={false} />
          <Bar dataKey="high" shape={<CandlestickItem />} isAnimationActive={false} fill="transparent" />
          <Line type="linear" dataKey="ma5" stroke="#ffffff" dot={false} strokeWidth={1.2} opacity={0.7} isAnimationActive={false} connectNulls />
          <Line type="linear" dataKey="ma10" stroke="#f59e0b" dot={false} strokeWidth={1.2} opacity={0.7} isAnimationActive={false} connectNulls />
          <Line type="linear" dataKey="ma20" stroke="#3b82f6" dot={false} strokeWidth={1.2} opacity={0.7} isAnimationActive={false} connectNulls />
          {latestData && <ReferenceLine y={latestData.close} stroke={isUp ? '#f6465d' : '#0ac193'} strokeWidth={1} />}
          {visiblePOIs.map((poi) => {
            const poiData = visibleData.find(d => d.date === poi.date);
            if (!poiData) return null;
            const color = POI_COLORS[poi.type] || '#fbbf24';
            return <ReferenceLine key={poi.id} y={poi.price || poiData.close} stroke={color} strokeWidth={1.5}
              label={{ value: poi.label, position: 'insideTopLeft', fill: color, fontSize: 9, fontWeight: 'bold' }} />;
          })}
        </ComposedChart>
      </ResponsiveContainer>
      <div className="absolute top-3 right-6 z-20 flex bg-[#1e2329] p-0.5 rounded-lg border border-[#30363d]">
        {(['gregorian', 'ganzhi', 'dual'] as XAxisMode[]).map(mode => (
          <button key={mode} onClick={() => onXAxisModeChange?.(mode)}
            className={`px-2 py-1 text-[9px] rounded transition-all ${xAxisMode === mode ? 'bg-[#3d444d] text-white' : 'text-[#848e9c] hover:text-white'}`}>
            {mode === 'gregorian' ? '公历' : mode === 'ganzhi' ? '干支' : '双轴'}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StockChart;
