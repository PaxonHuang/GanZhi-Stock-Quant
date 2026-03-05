/**
 * Five Elements (五行) Utility Functions
 * 
 * Provides calculation and advice functions based on the Five Elements
 * theory from Chinese metaphysics for stock market analysis.
 */

import type { StockData } from '@/config/supabase';

/**
 * Element types in Five Elements theory
 */
export type ElementType = '木' | '火' | '土' | '金' | '水';

/**
 * Result of Five Elements advice generation
 */
export interface FiveElementsAdviceResult {
  /** The dominant element */
  element: ElementType;
  /** Color associated with the element */
  color: string;
  /** Investment advice text */
  advice: string;
  /** Number of trading days analyzed */
  daysAnalyzed: number;
  /** Element distribution across days */
  elementDistribution: Record<ElementType, number>;
}

/**
 * Heavenly Stems (天干) to Element mapping
 */
const TIAN_GAN_ELEMENTS: Record<string, ElementType> = {
  '甲': '木',
  '乙': '木',
  '丙': '火',
  '丁': '火',
  '戊': '土',
  '己': '土',
  '庚': '金',
  '辛': '金',
  '壬': '水',
  '癸': '水',
};

/**
 * Earthly Branches (地支) to Element mapping
 */
const DI_ZHI_ELEMENTS: Record<string, ElementType> = {
  '寅': '木',
  '卯': '木',
  '巳': '火',
  '午': '火',
  '辰': '土',
  '戌': '土',
  '丑': '土',
  '未': '土',
  '申': '金',
  '酉': '金',
  '亥': '水',
  '子': '水',
};

/**
 * Month branch to element mapping (based on season)
 */
const MONTH_ELEMENT_MAP: Record<number, ElementType> = {
  1: '水',   // January - Water
  2: '木',   // February - Wood
  3: '木',   // March - Wood
  4: '金',   // April - Metal
  5: '金',   // May - Metal
  6: '土',   // June - Earth
  7: '土',   // July - Earth
  8: '火',   // August - Fire
  9: '火',   // September - Fire
  10: '土',  // October - Earth
  11: '水',  // November - Water
  12: '水',  // December - Water
};

/**
 * Get the element (五行) from a Heavenly Stem (天干)
 * 
 * @param tianGan - The Heavenly Stem character (甲,乙,丙,丁,戊,己,庚,辛,壬,癸)
 * @returns The element (木, 火, 土, 金, 水) or empty string if invalid
 * 
 * @example
 * getElementFromTianGan('甲') // returns '木'
 * getElementFromTianGan('丙') // returns '火'
 */
export function getElementFromTianGan(tianGan: string): string {
  if (!tianGan || tianGan.length === 0) {
    return '';
  }
  
  const stem = tianGan.charAt(0);
  return TIAN_GAN_ELEMENTS[stem] || '';
}

/**
 * Get the element (五行) from an Earthly Branch (地支)
 * 
 * @param diZhi - The Earthly Branch character (子,丑,寅,卯,辰,巳,午,未,申,酉,戌,亥)
 * @returns The element (木, 火, 土, 金, 水) or empty string if invalid
 * 
 * @example
 * getElementFromDiZhi('寅') // returns '木'
 * getElementFromDiZhi('午') // returns '火'
 */
export function getElementFromDiZhi(diZhi: string): string {
  if (!diZhi || diZhi.length === 0) {
    return '';
  }
  
  const branch = diZhi.charAt(0);
  return DI_ZHI_ELEMENTS[branch] || '';
}

/**
 * Extract the day element from a GanZhi day string (日干支)
 * 
 * @param ganZhiDay - The day GanZhi (e.g., "甲子日", "丙午日")
 * @returns The element from the day stem (木, 火, 土, 金, 水) or empty string
 * 
 * @example
 * getDayElement('甲子日') // returns '木'
 * getDayElement('丙午日') // returns '火'
 */
export function getDayElement(ganZhiDay: string): string {
  if (!ganZhiDay || ganZhiDay.length < 2) {
    return '';
  }
  
  // Extract the day stem (first character, excluding '日' suffix if present)
  const dayStem = ganZhiDay.charAt(0);
  return getElementFromTianGan(dayStem);
}

/**
 * Get the element for a specific month based on year GanZhi and month number
 * 
 * Uses the season-based month element calculation combined with year stem influence
 * 
 * @param ganZhiYear - The year GanZhi (e.g., "庚子年", "壬寅年")
 * @param month - The month number (1-12)
 * @returns The element for the month (木, 火, 土, 金, 水) or empty string
 * 
 * @example
 * getMonthElement('庚子年', 3) // returns '木'
 * getMonthElement('壬寅年', 7) // returns '土'
 */
export function getMonthElement(ganZhiYear: string, month: number): string {
  if (!ganZhiYear || month < 1 || month > 12) {
    return '';
  }
  
  // Get base element from month
  const baseElement = MONTH_ELEMENT_MAP[month];
  if (!baseElement) {
    return '';
  }
  
  // Get year stem element for potential adjustment
  const yearStem = ganZhiYear.charAt(0);
  const yearElement = getElementFromTianGan(yearStem);
  
  // Apply seasonal adjustments based on year stem
  // In Chinese metaphysics, certain combinations have special meanings
  if (yearElement === baseElement) {
    // Strengthened - same element as season
    return baseElement;
  }
  
  // Return the seasonal element
  return baseElement;
}

/**
 * Get the color associated with an element
 * 
 * @param element - The Five Element (木, 火, 土, 金, 水)
 * @returns The color hex code or default gray
 * 
 * @example
 * getElementColor('木') // returns '#10B981' (green/emerald)
 * getElementColor('火') // returns '#EF4444' (red)
 */
export function getElementColor(element: string): string {
  const colors: Record<string, string> = {
    '木': '#10B981',  // Green/Emerald
    '火': '#EF4444',  // Red
    '土': '#F59E0B',  // Yellow/Amber
    '金': '#FFFFFF',  // White
    '水': '#1E293B',  // Dark/Black (using dark slate)
  };
  
  return colors[element] || '#6B7280'; // Default gray
}

/**
 * Get investment advice text for a specific element
 * 
 * @param element - The Five Element (木, 火, 土, 金, 水)
 * @returns The investment advice text
 * 
 * @example
 * getElementAdvice('木') // returns '木曰曲直 - 宜于伸展、扩张，注意调整仓位'
 * getElementAdvice('火') // returns '火曰炎上 - 能量充沛，可适度追涨但需谨慎'
 */
export function getElementAdvice(element: string): string {
  const advice: Record<string, string> = {
    '木': '木曰曲直 - 宜于伸展、扩张，注意调整仓位',
    '火': '火曰炎上 - 能量充沛，可适度追涨但需谨慎',
    '土': '土曰稼穑 - 稳定为主，适合中长期持有',
    '金': '金曰从革 - 变革时期，关注突破点位',
    '水': '水曰润下 - 流动性好，注意风险控制',
  };
  
  return advice[element] || '五行平衡 - 保持谨慎观望';
}

/**
 * Generate investment advice based on Five Elements analysis of stock data
 * 
 * Analyzes the distribution of elements across trading days and provides
 * recommendations based on the dominant element.
 * 
 * @param data - Array of StockData objects
 * @returns FiveElementsAdviceResult with element analysis and advice
 * 
 * @example
 * const stockData = await fetchStockData({ limit: 30 });
 * const advice = generateAdvice(stockData);
 * console.log(advice.element); // '木'
 * console.log(advice.advice);  // '木曰曲直 - 宜于伸展、扩张，注意调整仓位'
 */
export function generateAdvice(data: StockData[]): FiveElementsAdviceResult {
  // Initialize distribution counter
  const elementDistribution: Record<ElementType, number> = {
    '木': 0,
    '火': 0,
    '土': 0,
    '金': 0,
    '水': 0,
  };
  
  // Count elements from each trading day
  for (const stock of data) {
    if (stock.ganzi_day) {
      const element = getDayElement(stock.ganzi_day) as ElementType;
      if (element && elementDistribution.hasOwnProperty(element)) {
        elementDistribution[element]++;
      }
    }
  }
  
  // Find the dominant element
  let dominantElement: ElementType = '土'; // Default
  let maxCount = 0;
  
  for (const [element, count] of Object.entries(elementDistribution)) {
    if (count > maxCount) {
      maxCount = count;
      dominantElement = element as ElementType;
    }
  }
  
  // If no data, return default
  if (data.length === 0) {
    return {
      element: '土',
      color: getElementColor('土'),
      advice: '土曰稼穑 - 稳定为主，适合中长期持有',
      daysAnalyzed: 0,
      elementDistribution,
    };
  }
  
  return {
    element: dominantElement,
    color: getElementColor(dominantElement),
    advice: getElementAdvice(dominantElement),
    daysAnalyzed: data.length,
    elementDistribution,
  };
}

/**
 * Get all element colors as a mapping object
 * 
 * @returns Record mapping elements to their colors
 */
export function getAllElementColors(): Record<ElementType, string> {
  return {
    '木': '#10B981',
    '火': '#EF4444',
    '土': '#F59E0B',
    '金': '#FFFFFF',
    '水': '#1E293B',
  };
}

/**
 * Get element name in English
 * 
 * @param element - The Chinese element character
 * @returns English name of the element
 * 
 * @example
 * getElementNameEnglish('木') // returns 'Wood'
 * getElementNameEnglish('火') // returns 'Fire'
 */
export function getElementNameEnglish(element: string): string {
  const names: Record<string, string> = {
    '木': 'Wood',
    '火': 'Fire',
    '土': 'Earth',
    '金': 'Metal',
    '水': 'Water',
  };
  
  return names[element] || 'Unknown';
}
