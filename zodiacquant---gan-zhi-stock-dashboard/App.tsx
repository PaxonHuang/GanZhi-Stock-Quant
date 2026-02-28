import React, { useState, useEffect, useMemo } from 'react';
import { STOCK_GROUPS } from './constants';
import { StockInfo, ChartInterval, POI, XAxisMode } from './types';
import { loadStockData, aggregateData, detectStockPOIs } from './services/dataService';
import StockChart from './components/StockChart';
import KLineChart from './components/KLineChart';
import FiveElementsAnalysis from './components/FiveElementsAnalysis';
import { Search, Bell, Settings, Activity, TrendingUp, Cpu, Landmark, BarChart2, Layers, Calendar } from 'lucide-react';

const getCurrentGanzhi = () => {
  const now = new Date();
  const year = now.getFullYear();
  const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const yearOffset = year - 1984;
  const yearGz = TIANGAN[yearOffset % 10] + DIZHI[yearOffset % 12];
  const baseDate = new Date('1984-01-01');
  const days = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const dayGz = TIANGAN[days % 10] + DIZHI[days % 12];
  const hour = now.getHours();
  const shichenIdx = Math.floor((hour + 1) / 2) % 12;
  const shichenGz = DIZHI[shichenIdx];
  const shichenNames: Record<string, string> = {
    '子': '子时', '丑': '丑时', '寅': '寅时', '卯': '卯时',
    '辰': '辰时', '巳': '巳时', '午': '午时', '未': '未时',
    '申': '申时', '酉': '酉时', '戌': '戌时', '亥': '亥时'
  };
  return { yearGz, dayGz, shichen: shichenNames[shichenGz], shichenTime: `${hour.toString().padStart(2, '0')}:00` };
};

const App: React.FC = () => {
  const [selectedSymbol, setSelectedSymbol] = useState('000001');
  const [interval, setInterval] = useState<ChartInterval>('Daily');
  const [stocks, setStocks] = useState<Record<string, StockInfo>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentGanzhi, setCurrentGanzhi] = useState(getCurrentGanzhi());
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>('dual');
  const [pois, setPois] = useState<POI[]>([]);
  const [viewCount, setViewCount] = useState(80);
  const [chartEngine, setChartEngine] = useState<'recharts' | 'lightweight'>('recharts');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const stockData = await loadStockData('000001');
        if (stockData) {
          setStocks({ '000001': stockData });
          const detectedPOIs = detectStockPOIs(stockData.history);
          setPois(detectedPOIs);
        }
      } catch (error) {
        console.error('Error loading stock data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    const timer = setInterval(() => setCurrentGanzhi(getCurrentGanzhi()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentStock = stocks[selectedSymbol];
  const aggregatedHistory = useMemo(() => {
    if (!currentStock) return [];
    return aggregateData(currentStock.history, interval);
  }, [currentStock, interval]);
  const latestK = aggregatedHistory.length > 0 ? aggregatedHistory[aggregatedHistory.length - 1] : null;

  const filteredGroups = useMemo(() => {
    if (!searchQuery) return STOCK_GROUPS;
    const query = searchQuery.toLowerCase();
    return STOCK_GROUPS.map(group => ({
      ...group,
      items: group.items.filter(item => item.name.toLowerCase().includes(query) || item.symbol.toLowerCase().includes(query))
    })).filter(group => group.items.length > 0);
  }, [searchQuery]);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0d1117] gap-4">
      <div className="relative">
        <Activity className="w-12 h-12 text-yellow-500 animate-spin" />
        <div className="absolute inset-0 w-12 h-12 border-2 border-yellow-500/30 rounded-full animate-ping"></div>
      </div>
      <div className="text-yellow-500 font-serif text-xl tracking-[0.4em] uppercase">阴阳开合 · 启盘运算</div>
      <div className="text-gray-500 text-sm font-mono mt-2">正在加载上证指数数据...</div>
    </div>
  );

  if (!currentStock) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0d1117] gap-4">
      <Activity className="w-12 h-12 text-red-500" />
      <div className="text-red-500 font-serif text-xl">数据加载失败</div>
    </div>
  );

  const groupIcons: Record<string, React.ReactNode> = { '大盘指数': <TrendingUp className="w-3 h-3" />, '核心科技': <Cpu className="w-3 h-3" />, '消费金融': <Landmark className="w-3 h-3" /> };
  const isUp = currentStock.change >= 0;
  const upColor = isUp ? 'text-[#f6465d]' : 'text-[#0ac193]';

  // 获取可见数据（与K线图同步）
  const visibleHistory = aggregatedHistory.slice(-viewCount);

  return (
    <div className="flex h-screen w-screen overflow-hidden text-sm bg-[#0b0e11] selection:bg-yellow-500/30">
      {/* 左侧侧边栏 */}
      <aside className="w-60 border-r border-[#1e2329] flex flex-col bg-[#14171c] shadow-2xl z-20">
        <div className="p-4 flex items-center gap-3 border-b border-[#1e2329] bg-gradient-to-r from-[#14171c] to-[#1a1f26]">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-1.5 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.3)]">
            <BarChart2 className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-[0.15em] font-serif">ZODIAC QUANT</h1>
            <div className="text-[9px] text-[#848e9c] tracking-[0.1em]">干支量化 · 古法金融</div>
          </div>
        </div>
        <div className="p-3 border-b border-[#1e2329]">
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-[#848e9c]" />
            <input type="text" placeholder="代码/名称/拼音" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg py-2 pl-9 pr-3 text-[11px] text-white placeholder-[#484f58] focus:outline-none focus:border-yellow-500/50" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto stock-scrollbar">
          {filteredGroups.map((group) => (
            <div key={group.label} className="border-b border-[#1e2329]">
              <div className="px-3 py-2 flex items-center gap-2 text-[10px] text-[#848e9c] font-bold uppercase tracking-wider bg-[#1a1f26]/50">
                {groupIcons[group.label]}<span>{group.label}</span>
              </div>
              <div>
                {group.items.map((item) => {
                  const stock = stocks[item.symbol];
                  return (
                    <button key={item.symbol} onClick={() => setSelectedSymbol(item.symbol)}
                      className={`w-full px-3 py-2 flex items-center justify-between hover:bg-[#1e2329] transition-colors ${selectedSymbol === item.symbol ? 'bg-[#1e2329] border-l-2 border-yellow-500' : ''}`}>
                      <div className="flex flex-col items-start">
                        <span className="text-white text-[11px] font-bold">{item.name}</span>
                        <span className="text-[#484f58] text-[9px] font-mono">{item.symbol}.{item.suffix}</span>
                      </div>
                      {stock && (
                        <div className="flex flex-col items-end">
                          <span className={`text-[10px] font-bold ${stock.change >= 0 ? 'text-[#f6465d]' : 'text-[#0ac193]'}`}>{stock.price.toFixed(2)}</span>
                          <span className={`text-[9px] font-bold ${stock.change >= 0 ? 'text-[#f6465d]' : 'text-[#0ac193]'}`}>{stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-[#1e2329] text-center">
          <div className="text-[9px] text-[#474d57] font-mono">ZodiacQuant v2.0</div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col bg-[#0b0e11] min-w-0">
        {/* 顶部导航栏 */}
        <header className="h-14 border-b border-[#1e2329] flex items-center justify-between px-6 bg-[#14171c]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-white font-serif flex items-center gap-2">
                  {currentStock.name}
                  <span className="font-mono text-[11px] text-[#848e9c] font-normal bg-[#1e2329] px-2 py-0.5 rounded">{currentStock.symbol}</span>
                </h2>
              </div>
              <div className="flex items-baseline gap-3 ml-2">
                <span className={`text-2xl font-mono font-bold tracking-tight ${upColor}`}>{currentStock.price.toFixed(2)}</span>
                <div className={`flex flex-col text-[11px] font-mono font-bold leading-tight ${upColor}`}>
                  <span>{currentStock.change >= 0 ? '+' : ''}{currentStock.change.toFixed(2)}</span>
                  <span>{currentStock.changePercent >= 0 ? '+' : ''}{currentStock.changePercent.toFixed(2)}%</span>
                </div>
              </div>
            </div>
            <div className="h-8 w-px bg-[#1e2329]" />
            <div className="flex bg-[#1e2329] p-0.5 rounded-lg border border-[#30363d]">
              {chartEngine === 'recharts' && (
                <>
                  {([{ key: 'Daily', label: '日线', icon: Calendar }, { key: 'Xun', label: '旬K', icon: Layers }, { key: 'Monthly', label: '月线', icon: BarChart2 }] as const).map(({ key, label, icon: Icon }) => (
                    <button key={key} onClick={() => setInterval(key as ChartInterval)}
                      className={`px-3 py-1.5 text-[11px] rounded-md transition-all font-bold flex items-center gap-1.5 ${interval === key ? 'bg-[#3d444d] text-white shadow-sm' : 'text-[#848e9c] hover:text-white hover:bg-[#262c36]'}`}>
                      <Icon className="w-3 h-3" />{label}
                    </button>
                  ))}
                </>
              )}
              <button onClick={() => setChartEngine(chartEngine === 'recharts' ? 'lightweight' : 'recharts')}
                className="px-3 py-1.5 text-[11px] rounded-md transition-all font-bold flex items-center gap-1.5 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">
                {chartEngine === 'recharts' ? '专业K线' : '标准K线'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-[10px] font-mono text-[#848e9c] bg-[#1e2329]/80 px-4 py-2 rounded-lg border border-[#30363d]">
              <div className="flex gap-3">
                <div className="flex flex-col items-center"><span className="text-[8px] opacity-30">岁次</span><span className="text-white font-bold">{currentGanzhi.yearGz}</span></div>
                <div className="flex flex-col items-center border-l border-white/5 pl-3"><span className="text-[8px] opacity-30">值日</span><span className="text-yellow-500 font-bold underline decoration-yellow-500/20">{currentGanzhi.dayGz}</span></div>
                <div className="flex flex-col items-center border-l border-white/5 pl-3"><span className="text-[8px] opacity-30">时辰</span><span className="text-white font-bold">{currentGanzhi.shichen}</span></div>
              </div>
            </div>
            <div className="flex gap-3">
              <Bell className="w-5 h-5 text-[#848e9c] hover:text-white cursor-pointer transition-all" />
              <Settings className="w-5 h-5 text-[#848e9c] hover:text-white cursor-pointer transition-all" />
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-bold text-xs shadow-lg">ZQ</div>
            </div>
          </div>
        </header>

        {/* K线图表区域 */}
        <div className="flex-1 flex">
          {/* 左侧K线区 */}
          <div className="flex-1 flex flex-col">
            {/* 股票信息栏 */}
            <div className="h-10 border-b border-[#1e2329]/50 flex items-center px-6 bg-[#14171c]/50">
              <div className="flex items-center gap-6 text-[11px]">
                {latestK && (
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-500 font-bold text-sm">{latestK.ganzhi}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: '#fbbf2420', color: '#fbbf24' }}>{latestK.wuxing}</span>
                  </div>
                )}
                <div className="flex gap-4">
                  <span className="text-[#848e9c]">开:</span><span className="text-white w-14 text-right">{latestK?.open?.toFixed(2) || '--'}</span>
                  <span className="text-[#848e9c]">高:</span><span className="text-[#f6465d] w-14 text-right font-bold">{latestK?.high?.toFixed(2) || '--'}</span>
                  <span className="text-[#848e9c]">低:</span><span className="text-[#0ac193] w-14 text-right font-bold">{latestK?.low?.toFixed(2) || '--'}</span>
                  <span className="text-[#848e9c]">收:</span><span className={`w-14 text-right font-bold ${(latestK?.close || 0) >= (latestK?.open || 0) ? 'text-[#f6465d]' : 'text-[#0ac193]'}`}>{latestK?.close?.toFixed(2) || '--'}</span>
                </div>
                <div className="flex gap-4 border-l border-white/10 pl-4">
                  <span className="text-[#848e9c]">成交量:</span><span className="text-yellow-500/80 w-20 text-right">{latestK ? (latestK.volume / 100000000).toFixed(2) + '亿' : '--'}</span>
                </div>
                <div className="flex gap-3 border-l border-white/10 pl-4 text-[10px]">
                  <span className="flex items-center gap-1"><div className="w-2 h-0.5 bg-white"></div><span className="text-[#848e9c]">MA5:</span><span className="text-white">{latestK?.ma5?.toFixed(2) || '--'}</span></span>
                  <span className="flex items-center gap-1"><div className="w-2 h-0.5 bg-yellow-400"></div><span className="text-[#848e9c]">MA10:</span><span className="text-yellow-400">{latestK?.ma10?.toFixed(2) || '--'}</span></span>
                  <span className="flex items-center gap-1"><div className="w-2 h-0.5 bg-blue-400"></div><span className="text-[#848e9c]">MA20:</span><span className="text-blue-400">{latestK?.ma20?.toFixed(2) || '--'}</span></span>
                </div>
              </div>
            </div>
            
            {/* K线图表 - 同步滚动状态 */}
            <div className="flex-1 min-h-0">
              <StockChart 
                data={aggregatedHistory} 
                interval={interval} 
                pois={pois}
                xAxisMode={xAxisMode}
                onXAxisModeChange={setXAxisMode}
                viewCount={viewCount}
                onViewCountChange={setViewCount}
              />
            </div>
            
            {/* 成交量图 - 使用相同的viewCount实现同步 */}
            <div className="h-28 bg-[#0b0e11] p-2 relative border-t border-[#1e2329]/50">
              <div className="absolute top-2 left-6 z-10 text-[10px] text-[#474d57] font-bold tracking-[0.15em] pointer-events-none uppercase opacity-60">成交量 VOL</div>
              <div className="h-full w-full flex items-end justify-between gap-[1px] px-2">
                {visibleHistory.map((d, i) => {
                  const maxVol = Math.max(...visibleHistory.map(v => v.volume));
                  const height = maxVol > 0 ? (d.volume / maxVol) * 90 : 0;
                  const isUpDay = d.close >= d.open;
                  return <div key={i} className={`flex-1 min-w-[2px] transition-all hover:brightness-125 rounded-t-sm ${isUpDay ? 'bg-[#f6465d]/50' : 'bg-[#0ac193]/50'}`} style={{ height: `${Math.max(3, height)}%` }} title={`${d.date}: ${d.volume}`} />;
                })}
              </div>
            </div>
          </div>

          {/* 右侧面板 */}
          <div className="w-72 border-l border-[#1e2329] flex flex-col gap-2 p-2 bg-[#14171c] shadow-2xl">
            <div className="flex-1 overflow-hidden shadow-xl rounded-lg">
              <FiveElementsAnalysis stock={currentStock} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
