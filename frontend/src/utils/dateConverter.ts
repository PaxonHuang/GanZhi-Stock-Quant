/**
 * GanZhi (干支) Date Converter Utility
 * 
 * Uses lunar-javascript for frontend date conversion.
 * Format: 年干支 + 日干支 (e.g., "庚午年 甲子日")
 */

import { Solar } from 'lunar-javascript';

export interface GanZhiResult {
  year: string;    // e.g., "庚午年"
  day: string;     // e.g., "甲子日"
  zodiac: string;  // e.g., "马"
}

/**
 * Convert a JavaScript Date to GanZhi (干支) format
 */
export function formatDateToGanZhi(date: Date | string): GanZhiResult {
  let solar: Solar;
  
  if (date instanceof Date) {
    solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
  } else {
    const d = new Date(date);
    solar = Solar.fromYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  
  const lunar = solar.getLunar();
  
  return {
    year: lunar.getYearInGanZhi(),  // e.g., "庚午年"
    day: lunar.getDayInGanZhi(),    // e.g., "甲子日"
    zodiac: getZodiacFromYear(lunar.getYearInGanZhi()),
  };
}

/**
 * Get zodiac animal from year GanZhi
 */
function getZodiacFromYear(yearGanzhi: string): string {
  if (!yearGanzhi || yearGanzhi.length < 2) return '未知';
  
  const zhi = yearGanzhi[1]; // Second character is Earthly Branch
  
  const zodiacMap: Record<string, string> = {
    '子': '鼠',
    '丑': '牛',
    '寅': '虎',
    '卯': '兔',
    '辰': '龙',
    '巳': '蛇',
    '午': '马',
    '未': '羊',
    '申': '猴',
    '酉': '鸡',
    '戌': '狗',
    '亥': '猪',
  };
  
  return zodiacMap[zhi] || '未知';
}

/**
 * Format date with GanZhi for display
 */
export function formatDateWithGanZhi(date: Date | string): string {
  const ganzhi = formatDateToGanZhi(date);
  return `${ganzhi.year} ${ganzhi.day}`;
}

/**
 * Get short GanZhi format (without "年" and "日")
 */
export function getShortGanZhi(date: Date | string): string {
  const ganzhi = formatDateToGanZhi(date);
  return `${ganzhi.year.replace('年', '')}-${ganzhi.day.replace('日', '')}`;
}
