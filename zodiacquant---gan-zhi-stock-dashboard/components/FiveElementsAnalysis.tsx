import React from 'react';
import { StockInfo } from '../types';
import { WUXING_COLORS } from '../constants';

interface AnalysisProps {
  stock: StockInfo;
}

const FiveElementsAnalysis: React.FC<AnalysisProps> = ({ stock }) => {
  // 基于当日干支的简易分析
  const today = new Date();
  const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
  const yearGz = TIANGAN[(today.getFullYear() - 1984) % 10] + DIZHI[(today.getFullYear() - 1984) % 12];
  const dayGz = TIANGAN[Math.floor((today.getTime() - new Date('1984-01-01').getTime()) / (1000 * 60 * 60 * 24)) % 10] + 
                DIZHI[Math.floor((today.getTime() - new Date('1984-01-01').getTime()) / (1000 * 60 * 60 * 24)) % 12];

  // 五行对应关系
  const wuxingMap: Record<string, string> = {
    '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土',
    '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水',
    '子': '水', '丑': '土', '寅': '木', '卯': '木', '辰': '土',
    '巳': '火', '午': '火', '未': '土', '申': '金', '酉': '金', '戌': '土', '亥': '水'
  };

  // 生肖对应的行业
  const industryMap: Record<string, string> = {
    '子': '金融、科技', '丑': '农业、建筑', '寅': '科技、通讯',
    '卯': '纺织、环保', '辰': '地产、仓储', '巳': '餐饮、能源',
    '午': '教育、互联网', '未': '农业、餐饮', '申': '金融、交通',
    '酉': '珠宝、军工', '戌': '法律、矿业', '亥': '医药、养殖'
  };

  const currentWuxing = wuxingMap[dayGz[1]] || '土';
  const industry = industryMap[dayGz[1]] || '综合';
  const isUp = stock.changePercent >= 0;
  
  // 生成运势分析
  const getFortune = () => {
    const changeAbs = Math.abs(stock.changePercent);
    if (changeAbs > 3) return { level: '大吉', color: 'text-green-400', desc: '今日走势强劲，或有突破性行情' };
    if (changeAbs > 1.5) return { level: '吉', color: 'text-yellow-400', desc: '市场活跃，波动适中' };
    if (changeAbs > 0.5) return { level: '平', color: 'text-blue-400', desc: '走势平稳，观望为主' };
    return { level: '淡', color: 'text-gray-400', desc: '市场观望情绪浓厚' };
  };
  
  const fortune = getFortune();

  return (
    <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="text-yellow-500">☯</span> 五行玄学分析
        </h3>
        <span className="text-xs text-[#58a6ff]">
          实时
        </span>
      </div>

      <div className="flex-1 overflow-y-auto stock-scrollbar space-y-4">
        {/* 五行分布 */}
        <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
          {Object.entries(WUXING_COLORS).map(([name, color]) => (
            <div key={name} className="flex flex-col items-center">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center mb-1 text-black font-bold text-xs"
                style={{ backgroundColor: currentWuxing === name ? color : '#333', opacity: currentWuxing === name ? 1 : 0.5 }}
              >
                {name}
              </div>
              <div className="text-[#8b949e]">
                {name === currentWuxing ? '当令' : `${Math.floor(Math.random() * 30 + 20)}%`}
              </div>
            </div>
          ))}
        </div>

        {/* 今日运势 */}
        <div className="p-4 bg-[#161b22] rounded-lg border-l-4 border-yellow-500">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#8b949e]">今日气运</span>
            <span className={`text-sm font-bold ${fortune.color}`}>{fortune.level}</span>
          </div>
          <p className="text-sm text-[#c9d1d9] italic leading-relaxed">
            {fortune.desc}
          </p>
        </div>

        {/* 干支信息 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[#161b22] rounded-lg">
            <div className="text-xs text-[#8b949e] mb-1">岁次</div>
            <div className="text-yellow-500 font-bold text-lg">{yearGz}</div>
            <div className="text-xs text-[#8b949e]">{today.getFullYear()}年</div>
          </div>
          <div className="p-3 bg-[#161b22] rounded-lg">
            <div className="text-xs text-[#8b949e] mb-1">今日值日</div>
            <div className="text-yellow-500 font-bold text-lg">{dayGz}</div>
            <div className="text-xs text-[#8b949e]">{currentWuxing}气当令</div>
          </div>
        </div>

        {/* 行业提示 */}
        <div className="p-3 bg-[#161b22] rounded-lg">
          <div className="text-xs text-[#8b949e] mb-2">宜关注行业</div>
          <div className="flex flex-wrap gap-2">
            {industry.split('、').map((ind, idx) => (
              <span 
                key={idx}
                className="px-2 py-1 rounded text-xs"
                style={{ 
                  backgroundColor: `${WUXING_COLORS[currentWuxing as keyof typeof WUXING_COLORS] || '#666'}20`,
                  color: WUXING_COLORS[currentWuxing as keyof typeof WUXING_COLORS] || '#999'
                }}
              >
                {ind}
              </span>
            ))}
          </div>
        </div>

        {/* 盘面解读 */}
        <div className="p-3 bg-[#161b22] rounded-lg">
          <div className="text-xs text-[#8b949e] mb-2">盘面解读</div>
          <div className="text-sm text-[#c9d1d9]">
            {stock.name}当前 
            <span className={isUp ? 'text-[#f6465d]' : 'text-[#0ac193]'}>
              {isUp ? '上涨' : '下跌'}
            </span>
            {' '}{Math.abs(stock.changePercent).toFixed(2)}%，
            收盘于{stock.price.toFixed(2)}。
            {isUp 
              ? '阳气旺盛，多头排列，可顺势而为。' 
              : '阴气渐盛，宜静观其变，择机布局。'}
          </div>
        </div>
        
        {/* 气运罗盘 */}
        <div className="mt-4 pt-4 border-t border-[#30363d]">
          <h4 className="text-xs font-bold text-[#8b949e] mb-2">气运罗盘</h4>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-1 rounded bg-red-900/30 text-red-400 text-[10px] border border-red-500/30">
              {currentWuxing}旺{currentWuxing === '木' ? '火' : currentWuxing === '火' ? '土' : currentWuxing === '土' ? '金' : currentWuxing === '金' ? '水' : '木'}
            </span>
            <span className="px-2 py-1 rounded bg-green-900/30 text-green-400 text-[10px] border border-green-500/30">
              {dayGz}日主
            </span>
            <span className="px-2 py-1 rounded bg-blue-900/30 text-blue-400 text-[10px] border border-blue-500/30">
              宜{isUp ? '进攻' : '防守'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FiveElementsAnalysis;
