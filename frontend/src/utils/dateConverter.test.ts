/**
 * Unit tests for dateConverter utility
 */
import { describe, it, expect } from 'vitest';
import { 
  formatDateToGanZhi, 
  formatDateWithGanZhi, 
  getShortGanZhi
} from '@/utils/dateConverter';

describe('dateConverter', () => {
  describe('formatDateToGanZhi', () => {
    it('should convert a valid date to GanZhi format', () => {
      const result = formatDateToGanZhi('2024-01-01');
      
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('day');
      expect(result).toHaveProperty('zodiac');
      expect(typeof result.year).toBe('string');
      expect(typeof result.day).toBe('string');
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-06-15');
      const result = formatDateToGanZhi(date);
      
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('day');
    });

    it('should return valid zodiac animal', () => {
      const result = formatDateToGanZhi('2024-01-01');
      
      // Valid zodiac animals: 鼠牛虎兔龙蛇马羊猴鸡狗猪
      const validZodiacs = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪', '未知'];
      expect(validZodiacs).toContain(result.zodiac);
    });
  });

  describe('formatDateWithGanZhi', () => {
    it('should format date with GanZhi display', () => {
      const result = formatDateWithGanZhi('2024-01-01');
      
      expect(typeof result).toBe('string');
      expect(result).toContain('年');
      expect(result).toContain('日');
    });
  });

  describe('getShortGanZhi', () => {
    it('should return short format without 年 and 日', () => {
      const result = getShortGanZhi('2024-01-01');
      
      expect(typeof result).toBe('string');
      expect(result).not.toContain('年');
      expect(result).not.toContain('日');
      expect(result).toContain('-');
    });
  });
});
