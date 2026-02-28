
export const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export const WUXING_COLORS: Record<string, string> = {
  '木': '#4ade80', // Green
  '火': '#f87171', // Red
  '土': '#fbbf24', // Yellow/Gold
  '金': '#f3f4f6', // Silver/White
  '水': '#60a5fa', // Blue
};

export interface StockCategory {
  label: string;
  items: { symbol: string; name: string; suffix: string }[];
}

export const STOCK_GROUPS: StockCategory[] = [
  {
    label: '大盘指数',
    items: [
      { symbol: '000001', name: '上证指数', suffix: 'SH' },
      { symbol: '000300', name: '沪深300', suffix: 'SH' },
      { symbol: '399006', name: '创业板指', suffix: 'SZ' },
    ]
  },
  {
    label: '核心科技',
    items: [
      { symbol: '300750', name: '宁德时代', suffix: 'SZ' },
      { symbol: '688981', name: '中芯国际', suffix: 'SH' },
      { symbol: '002594', name: '比亚迪', suffix: 'SZ' },
      { symbol: '601138', name: '工业富联', suffix: 'SH' },
      { symbol: '002230', name: '科大讯飞', suffix: 'SZ' },
    ]
  },
  {
    label: '消费金融',
    items: [
      { symbol: '600519', name: '贵州茅台', suffix: 'SH' },
      { symbol: '601318', name: '中国平安', suffix: 'SH' },
      { symbol: '000858', name: '五粮液', suffix: 'SZ' },
      { symbol: '600036', name: '招商银行', suffix: 'SH' },
    ]
  }
];

// Flatten for easier lookup
export const SAMPLE_STOCKS = STOCK_GROUPS.flatMap(group => group.items);
