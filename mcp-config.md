# GanZhi Stock Dashboard - MCP Configuration

This directory contains MCP server configurations for development.

## Available MCP Servers

### 1. gan-zhi-stock-validator
Local Python MCP server for validating stock data quality.

**Location**: `../ganzhi-stock-validator-mcp/`

**Capabilities**:
- Excel file validation
- GanZhi (干支) conversion and validation
- Supabase database validation

**To use**:
```json
{
  "mcpServers": {
    "ganzhi-stock-validator": {
      "command": "python",
      "args": ["-m", "ganzhi_stock_validator.server"],
      "workingDirectory": "H:\\OutsourcingProjects\\TiangandizhiStock\\ganzhi-stock-validator-mcp"
    }
  }
}
```

### 2. Supabase (via npx)

Use Supabase CLI for database operations:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Open SQL Editor
supabase sql editor
```

## Environment Variables

Create a `.env` file in the project root:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Frontend (Vite)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Data Import Flow

1. **Validate Excel**: Use MCP server to validate `上证指数.xlsx`
2. **Import Data**: Run `python scripts/import_data.py`
3. **Verify**: Query Supabase to confirm data

## Development Commands

```bash
# Validate data with MCP
python -m ganzhi_stock_validator.server

# Import data to Supabase
python scripts/import_data.py

# Dry run (without importing)
python scripts/import_data.py --dry-run
```
