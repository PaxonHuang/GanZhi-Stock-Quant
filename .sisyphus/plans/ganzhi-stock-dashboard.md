# GanZhi Stock Dashboard (干支古股票看板) - Work Plan

## TL;DR

> **Quick Summary**: 构建完整的干支古股票看板，实现上证指数 K 线可视化，融合公历与天干地支双时间轴

> **Deliverables**:
> - React + TypeScript + ECharts 前端 (K 线展示)
> - Supabase PostgreSQL 数据库 Schema (可选本地 SQLite)
> - 数据导入脚本 (Excel → Database)

> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Schema → Import → Frontend → Verification

---

## Context

### Original Request
基于 Cloudflare Pages + Cloudflare Workers (Python) + Supabase 架构，构建"干支古股票看板"：
1. 展示上证指数历史 K 线 (1990年至今)
2. 融合公历与天干地支双时间轴
3. 零成本 Serverless 部署
4. 支持本地 Excel 数据导入

### 重要调整 (适配无服务器环境)
由于**没有个人服务器**，原计划调整如下：
- ❌ 移除 Cloudflare Workers (需要服务器部署)
- ✅ 保留 Supabase (云服务，无需服务器)
- ✅ 使用现有 `ganzhi-stock-validator-mcp` 进行本地数据处理
- ✅ 前端直连 Supabase (无需后端 API)
- ✅ 本地开发模式为主

### Interview Summary
**Key Discussions**:
- 数据来源: 仅使用现有的 `上证指数.xlsx`，无需用户上传功能
- 测试策略: Vitest + React Testing Library (TDD)
- 干支策略: **存储到数据库** (导入时用 lunar_python 计算一次)

### Research Findings
- 现有 `ganzhi.py`: 使用 lunar_python 实现完整的干支转换
- 现有 `excel_validator.py`: 实现 Excel 解析和中英文字段映射
- 现有 `supabase_client.py`: 实现数据库验证 (需扩展为 CRUD)

---

## Work Objectives

### Core Objective
构建完整的干支古股票看板系统：
1. 前端展示上证指数 K 线图
2. 鼠标悬停显示干支日期
3. 均线上叠加 (MA5/MA10/MA20)
4. 数据存储到数据库 (Supabase)

### Concrete Deliverables
- `frontend/`: React 前端源码
- `supabase/schema.sql`: 数据库 Schema
- `scripts/import_data.py`: 数据导入脚本
- `.env.example`: 环境变量示例

### Definition of Done
- [ ] K 线图正确渲染 (阳线红色，阴线绿色)
- [ ] 鼠标悬停显示干支日期
- [ ] 数据成功导入数据库
- [ ] 前端直连 Supabase 正常获取数据
- [ ] 所有测试通过

### Must Have
- React 18 + TypeScript + Vite
- Apache ECharts K 线图
- TailwindCSS 深色主题
- Supabase PostgreSQL 存储 (或本地 SQLite)
- MA5/MA10/MA20 均线

### Must NOT Have (Guardrails)
- ❌ Cloudflare Workers/任何需要服务器的部署
- ❌ 用户认证/登录
- ❌ 用户 Excel 上传功能
- ❌ 多个股票代码 (仅上证指数)
- ❌ 导出功能
- ❌ WebSocket 实时更新

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (Vitest + RTL)
- **Automated tests**: TDD (Red-Green-Refactor)
- **Framework**: Vitest + React Testing Library
- **Agent-Executed QA**: Playwright for E2E

### QA Policy
Every task MUST include agent-executed QA scenarios:
- Frontend/UI: Use Playwright — Navigate, interact, assert DOM, screenshot
- Database: Use Supabase client / SQLite — Query data, verify integrity

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - 任务 1-3):
├── Task 1: 创建前端目录结构 & package.json
├── Task 2: Supabase Schema 定义
└── Task 3: 环境变量配置

Wave 2 (Data - 任务 4-5):
├── Task 4: 数据导入脚本
└ Task 5: 数据库初始化

Wave 3 (Frontend - 任务 6-9):
├── Task 6: React 基础结构 (Vite + Tailwind)
├── Task 7: ECharts K 线组件
├── Task 8: 干支日期转换工具
└── Task 9: Dashboard 页面集成

Wave 4 (Testing - 任务 10-12):
├── Task 10: Vitest 测试配置
├── Task 11: 组件单元测试
└── Task 12: E2E Playwright 测试
```

---

## TODOs

- [ ] 1. 创建前端目录结构 & package.json

  **What to do**:
  - 在项目根目录创建 `frontend/` 目录
  - 创建 `frontend/package.json` (React + Vite + TypeScript + ECharts + TailwindCSS + Vitest)
  - 配置 Vite 和 TypeScript

  **References**:
  - `../pyproject.toml` - 现有 Python 依赖
  - `../src/ganzhi_stock_validator/ganzhi.py` - 现有干支转换

  **Acceptance Criteria**:
  - [ ] 目录结构正确
  - [ ] package.json 依赖完整
  - [ ] npm install 成功

  **QA Scenarios**:
  - [ ] npm run dev 正常启动

- [ ] 2. Supabase Schema 定义

  **What to do**:
  - 创建 `supabase/schema.sql` 建表语句
  - 包含 `stock_data` 表：id (uuid), trade_date (date, unique), open, high, low, close, volume, amount, ganzi_year, ganzi_day, created_at
  - 创建索引：`CREATE INDEX stock_data_trade_date_idx ON stock_data(trade_date)`
  - 设置 RLS 策略：公开读取，认证写入

  **References**:
  - `../src/ganzhi_stock_validator/supabase_client.py` - StockDataSchema 定义

  **Acceptance Criteria**:
  - [ ] SQL 可在 Supabase SQL Editor 执行
  - [ ] 表结构符合需求
  - [ ] RLS 策略正确

  **QA Scenarios**:
  - [ ] 执行 SQL 无错误

- [ ] 3. 环境变量配置

  **What to do**:
  - 创建 `.env.example`
  - 定义 SUPABASE_URL, SUPABASE_KEY
  - 创建 `src/config/supabase.ts`

  **References**:
  - `@supabase/supabase-js` 文档

  **Acceptance Criteria**:
  - [ ] .env.example 格式正确
  - [ ] Supabase 客户端可初始化

  **QA Scenarios**:
  - [ ] 环境变量加载正常

- [ ] 4. 数据导入脚本

  **What to do**:
  - 创建 `scripts/import_data.py`
  - 读取 `../上证指数.xlsx`
  - 使用现有模块解析 Excel
  - 计算干支字段
  - 插入 Supabase (使用 upsert 避免重复)

  **References**:
  - `../src/ganzhi_stock_validator/excel_validator.py` - Excel 解析
  - `../src/ganzhi_stock_validator/ganzhi.py` - 干支转换

  **Acceptance Criteria**:
  - [ ] 脚本执行成功
  - [ ] 数据正确导入
  - [ ] 干支字段正确计算

  **QA Scenarios**:
  - [ ] 查询数据库确认数据存在

- [ ] 5. 数据库初始化

  **What to do**:
  - 验证 Supabase 连接
  - 运行 schema.sql
  - 验证表创建成功

  **Acceptance Criteria**:
  - [ ] 数据库连接成功
  - [ ] 表创建成功

  **QA Scenarios**:
  - [ ] 查询 stock_data 表结构

- [ ] 6. React 基础结构

  **What to do**:
  - 初始化 Vite + React + TypeScript 项目
  - 配置 TailwindCSS (深色金融主题)
  - 配置路径别名 (@/)
  - 创建基础组件结构

  **References**:
  - TailwindCSS 官方配置

  **Acceptance Criteria**:
  - [ ] npm run dev 正常运行
  - [ ] TailwindCSS 样式生效
  - [ ] 深色主题正确

  **QA Scenarios**:
  - [ ] 页面渲染成功

- [ ] 7. ECharts K 线组件

  **What to do**:
  - 创建 `src/components/KLineChart.tsx`
  - 使用 ECharts candlestick 系列
  - 配置: large: true, sampling: 'lttb'
  - 实现阳线 (#ff3333) / 阴线 (#00cc00) 颜色
  - 实现 MA5/MA10/MA20 均线
  - 实现 dataZoom 和 tooltip

  **References**:
  - Apache ECharts candlestick 文档

  **Acceptance Criteria**:
  - [ ] K 线图渲染正确
  - [ ] 颜色符合要求
  - [ ] 均线显示正确

  **QA Scenarios**:
  - [ ] Playwright 截图验证

- [ ] 8. 干支日期转换工具

  **What to do**:
  - 创建 `src/utils/dateConverter.ts`
  - 封装 lunar-javascript 转换
  - 提供格式化函数 (如 "甲子日")

  **References**:
  - lunar-javascript 文档

  **Acceptance Criteria**:
  - [ ] 转换函数可用
  - [ ] 格式正确

  **QA Scenarios**:
  - [ ] 单元测试验证

- [ ] 9. Dashboard 页面集成

  **What to do**:
  - 创建 `src/pages/Dashboard.tsx`
  - Header: 标题 + 数据信息
  - Main: KLineChart 组件
  - Footer: 数据统计
  - 集成 Supabase 客户端获取数据

  **References**:
  - `@supabase/supabase-js` 文档

  **Acceptance Criteria**:
  - [ ] 页面完整渲染
  - [ ] 数据正确加载
  - [ ] 布局美观

  **QA Scenarios**:
  - [ ] Playwright 验证完整流程

- [ ] 10. Vitest 测试配置

  **What to do**:
  - 配置 `vitest.config.ts`
  - 配置 React Testing Library
  - 创建测试工具函数

  **References**:
  - Vitest 官方文档

  **Acceptance Criteria**:
  - [ ] npm test 可运行
  - [ ] 测试环境正确

  **QA Scenarios**:
  - [ ] 测试运行成功

- [ ] 11. 组件单元测试

  **What to do**:
  - 为 KLineChart 组件编写测试
  - 为 dateConverter 工具编写测试
  - 测试覆盖率 > 70%

  **Acceptance Criteria**:
  - [ ] 所有测试通过
  - [ ] 覆盖率达标

  **QA Scenarios**:
  - [ ] npm test 通过

- [ ] 12. E2E Playwright 测试

  **What to do**:
  - 配置 `playwright.config.ts`
  - 编写 K 线图渲染测试
  - 编写 tooltip 显示测试

  **References**:
  - Playwright 文档

  **Acceptance Criteria**:
  - [ ] E2E 测试通过
  - [ ] UI 验证正确

  **QA Scenarios**:
  - [ ] Playwright 完整测试

---

## Final Verification Wave

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run TypeScript check + linter + tests. Review for: `any` types, console.log, unused imports.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep).
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

- **1**: `feat(frontend): add vite react setup` — frontend/, package.json, vite.config.ts
- **2**: `feat(frontend): add echarts kline` — frontend/src/components/KLineChart.tsx
- **3**: `feat(data): add import script` — scripts/import_data.py
- **4**: `test: add vitest and e2e` — tests/, playwright.config.ts

---

## Success Criteria

### Verification Commands
```bash
# Frontend build
cd frontend && npm run build  # Expected: dist/ generated

# Import data
python scripts/import_data.py  # Expected: data imported to Supabase

# Run tests
cd frontend && npm test  # Expected: all tests pass
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] K-line renders with correct colors
- [ ] Tooltip shows GanZhi
