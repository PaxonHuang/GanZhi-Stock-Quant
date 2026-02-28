
// Fix: WuXing is defined in types.ts, not constants.ts
import { TIANGAN, DIZHI } from '../constants';
import { WuXing } from '../types';

/**
 * Simplified Gan-Zhi calculation for demonstration.
 * In a production environment, this would use a high-precision astronomical library.
 */
export const getGanZhi = (date: Date): string => {
  // Epoch for calculation (approximate)
  const baseDate = new Date(1900, 0, 31);
  const diffDays = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 3600 * 24));
  
  // Day cycle (60 days)
  const dayIndex = (diffDays + 40) % 60; // Offset based on common Gan-Zhi calendars
  const tg = TIANGAN[dayIndex % 10];
  const dz = DIZHI[dayIndex % 12];
  
  return `${tg}${dz}`;
};

export const getWuXingFromGan = (gan: string): WuXing => {
  if (['甲', '乙'].includes(gan)) return WuXing.WOOD;
  if (['丙', '丁'].includes(gan)) return WuXing.FIRE;
  if (['戊', '己'].includes(gan)) return WuXing.EARTH;
  if (['庚', '辛'].includes(gan)) return WuXing.METAL;
  if (['壬', '癸'].includes(gan)) return WuXing.WATER;
  return WuXing.EARTH;
};

export const formatPrice = (price: number) => price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
