# GanZhi Stock Validator MCP

A Model Context Protocol (MCP) server that provides data validation tools for the GanZhi Stock Dashboard project.

## Features

- **Stock Data Validation**: Validate OHLC (Open, High, Low, Close) data with comprehensive rules
- **GanZhi (干支) Validation**: Validate Chinese lunar calendar conversions
- **Excel Import Validation**: Validate Excel files before import
- **Database Validation**: Validate Supabase database schema and integrity
- **Comprehensive Quality Check**: Run all validations in one call

## Installation

```bash
cd gan-zhi-stock-validator-mcp
pip install -e .
```

## Usage

### Running the Server

```bash
# Run with streamable HTTP (default)
python -m ganzhi_stock_validator.server

# Run with stdio (for local testing)
python -m ganzhi_stock_validator.server --stdio
```

### MCP Tools

#### validate_stock_data

Validate stock market OHLC data.

```python
{
    "data": [
        {"trade_date": "1990-12-19", "open": 100.0, "high": 105.0, "low": 99.0, "close": 103.0, "volume": 1000000},
        ...
    ],
    "min_date": "1990-01-01",
    "max_date": "2030-12-31"
}
```

#### validate_ganzhi

Validate GanZhi calendar conversion.

```python
{
    "data": [
        {"trade_date": "1990-12-19", "ganzi_year": "庚午年", "ganzi_day": "甲子日"},
        ...
    ]
}
```

#### validate_excel

Validate Excel file before import.

```python
{
    "file_base64": "base64_encoded_excel_content",
    "sheet_name": 0
}
```

#### validate_database

Validate Supabase database.

```python
{
    "supabase_url": "https://your-project.supabase.co",
    "supabase_key": "your-anon-key",
    "check_schema": true,
    "check_integrity": true
}
```

#### generate_ganzhi

Generate GanZhi fields from dates.

```python
{
    "data": [
        {"trade_date": "1990-12-19"},
        ...
    ]
}
```

#### check_data_quality

Comprehensive data quality check.

```python
{
    "file_base64": "base64_encoded_excel_content",
    "json_data": [...],
    "supabase_url": "https://your-project.supabase.co",
    "supabase_key": "your-anon-key"
}
```

## MCP Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ganzhi-stock-validator": {
      "command": "python",
      "args": ["-m", "ganzhi_stock_validator.server"],
      "env": {},
      "workingDirectory": "path/to/gan-zhi-stock-validator-mcp"
    }
  }
}
```

### OpenCode

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "ganzhi-stock-validator": {
      "command": "python",
      "args": ["-m", "ganzhi_stock_validator.server"],
      "workingDirectory": "path/to/gan-zhi-stock-validator-mcp"
    }
  }
}
```

## Validation Rules

### Stock Data

- **Date Format**: Supports M/D/YY (Excel), YYYY-MM-DD, YYYY/MM/DD
- **OHLC Relationship**: High >= max(Open, Close), Low <= min(Open, Close)
- **Positive Values**: All prices and volume must be positive
- **Date Range**: Default 1990-01-01 to today

### GanZhi

- Validates year stem-branch (年干支)
- Validates day stem-branch (日干支)
- Uses lunar-python library for accurate conversion

### Database

- Validates stock_data table exists
- Checks required columns: id, trade_date, open, high, low, close, volume
- Checks for duplicate trade_dates
- Verifies RLS policies allow public read

## Development

### Running Tests

```bash
pip install -e ".[dev]"
pytest
```

### Code Quality

```bash
ruff check src/
ruff format src/
```

## License

MIT
