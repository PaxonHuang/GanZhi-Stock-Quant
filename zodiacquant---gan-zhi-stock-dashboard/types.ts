export interface StockData {
  date: string; // ISO string
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  amount?: number;
  ganzhi?: string;
  wuxing?: string;
  yearGz?: string;
  monthGz?: string;
  // 移动平均线
  ma5?: number | null;
  ma10?: number | null;
  ma20?: number | null;
  ma30?: number | null;
  ma60?: number | null;
  // 成交量均线
  vol_ma5?: number | null;
}

export interface StockInfo {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  history: StockData[];
}

// K线周期类型
export type ChartInterval = 'Daily' | 'Xun' | 'Monthly' | 'Quarterly' | 'Yearly';

// 五行枚举
export enum WuXing {
  WOOD = '木',
  FIRE = '火',
  EARTH = '土',
  METAL = '金',
  WATER = '水'
}

// 兴趣点(POI)类型
export enum POIType {
  // 常规标记
  BREAKTHROUGH = 'breakthrough',      // 突破
  SUPPORT = 'support',                // 支撑
  RESISTANCE = 'resistance',          // 阻力
  HIGH = 'high',                      // 高点
  LOW = 'low',                        // 低点
  // K线形态
  DOJI = 'doji',                      // 十字星
  HAMMER = 'hammer',                  // 锤子线
  SHOOTING_STAR = 'shooting_star',    // 射击之星
  ENGULFING_BULL = 'engulfing_bull',  // 吞没(涨)
  ENGULFING_BEAR = 'engulfing_bear',  // 吞没(跌)
  // 特殊日期
  SOLAR_TERMS = 'solar_terms',        // 节气日
  FESTIVAL = 'festival',              // 节日
  GANZHI_CYCLE = 'ganzhi_cycle',      // 干支周期转换日
}

// 兴趣点颜色配置
export const POI_COLORS: Record<POIType, string> = {
  [POIType.BREAKTHROUGH]: '#f59e0b',   // 橙色
  [POIType.SUPPORT]: '#10b981',        // 绿色
  [POIType.RESISTANCE]: '#ef4444',      // 红色
  [POIType.HIGH]: '#f43f5e',           // 红粉色
  [POIType.LOW]: '#06b6d4',            // 青色
  [POIType.DOJI]: '#8b5cf6',           // 紫色
  [POIType.HAMMER]: '#22c55e',         // 绿色
  [POIType.SHOOTING_STAR]: '#eab308',  // 黄色
  [POIType.ENGULFING_BULL]: '#22c55e', // 绿色
  [POIType.ENGULFING_BEAR]: '#ef4444', // 红色
  [POIType.SOLAR_TERMS]: '#fbbf24',    // 金色
  [POIType.FESTIVAL]: '#ec4899',       // 粉色
  [POIType.GANZHI_CYCLE]: '#6366f1',   // 靛蓝色
};

// 兴趣点接口
export interface POI {
  id: string;
  date: string;           // 对应的交易日日期
  type: POIType;
  label: string;          // 自定义标签
  price?: number;        // 相关价格(可选)
  description?: string; // 描述信息
  createdAt?: string;    // 创建时间
}

// K线聚合选项
export interface KLineAggregationOptions {
  interval: ChartInterval;
  data: StockData[];
}

// X轴显示模式
export type XAxisMode = 'gregorian' | 'ganzhi' | 'dual';

// 图表配置
export interface ChartConfig {
  xAxisMode: XAxisMode;
  showVolume: boolean;
  showMA: boolean[];
  showPOI: boolean;
}
