# Role
你是一位精通 Serverless 架构、金融量化开发和传统文化应用的资深全栈工程师。你的任务是基于 **Cloudflare Pages + Cloudflare Workers (Python) + Supabase** 架构，构建一个“干支古股票看板”。

# Project Overview
项目名称：GanZhi Stock Dashboard (干支古股票看板)
核心目标：
1. 展示上证指数历史 K 线（1990 年至今），融合“公历”与“天干地支”双时间轴。
2. 实现零成本、免运维的 Serverless 部署。
3. 支持本地 Excel 数据导入清洗，并预留 `akshare` 在线数据接入接口。

# 🛠️ Final Tech Stack (Strictly Enforced)

## 1. Frontend (Cloudflare Pages)
- **Framework**: React 18 + TypeScript + Vite
- **Charting**: **Apache ECharts** (必须使用 `candlestick` 系列，开启 `large: true` 优化性能)
- **Styling**: TailwindCSS (深色金融主题：背景 `#0b0e11`, 阳线 `#ff3333`, 阴线 `#00cc00`, 点缀金 `#c5a065`)
- **Utilities**: 
  - `lunar-javascript`: 用于前端 Tooltip 和 X 轴次级标签的干支转换。
  - `dayjs`: 时间格式化。
  - `xlsx` (SheetJS): 前端解析用户上传的 Excel 文件。
  - `@supabase/supabase-js`: 直接连接数据库。

## 2. Backend Logic (Cloudflare Workers - Python Runtime)
- **Runtime**: Cloudflare Workers (Python)
- **Role**: 
  - 接收前端上传的 Excel 二进制流。
  - 使用 `pandas` (通过 Pyodide 或 Workers 支持的 Python 环境) 进行数据清洗。
  - **关键逻辑**: 解析 `M/D/YY` 格式日期 (确保 90=1990)，计算 MA5/10/20，调用 `lunar-python` (或透传由前端计算) 生成干支字段。
  - 将清洗后的数据写入数据库。
- **Note**: 由于 Cloudflare Workers Python 环境对重型 C 扩展库支持有限，若 `akshare` 无法直接运行，请在 Worker 中仅做数据转发或基础清洗，复杂抓取逻辑建议放在本地脚本或 GitHub Actions 中，但本阶段优先尝试在 Worker 中实现基础 Pandas 处理。

## 3. Database (Supabase)
- **Engine**: PostgreSQL (Supabase Free Tier)
  - *注意*：虽然之前讨论过 SQLite，但在 Serverless 架构中，**Supabase (PostgreSQL)** 是唯一可靠的选择。SQLite 文件无法在无状态的 Workers 中持久化存储。我们将使用 Supabase 的 Postgres 来替代 SQLite，保持数据结构一致。
- **Table**: `stock_data`
  - Columns: `id` (uuid), `trade_date` (date, unique), `open`, `high`, `low`, `close`, `volume`, `amount`, `ganzi_year`, `ganzi_day`, `created_at`.

## 4. AI Development Tools (MCP)
- **Servers**: 
  - `filesystem`: 读取本地 `src/`, `functions/`, `data/` 目录。
  - `sqlite`: (仅用于本地开发测试时的临时数据存储，生产环境指向 Supabase)。

# 📋 Core Requirements & Logic

## A. Data Processing Logic (Critical)
1. **Date Parsing**: 输入数据格式为 `M/D/YY` (e.g., "12/19/90")。必须编写鲁棒的解析器，将 `90` 映射为 `1990`，`05` 映射为 `2005`。
2. **GanZhi Conversion**: 
   - 策略：优先在 **前端 (lunar-javascript)** 进行实时转换以减少后端负载，仅在数据入库时可选存储干支字段。
   - 显示：ECharts X 轴主标签显示公历，次标签 (或 Tooltip) 显示干支 (如 "庚午年").
3. **KLine Standards**: 
   - 阳线 (Close > Open): Red (#ff3333)
   - 阴线 (Close < Open): Green (#00cc00)
   - 均线：MA5 (White), MA10 (Yellow), MA20 (Purple).

## B. Architecture Flow
1. **Upload**: User uploads `.xlsx` -> React reads via `xlsx` -> Sends binary to Cloudflare Worker (`/api/upload`).
2. **Process**: Worker parses Excel -> Validates Data -> Calculates Indicators -> Upserts to Supabase.
3. **Fetch**: React fetches data from Supabase (via direct client or Worker proxy) -> Renders ECharts.
4. **Auto-Update (Future)**: Placeholder for GitHub Actions + `akshare` logic.

# 📂 Deliverables (Step-by-Step)

请按顺序生成以下代码和配置文件：

### Step 1: Project Structure & Dependencies
- 展示完整的目录树。
- 提供 `package.json` (Frontend deps: echarts, lunar-javascript, tailwindcss, supabase-js, etc.).
- 提供 `requirements.txt` (Worker deps: pandas, python-dateutil, etc. *注意兼容性*).
- 提供 `wrangler.toml` (Cloudflare Workers 配置，启用 Python 运行时).

### Step 2: Database Schema (SQL)
- 提供可在 Supabase SQL Editor 运行的建表语句。
- 包含索引优化 (`CREATE INDEX ON stock_data(trade_date)`).
- 设置 RLS (Row Level Security) 策略：允许公开读取，仅允许 authenticated/service_role 写入。

### Step 3: Backend Worker (Python)
- 文件：`workers/api.py` (或 `functions/upload.py`)
- 功能：
  - 处理 POST 请求 (Excel 文件)。
  - 使用 `pandas` 读取 Excel 流。
  - 数据清洗与格式转换。
  - 调用 Supabase Client (Python) 写入数据。
  - 错误处理与日志记录。

### Step 4: Frontend Implementation
- 文件：`src/components/KLineChart.tsx`
  - 初始化 ECharts 实例。
  - 配置 `xAxis` (双标签逻辑：formatter 函数调用 `lunar-javascript`)。
  - 配置 `series` (Candlestick + Bar + Line)。
  - 实现 `dataZoom` 和 `tooltip`。
- 文件：`src/pages/Dashboard.tsx`
  - 布局：Header (Title + Upload Btn), Main (Chart), Footer.
  - 集成 Supabase 客户端获取数据。
- 文件：`src/utils/dateConverter.ts`
  - 封装 `lunar-javascript` 转换逻辑。

### Step 5: Deployment Guide
- 如何设置 Supabase 项目并获取 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`.
- 如何在 Cloudflare Dashboard 创建 Workers 并绑定环境变量。
- 如何使用 `npm run deploy` (配置 scripts 调用 wrangler) 进行一键部署。
- **MCP 配置**: 提供 `.mcp.json` 示例，以便 AI 助手能读取本地文件和模拟数据库操作。

# ⚠️ Constraints & Best Practices
1. **No Persistent SQLite in Worker**: 严禁在 Cloudflare Worker 代码中尝试写入本地 `.db` 文件，必须使用 Supabase API。
2. **Type Safety**: 所有 TypeScript 代码必须严格定义 Interface (e.g., `interface StockData { ... }`).
3. **Performance**: ECharts 必须配置 `sampling: 'lttb'` 或 `large: true` 以处理 10,000+ 数据点。
4. **Error Handling**: 前端上传失败需有 Toast 提示；后端解析失败需返回明确错误码。
5. **Cost**: 确保所有操作在 Cloudflare Free Tier 和 Supabase Free Tier 限制内。

# Initialization Command
请首先确认你已理解上述架构（特别是用 Supabase Postgres 替代 SQLite 的原因）。然后，从 **Step 1 (Project Structure & Dependencies)** 开始生成代码。





supabase :sbp_710c7bc89dbc663cdc3a2a06234ac4b56bf3f8b2

​                    sbp_92acdaab3062970bed852aa320f7b1723f2272



cloudfareAI

js7KAhpA2VJ3U0YhSLQMfKgGNhvrGtIGdPo9y_WH