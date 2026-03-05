/**
 * Five Elements Investment Advice Component
 * Displays based on Five Elements (五行) theory
 */
import React, { useMemo } from 'react';
import type { StockData } from '@/config/supabase';
import { generateAdvice, getElementColor, getElementNameEnglish } from '@/utils/fiveElements';

interface FiveElementsAdviceProps {
  data: StockData[];
}

const ELEMENT_ICONS: Record<string, string> = {
  '木': '🌲',
  '火': '🔥',
  '土': '🌍',
  '金': '⚔️',
  '水': '🌊',
};

export const FiveElementsAdvice: React.FC<FiveElementsAdviceProps> = ({ data }) => {
  const adviceResult = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }
    return generateAdvice(data);
  }, [data]);

  if (!adviceResult) {
    return (
      <div className="bg-fin-card border border-fin-border rounded-lg p-6">
        <h2 className="text-lg font-bold text-gold mb-4">五行投资建议</h2>
        <div className="text-center text-text-muted py-8">
          <div className="text-4xl mb-2">☯️</div>
          <div>暂无数据</div>
          <div className="text-xs mt-1">导入股票数据后显示五行分析</div>
        </div>
      </div>
    );
  }

  const { element, color, advice, daysAnalyzed, elementDistribution } = adviceResult;

  return (
    <div className="bg-fin-card border border-fin-border rounded-lg p-6">
      <h2 className="text-lg font-bold text-gold mb-4">五行投资建议</h2>
      
      {/* Main Advice Section */}
      <div className="flex items-start gap-4 mb-6">
        <div 
          className="w-16 h-16 rounded-lg flex items-center justify-center text-3xl"
          style={{ backgroundColor: `${color}20`, border: `2px solid ${color}` }}
        >
          {ELEMENT_ICONS[element] || '☯️'}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl font-bold" style={{ color }}>{element}</span>
            <span className="text-text-secondary">({getElementNameEnglish(element)})</span>
          </div>
          <div className="text-text-primary text-sm">{advice}</div>
          <div className="text-xs text-text-muted mt-1">基于 {daysAnalyzed} 个交易日分析</div>
        </div>
      </div>

      {/* Element Distribution */}
      <div className="border-t border-fin-border pt-4">
        <h3 className="text-sm font-medium text-text-secondary mb-3">干支五行分布</h3>
        <div className="grid grid-cols-5 gap-2">
          {(['木', '火', '土', '金', '水'] as const).map((el) => {
            const count = elementDistribution[el];
            const percentage = daysAnalyzed > 0 ? (count / daysAnalyzed * 100).toFixed(1) : '0';
            const elColor = getElementColor(el);
            return (
              <div key={el} className="text-center">
                <div 
                  className="h-16 rounded flex items-end justify-center pb-1 mb-1"
                  style={{ backgroundColor: `${elColor}20` }}
                >
                  <div 
                    className="w-full mx-1 rounded-t transition-all"
                    style={{ 
                      height: `${percentage}%`, 
                      maxHeight: '48px',
                      backgroundColor: elColor,
                      minHeight: count > 0 ? '4px' : '0'
                    }}
                  />
                </div>
                <div className="text-xs">
                  <div style={{ color: elColor }}>{el}</div>
                  <div className="text-text-muted">{count}天</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 pt-3 border-t border-fin-border">
        <p className="text-xs text-text-muted">
          ⚠️ 五行分析仅供参考，不构成投资建议。投资有风险，入市需谨慎。
        </p>
      </div>
    </div>
  );
};

export default FiveElementsAdvice;
