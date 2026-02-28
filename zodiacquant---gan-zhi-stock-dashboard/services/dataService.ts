import { StockData, StockInfo, ChartInterval, POI, POIType } from '../types';
import { getGanZhi, getWuXingFromGan } from '../utils/ganzhi';
import supabase from './supabase';

// 计算均线
const calculateMA = (data: StockData[], period: number): (number | null)[] => {
  const ma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ma.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
      ma.push(sum / period);
    }
  }
  return ma;
};

// 生成后备模拟数据
const generateFallbackData = (): StockData[] => {
  const data: StockData[] = [];
  const now = new Date();
  let basePrice = 3000;
  
  for (let i = 120; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    
    const day = date.getDay();
    if (day === 0 || day === 6) continue;

    const volatility = basePrice * 0.015;
    const change = (Math.random() - 0.48) * volatility;
    const open = basePrice + change;
    const close = open + (Math.random() - 0.5) * (volatility * 0.8);
    const high = Math.max(open, close) + Math.random() * (volatility * 0.3);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.3);
    const volume = Math.floor(200000000 + Math.random() * 100000000);
    
    const dateStr = date.toISOString().split('T')[0];
    const ganzhi = getGanZhi(date);
    const wuxing = getWuXingFromGan(ganzhi[0]);

    data.push({
      date: dateStr,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
      amount: Math.floor(volume * close),
      ganzhi,
      wuxing
    });
    
    basePrice = close;
  }
  
  return data;
};

// 从Supabase加载数据
const loadFromSupabase = async (symbol: string): Promise<StockData[] | null> => {
  try {
    const { data, error } = await supabase
      .from('stock_data')
      .select('*')
      .eq('symbol', symbol)
      .order('date', { ascending: true })
      .limit(1000);

    if (error) {
      console.warn('Supabase query failed:', error.message);
      return null;
    }

    if (data && data.length > 0) {
      console.log('Loaded data from Supabase:', data.length, 'records');
      return data.map((row: any) => ({
        date: row.date,
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        close: parseFloat(row.close),
        volume: parseInt(row.volume),
        amount: row.amount ? parseFloat(row.amount) : undefined,
        ganzhi: row.ganzhi,
        wuxing: row.wuxing,
        ma5: row.ma5 ? parseFloat(row.ma5) : null,
        ma10: row.ma10 ? parseFloat(row.ma10) : null,
        ma20: row.ma20 ? parseFloat(row.ma20) : null,
        ma30: row.ma30 ? parseFloat(row.ma30) : null,
        ma60: row.ma60 ? parseFloat(row.ma60) : null,
      }));
    }

    return null;
  } catch (error) {
    console.warn('Supabase connection error:', error);
    return null;
  }
};

// 从JSON文件加载数据
const loadFromJSON = async (): Promise<StockData[]> => {
  try {
    const response = await fetch('/stock_data.json');
    if (response.ok) {
      const jsonData = await response.json();
      if (Array.isArray(jsonData) && jsonData.length > 0) {
        console.log('Loaded data from JSON:', jsonData.length, 'records');
        return jsonData;
      }
    }
  } catch (error) {
    console.warn('Failed to load JSON data:', error);
  }
  return [];
};

// 主加载函数
export const loadStockData = async (symbol: string): Promise<StockInfo | null> => {
  let data: StockData[] = [];
  
  const supabaseData = await loadFromSupabase(symbol);
  if (supabaseData && supabaseData.length > 0) {
    data = supabaseData;
    console.log('Using data from Supabase');
  } else {
    const jsonData = await loadFromJSON();
    if (jsonData.length > 0) {
      data = jsonData;
      console.log('Using data from JSON file');
    } else {
      console.log('Using fallback mock data');
      data = generateFallbackData();
    }
  }
  
  try {
    const ma5 = calculateMA(data, 5);
    const ma10 = calculateMA(data, 10);
    const ma20 = calculateMA(data, 20);
    const ma30 = calculateMA(data, 30);
    const ma60 = calculateMA(data, 60);
    
    const dataWithMA = data.map((d, i) => ({
      ...d,
      ma5: ma5[i],
      ma10: ma10[i],
      ma20: ma20[i],
      ma30: ma30[i],
      ma60: ma60[i],
    }));
    
    const last = data[data.length - 1];
    const secondLast = data[data.length - 2];
    
    if (!secondLast) {
      console.error('Not enough data for change calculation');
      return null;
    }
    
    const change = last.close - secondLast.close;
    const changePercent = (change / secondLast.close) * 100;
    
    let name = '上证指数';
    if (symbol === '000001') name = '上证指数';
    else if (symbol === '000300') name = '沪深300';
    else if (symbol === '399006') name = '创业板指';
    
    return {
      symbol,
      name,
      price: last.close,
      change,
      changePercent,
      history: dataWithMA
    };
  } catch (error) {
    console.error('Error processing stock data:', error);
    return null;
  }
};

// 保存数据到Supabase
export const saveStockDataToSupabase = async (data: StockData[], symbol: string): Promise<boolean> => {
  try {
    await supabase.from('stock_data').delete().eq('symbol', symbol);
    
    const records = data.map(d => ({
      symbol,
      date: d.date,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
      amount: d.amount,
      ganzhi: d.ganzhi,
      wuxing: d.wuxing,
      ma5: d.ma5,
      ma10: d.ma10,
      ma20: d.ma20,
      ma30: d.ma30,
      ma60: d.ma60,
    }));
    
    const { error } = await supabase.from('stock_data').insert(records);
    
    if (error) {
      console.error('Failed to save to Supabase:', error);
      return false;
    }
    
    console.log('Successfully saved', records.length, 'records to Supabase');
    return true;
  } catch (error) {
    console.error('Error saving to Supabase:', error);
    return false;
  }
};

// 生成模拟股票数据
export const generateMockStockData = (symbol: string, name: string): StockInfo => {
  const data: StockData[] = [];
  const now = new Date();
  
  let basePrice = 50 + Math.random() * 500;
  let volatilityScale = 0.02;

  if (name.includes('指数')) {
    if (symbol === '000001') basePrice = 3050;
    if (symbol === '000300') basePrice = 3500;
    if (symbol === '399006') basePrice = 1800;
    volatilityScale = 0.01;
  }

  for (let i = 250; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    
    const day = date.getDay();
    if (day === 0 || day === 6) continue;

    const volatility = basePrice * volatilityScale;
    const change = (Math.random() - 0.48) * volatility;
    const open = basePrice + change;
    const close = open + (Math.random() - 0.5) * (volatility * 0.8);
    const high = Math.max(open, close) + Math.random() * (volatility * 0.3);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.3);
    const volume = name.includes('指数') ? Math.floor(200000000 + Math.random() * 100000000) : Math.floor(Math.random() * 2000000);
    
    const ganzhi = getGanZhi(date);
    const wuxing = getWuXingFromGan(ganzhi[0]);

    data.push({
      date: date.toISOString(),
      open,
      high,
      low,
      close,
      volume,
      ganzhi,
      wuxing
    });
    
    basePrice = close;
  }

  const last = data[data.length - 1];
  const secondLast = data[data.length - 2];
  const change = last.close - secondLast.close;
  const changePercent = (change / secondLast.close) * 100;

  return {
    symbol,
    name,
    price: last.close,
    change,
    changePercent,
    history: data
  };
};

// 24节气
const SOLAR_TERMS = [
  { name: '小寒', month: 0, day: 5 }, { name: '大寒', month: 0, day: 20 },
  { name: '立春', month: 1, day: 4 }, { name: '雨水', month: 1, day: 19 },
  { name: '惊蛰', month: 2, day: 6 }, { name: '春分', month: 2, day: 21 },
  { name: '清明', month: 3, day: 5 }, { name: '谷雨', month: 3, day: 20 },
  { name: '立夏', month: 4, day: 6 }, { name: '小满', month: 4, day: 21 },
  { name: '芒种', month: 5, day: 6 }, { name: '夏至', month: 5, day: 21 },
  { name: '小暑', month: 6, day: 7 }, { name: '大暑', month: 6, day: 23 },
  { name: '立秋', month: 7, day: 8 }, { name: '处暑', month: 7, day: 23 },
  { name: '白露', month: 8, day: 8 }, { name: '秋分', month: 8, day: 23 },
  { name: '寒露', month: 9, day: 8 }, { name: '霜降', month: 9, day: 23 },
  { name: '立冬', month: 10, day: 7 }, { name: '小雪', month: 10, day: 22 },
  { name: '大雪', month: 11, day: 7 }, { name: '冬至', month: 11, day: 22 }
];

const isJiaziDay = (ganzhi: string): boolean => ganzhi === '甲子';

const isNearSolarTerm = (date: Date): { isSolarTerm: boolean; termName?: string } => {
  const month = date.getMonth();
  const day = date.getDate();
  for (const term of SOLAR_TERMS) {
    if (term.month === month && Math.abs(term.day - day) <= 2) {
      return { isSolarTerm: true, termName: term.name };
    }
  }
  return { isSolarTerm: false };
};

// K线聚合函数
export const aggregateData = (data: StockData[], interval: ChartInterval): any[] => {
  if (!data || data.length === 0) return [];
  
  let baseData = data;
  
  if (interval !== 'Daily') {
    const aggregated: StockData[] = [];
    let currentGroup: StockData[] = [];

    const shouldStartNewGroup = (currentData: StockData, nextData?: StockData): boolean => {
      if (!nextData) return true;
      
      if (interval === 'Xun') {
        const currentGz = currentData.ganzhi?.[0];
        return currentGz === '甲' && currentGroup.length > 0;
      } else if (interval === 'Monthly') {
        const currentDate = new Date(currentData.date);
        const nextDate = new Date(nextData.date);
        if (currentDate.getMonth() !== nextDate.getMonth()) return true;
        const currentSolarTerm = isNearSolarTerm(currentDate);
        const nextSolarTerm = isNearSolarTerm(nextDate);
        if (currentSolarTerm.isSolarTerm && !nextSolarTerm.isSolarTerm) return true;
        return false;
      }
      return false;
    };

    for (let i = 0; i < data.length; i++) {
      currentGroup.push(data[i]);
      const nextData = i < data.length - 1 ? data[i + 1] : undefined;
      
      if (shouldStartNewGroup(data[i], nextData)) {
        const open = currentGroup[0].open;
        const close = currentGroup[currentGroup.length - 1].close;
        const high = Math.max(...currentGroup.map(d => d.high));
        const low = Math.min(...currentGroup.map(d => d.low));
        const volume = currentGroup.reduce((sum, d) => sum + d.volume, 0);
        const lastDay = currentGroup[currentGroup.length - 1];
        
        aggregated.push({
          date: lastDay.date,
          open, high, low, close, volume,
          ganzhi: lastDay.ganzhi,
          wuxing: lastDay.wuxing,
        });
        currentGroup = [];
      }
    }
    
    if (currentGroup.length > 0) {
      const lastDay = currentGroup[currentGroup.length - 1];
      aggregated.push({
        date: lastDay.date,
        open: currentGroup[0].open,
        high: Math.max(...currentGroup.map(d => d.high)),
        low: Math.min(...currentGroup.map(d => d.low)),
        close: lastDay.close,
        volume: currentGroup.reduce((sum, d) => sum + d.volume, 0),
        ganzhi: lastDay.ganzhi,
        wuxing: lastDay.wuxing,
      });
    }
    
    baseData = aggregated;
  }

  const ma5 = calculateMA(baseData, 5);
  const ma10 = calculateMA(baseData, 10);
  const ma20 = calculateMA(baseData, 20);
  const ma30 = baseData.length >= 30 ? calculateMA(baseData, 30) : baseData.map(() => null);
  const ma60 = baseData.length >= 60 ? calculateMA(baseData, 60) : baseData.map(() => null);

  return baseData.map((d, i) => ({
    ...d,
    ma5: ma5[i],
    ma10: ma10[i],
    ma20: ma20[i],
    ma30: ma30[i],
    ma60: ma60[i]
  }));
};

// POI检测函数
const detectPOIs = (data: StockData[]): POI[] => {
  const pois: POI[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1];
    const curr = data[i];
    
    if (!curr.ganzhi) continue;
    
    // 甲子日
    if (isJiaziDay(curr.ganzhi)) {
      pois.push({ id: `poi-${curr.date}`, date: curr.date, type: POIType.GANZHI_CYCLE, label: '甲子日', price: curr.close, description: '60年干支循环第一天' });
    }
    
    // 节气日
    const solarTerm = isNearSolarTerm(new Date(curr.date));
    if (solarTerm.isSolarTerm && solarTerm.termName) {
      pois.push({ id: `poi-solar-${curr.date}`, date: curr.date, type: POIType.SOLAR_TERMS, label: solarTerm.termName, price: curr.close, description: `节气: ${solarTerm.termName}` });
    }
    
    // 十字星
    const bodySize = Math.abs(curr.open - curr.close);
    const totalRange = curr.high - curr.low;
    if (totalRange > 0 && bodySize / totalRange < 0.1) {
      pois.push({ id: `poi-doji-${curr.date}`, date: curr.date, type: POIType.DOJI, label: '十字星', price: curr.close, description: '开盘价与收盘价接近' });
    }
    
    // 锤子线
    const upperShadow = curr.high - Math.max(curr.open, curr.close);
    const lowerShadow = Math.min(curr.open, curr.close) - curr.low;
    const body = Math.abs(curr.open - curr.close);
    if (lowerShadow > body * 2 && upperShadow < body) {
      pois.push({ id: `poi-hammer-${curr.date}`, date: curr.date, type: POIType.HAMMER, label: '锤子线', price: curr.close, description: '下影线长于实体2倍以上' });
    }
    
    // 射击之星
    if (upperShadow > body * 2 && lowerShadow < body) {
      pois.push({ id: `poi-shooting-${curr.date}`, date: curr.date, type: POIType.SHOOTING_STAR, label: '射击之星', price: curr.close, description: '上影线长于实体2倍以上' });
    }
    
    // 吞没形态
    if (i > 0 && i < data.length - 1) {
      const prevBody = Math.abs(prev.open - prev.close);
      const prevIsUp = prev.close > prev.open;
      const currIsUp = curr.close > curr.open;
      
      if (!prevIsUp && currIsUp && curr.open < prev.close && curr.close > prev.open && body > prevBody * 1.5) {
        pois.push({ id: `poi-engulf-bull-${curr.date}`, date: curr.date, type: POIType.ENGULFING_BULL, label: '看涨吞没', price: curr.close, description: '阳包阴形态' });
      }
      
      if (prevIsUp && !currIsUp && curr.open > prev.close && curr.close < prev.open && body > prevBody * 1.5) {
        pois.push({ id: `poi-engulf-bear-${curr.date}`, date: curr.date, type: POIType.ENGULFING_BEAR, label: '看跌吞没', price: curr.close, description: '阴包阳形态' });
      }
    }
    
    // 阶段性高点/低点
    if (i > 5 && i < data.length - 5) {
      const prev5High = Math.max(...data.slice(i - 5, i).map(d => d.high));
      const next5High = Math.max(...data.slice(i + 1, i + 6).map(d => d.high));
      const prev5Low = Math.min(...data.slice(i - 5, i).map(d => d.low));
      const next5Low = Math.min(...data.slice(i + 1, i + 6).map(d => d.low));
      
      if (curr.high > prev5High && curr.high > next5High) {
        pois.push({ id: `poi-high-${curr.date}`, date: curr.date, type: POIType.HIGH, label: '阶段高点', price: curr.high, description: '5日内最高价' });
      }
      
      if (curr.low < prev5Low && curr.low < next5Low) {
        pois.push({ id: `poi-low-${curr.date}`, date: curr.date, type: POIType.LOW, label: '阶段低点', price: curr.low, description: '5日内最低价' });
      }
    }
  }
  
  return pois;
};

export const detectStockPOIs = (data: StockData[]): POI[] => detectPOIs(data);
