# 干支量化股票看板 (ZodiacQuant GANZHI Stock Dashboard)

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## 项目介绍

这是一款融合中国传统文化(天干地支、五行)与现代量化金融的创新股票看板应用。模仿同花顺等主流股票软件UI设计，同时创新性地引入天干地支纪年法，为投资者提供独特的分析视角。

## 核心功能

### 📈 K线图表
- **常规日K线**: 标准蜡烛图，同花顺风格(阳线红色/阴线绿色)
- **旬K线**: 以天干"甲日"为起始点的聚合K线
- **月K线**: 按24节气切换的月度K线

### 🗓️ 双轨纪年
- **公历显示**: 传统西历日期
- **干支显示**: 中国传统天干地支纪年
- **双轴对比**: 同时显示公历和干支，直观对比

### 🎯 兴趣点(POI)标记
- **甲子日**: 60年干支循环第一天
- **节气日**: 24节气日期标记
- **K线形态**: 十字星、锤子线、射击之星、吞没形态
- **阶段高低点**: 自动识别5日内的阶段最高/最低价

### 🎨 五行分析
- 当日干支对应的五行属性
- 基于五行属性的运势分析
- 行业板块对应关系

## 技术栈

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite 6
- **图表库**: Recharts
- **图标库**: Lucide React
- **数据库**: Supabase
- **样式**: Tailwind CSS

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

在 `.env.local` 文件中配置 Supabase:

```env
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_ANON_KEY=你的Supabase匿名密钥
```

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

## 数据说明

- 默认数据源: `public/stock_data.json` (上证指数历史数据)
- 数据优先级: Supabase > JSON文件 > 模拟数据
- 支持数据周期: 日线、旬K、月K、季K、年K

## 项目结构

```
├── components/          # React组件
│   ├── StockChart.tsx   # K线图表组件
│   └── FiveElementsAnalysis.tsx  # 五行分析组件
├── services/            # 数据服务
│   ├── dataService.ts   # 数据加载与处理
│   └── supabase.ts      # Supabase客户端
├── utils/               # 工具函数
│   └── ganzhi.ts        # 干支计算
├── types.ts             # TypeScript类型定义
├── constants.ts         # 常量定义
├── App.tsx              # 主应用组件
└── AGENTS.md           # 开发者指南
```

## 更新日志

### v2.0
- 新增旬K线聚合(以甲日为起始点)
- 新增月K线聚合(按节气切换)
- 新增公历/干支/双轴显示模式
- 新增POI兴趣点标记功能
- 优化K线图表UI

## 许可证

MIT
