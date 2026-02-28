import express from 'express';
import cors from 'cors';
import { createServer } from 'http';

// 模拟MCP股票数据API服务
// 在实际部署时，这个服务需要连接到pozansky-stock-server MCP

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 模拟股票数据生成器
const generateStockData = (symbol: string, days: number = 100) => {
  const data = [];
  let basePrice = symbol === '000001.SS' ? 3000 : 
                 symbol === 'AAPL' ? 170 : 
                 symbol === 'MSFT' ? 370 : 100;
  
  const now = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    
    // 跳过周末
    const day = date.getDay();
    if (day === 0 || day === 6) continue;
    
    const volatility = basePrice * 0.02;
    const change = (Math.random() - 0.48) * volatility;
    const open = basePrice + change;
    const close = open + (Math.random() - 0.5) * (volatility * 0.8);
    const high = Math.max(open, close) + Math.random() * (volatility * 0.3);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.3);
    const volume = Math.floor(1000000 + Math.random() * 10000000);
    
    data.push({
      time: Math.floor(date.getTime() / 1000),
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume: volume
    });
    
    basePrice = close;
  }
  
  return data;
};

// K线数据API
app.get('/api/kline', (req, res) => {
  const { symbol = '000001.SS', interval = '1d', limit = 100 } = req.query;
  
  try {
    const data = generateStockData(symbol as string, parseInt(limit as string));
    res.json({
      success: true,
      symbol,
      interval,
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate stock data'
    });
  }
});

// 股票搜索API
app.get('/api/search', (req, res) => {
  const { keyword } = req.query;
  
  const stocks = [
    { symbol: '000001.SS', name: '上证指数', type: 'index' },
    { symbol: '399001.SZ', name: '深证成指', type: 'index' },
    { symbol: '000300.SS', name: '沪深300', type: 'index' },
    { symbol: '399006.SZ', name: '创业板指', type: 'index' },
    { symbol: 'AAPL', name: '苹果公司', type: 'stock' },
    { symbol: 'MSFT', name: '微软公司', type: 'stock' },
    { symbol: 'GOOGL', name: '谷歌公司', type: 'stock' },
    { symbol: 'TSLA', name: '特斯拉', type: 'stock' },
    { symbol: '0700.HK', name: '腾讯控股', type: 'hk' },
    { symbol: '600519.SS', name: '贵州茅台', type: 'stock' },
  ];
  
  if (!keyword) {
    return res.json({ success: true, data: stocks });
  }
  
  const filtered = stocks.filter(s => 
    s.name.toLowerCase().includes(String(keyword).toLowerCase()) ||
    s.symbol.toLowerCase().includes(String(keyword).toLowerCase())
  );
  
  res.json({ success: true, data: filtered });
});

// 股票概要信息API
app.get('/api/quote', (req, res) => {
  const { symbol = '000001.SS' } = req.query;
  
  const basePrice = symbol === '000001.SS' ? 3050 : 
                   symbol === 'AAPL' ? 170 : 
                   symbol === 'MSFT' ? 370 : 100;
  
  const change = (Math.random() - 0.5) * basePrice * 0.03;
  const changePercent = (change / basePrice) * 100;
  
  res.json({
    success: true,
    data: {
      symbol,
      name: symbol === '000001.SS' ? '上证指数' : 
            symbol === 'AAPL' ? '苹果公司' :
            symbol === 'MSFT' ? '微软公司' : symbol,
      price: parseFloat(basePrice.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(100000000 + Math.random() * 50000000),
      amount: Math.floor(basePrice * 100000000),
      high: parseFloat((basePrice * 1.02).toFixed(2)),
      low: parseFloat((basePrice * 0.98).toFixed(2)),
      open: parseFloat((basePrice * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2)),
      preClose: parseFloat((basePrice * (1 - changePercent / 100)).toFixed(2)),
    }
  });
});

// 技术指标API
app.get('/api/indicators', (req, res) => {
  const { symbol = '000001.SS', interval = '1d' } = req.query;
  
  // 生成模拟技术指标
  const basePrice = symbol === '000001.SS' ? 3050 : 170;
  
  res.json({
    success: true,
    data: {
      ma5: basePrice * 1.01,
      ma10: basePrice * 0.99,
      ma20: basePrice * 0.98,
      ma30: basePrice * 0.97,
      ma60: basePrice * 0.96,
      ema12: basePrice * 1.005,
      ema26: basePrice * 0.995,
      rsi: 45 + Math.random() * 30,
      macd: {
        dif: (Math.random() - 0.5) * 10,
        dea: (Math.random() - 0.5) * 8,
        bar: (Math.random() - 0.5) * 5
      },
      boll: {
        upper: basePrice * 1.03,
        middle: basePrice,
        lower: basePrice * 0.97
      },
      kdj: {
        k: 50 + Math.random() * 30,
        d: 50 + Math.random() * 20,
        j: 50 + Math.random() * 40
      }
    }
  });
});

// 启动服务器
const server = createServer(app);
server.listen(PORT, () => {
  console.log(`Stock API Server running on port ${PORT}`);
  console.log(`Endpoints:`);
  console.log(`  GET /api/kline?symbol=AAPL&interval=1d&limit=100`);
  console.log(`  GET /api/quote?symbol=000001.SS`);
  console.log(`  GET /api/search?keyword=苹果`);
  console.log(`  GET /api/indicators?symbol=000001.SS`);
});

export default app;
