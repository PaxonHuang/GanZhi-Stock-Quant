"""
GanZhi Stock Validator MCP Server

A Model Context Protocol server that provides data validation tools
for the GanZhi Stock Dashboard project.

Tools:
- validate_stock_data: Validate stock OHLC data
- validate_ganzhi: Validate GanZhi (干支) conversion
- validate_database: Validate Supabase database schema
- validate_excel: Validate Excel file before import
- generate_ganzhi: Generate GanZhi fields for stock data
- check_data_quality: Comprehensive data quality check
"""

import base64
import json
from typing import Annotated

from pydantic import BaseModel, Field
from mcp.server.fastmcp import FastMCP

from .validators import StockDataValidator, ValidationResult
from .ganzhi import GanZhiConverter, GanZhiValidationResult
from .supabase_client import DatabaseValidator
from .excel_validator import ExcelValidator


# Create MCP server
mcp = FastMCP(
    "GanZhi Stock Validator",
    json_response=True,
)


# ============== Input Models ==============

class StockDataInput(BaseModel):
    """Input model for stock data validation."""
    data: list[dict] = Field(
        description="List of stock data records with fields: trade_date, open, high, low, close, volume, amount"
    )
    min_date: str | None = Field(
        default=None,
        description="Minimum valid date (YYYY-MM-DD), defaults to 1990-01-01"
    )
    max_date: str | None = Field(
        default=None,
        description="Maximum valid date (YYYY-MM-DD), defaults to today"
    )


class GanZhiInput(BaseModel):
    """Input model for GanZhi validation."""
    data: list[dict] = Field(
        description="List of stock data records with optional ganzi_year and ganzi_day fields"
    )


class ExcelInput(BaseModel):
    """Input model for Excel validation."""
    file_base64: str = Field(
        description="Excel file content encoded as base64"
    )
    sheet_name: str | int = Field(
        default=0,
        description="Sheet name or index to validate (default: first sheet)"
    )


class DatabaseInput(BaseModel):
    """Input model for database validation."""
    supabase_url: str = Field(
        description="Supabase project URL"
    )
    supabase_key: str = Field(
        description="Supabase anon key or service role key"
    )
    check_schema: bool = Field(
        default=True,
        description="Check table schema"
    )
    check_integrity: bool = Field(
        default=True,
        description="Check data integrity"
    )


class GenerateGanZhiInput(BaseModel):
    """Input model for GanZhi generation."""
    data: list[dict] = Field(
        description="List of stock data records with trade_date field"
    )


class QualityCheckInput(BaseModel):
    """Input model for comprehensive quality check."""
    file_base64: str | None = Field(
        default=None,
        description="Excel file encoded as base64 (optional, for Excel input)"
    )
    json_data: list[dict] | None = Field(
        default=None,
        description="JSON data array (optional, for direct data input)"
    )
    supabase_url: str | None = Field(
        default=None,
        description="Supabase URL for database validation (optional)"
    )
    supabase_key: str | None = Field(
        default=None,
        description="Supabase key for database validation (optional)"
    )


# ============== Tools ==============

@mcp.tool(
    name="validate_stock_data",
    description="Validate stock market OHLC (Open, High, Low, Close) data. Checks: date formats, OHLC relationships, volume/amount validity, data completeness.",
)
def validate_stock_data(input: StockDataInput) -> dict:
    """
    Validate stock market data for correctness.
    
    Checks:
    - Date format and range (supports M/D/YY Excel format)
    - OHLC relationships (High >= max(Open,Close), Low <= min(Open,Close))
    - Positive values for all prices and volume
    - Data completeness
    
    Args:
        input: StockDataInput with data and optional date bounds
        
    Returns:
        Validation result with issues list
    """
    from datetime import date
    
    min_date = None
    max_date = None
    
    if input.min_date:
        min_date = date.fromisoformat(input.min_date)
    if input.max_date:
        max_date = date.fromisoformat(input.max_date)
    
    validator = StockDataValidator(min_date=min_date, max_date=max_date)
    result = validator.validate_json(input.data)
    
    return result.to_dict()


@mcp.tool(
    name="validate_ganzhi",
    description="Validate GanZhi (干支) calendar conversion accuracy. Checks if stored year/day GanZhi values match computed values.",
)
def validate_ganzhi(input: GanZhiInput) -> dict:
    """
    Validate GanZhi (干支) calendar conversion.
    
    Validates that stored GanZhi values are correctly computed
    from the trade_date using the lunar-python library.
    
    Args:
        input: GanZhiInput with data containing trade_date and optional ganzi fields
        
    Returns:
        Validation result with issues and sample conversions
    """
    converter = GanZhiConverter()
    result = converter.validate_dataset(input.data)
    
    return result.to_dict()


@mcp.tool(
    name="validate_excel",
    description="Validate Excel file before import. Checks: file format, required columns, data types, and extracts sample data.",
)
def validate_excel(input: ExcelInput) -> dict:
    """
    Validate Excel file for stock data import.
    
    Checks:
    - Valid Excel format (.xlsx, .xls)
    - Required columns present (open, high, low, close)
    - Column mapping for Chinese/English names
    - Data extraction for validation
    
    Args:
        input: ExcelInput with base64 encoded file
        
    Returns:
        Validation result with column mapping and sample data
    """
    try:
        file_bytes = base64.b64decode(input.file_base64)
    except Exception as e:
        return {
            "is_valid": False,
            "error": f"Failed to decode base64: {str(e)}",
        }
    
    validator = ExcelValidator()
    result = validator.validate(file_bytes, input.sheet_name)
    
    return result.to_dict()


@mcp.tool(
    name="validate_database",
    description="Validate Supabase database schema and data integrity. Checks: table existence, indexes, RLS policies, duplicate dates.",
)
def validate_database(input: DatabaseInput) -> dict:
    """
    Validate Supabase database for stock data.
    
    Checks:
    - stock_data table exists
    - Required columns present
    - Indexes exist
    - RLS policies configured
    - No duplicate trade_dates
    
    Args:
        input: DatabaseInput with Supabase credentials
        
    Returns:
        Full validation report
    """
    try:
        validator = DatabaseValidator(input.supabase_url, input.supabase_key)
        result = validator.full_validation()
        
        return result
        
    except Exception as e:
        return {
            "is_valid": False,
            "error": str(e),
        }


@mcp.tool(
    name="generate_ganzhi",
    description="Generate GanZhi (干支) fields for stock data. Adds: ganzi_year, ganzi_day, zodiac fields based on trade_date.",
)
def generate_ganzhi(input: GenerateGanZhiInput) -> dict:
    """
    Generate GanZhi fields from dates.
    
    For each record with a trade_date, computes:
    - ganzi_year: Year stem-branch (e.g., "甲辰年")
    - ganzi_day: Day stem-branch (e.g., "甲子日")
    - zodiac: Chinese zodiac animal
    
    Args:
        input: GenerateGanZhiInput with data containing trade_date
        
    Returns:
        Data with added GanZhi fields
    """
    converter = GanZhiConverter()
    result = converter.generate_ganzhi(input.data)
    
    return {
        "success": True,
        "total_records": len(result),
        "sample": result[:5],
        "data": result,
    }


@mcp.tool(
    name="check_data_quality",
    description="Comprehensive data quality check. Combines Excel validation, stock data validation, and GanZhi validation in one call.",
)
def check_data_quality(input: QualityCheckInput) -> dict:
    """
    Comprehensive data quality check.
    
    Performs multiple validation checks:
    - Excel file format and schema (if file provided)
    - Stock data OHLC validation
    - GanZhi conversion validation
    - Database validation (if credentials provided)
    
    Args:
        input: QualityCheckInput with optional file, data, and database info
        
    Returns:
        Combined validation report
    """
    report = {
        "excel": None,
        "stock_data": None,
        "ganzhi": None,
        "database": None,
        "overall_valid": True,
        "issues": [],
    }
    
    # Excel validation
    if input.file_base64:
        try:
            file_bytes = base64.b64decode(input.file_base64)
            excel_validator = ExcelValidator()
            excel_result = excel_validator.validate(file_bytes)
            report["excel"] = excel_result.to_dict()
            
            if not excel_result.is_valid:
                report["overall_valid"] = False
                report["issues"].extend([
                    {**i.to_dict(), "source": "excel"} 
                    for i in excel_result.issues
                ])
            
            # Extract data for further validation
            if excel_result.is_valid:
                extracted_data = excel_validator.extract_data(file_bytes)
                input.json_data = extracted_data
                
        except Exception as e:
            report["excel"] = {"is_valid": False, "error": str(e)}
            report["overall_valid"] = False
    
    # Stock data validation
    if input.json_data:
        try:
            validator = StockDataValidator()
            stock_result = validator.validate_json(input.json_data)
            report["stock_data"] = stock_result.to_dict()
            
            if not stock_result.is_valid:
                report["overall_valid"] = False
                report["issues"].extend([
                    {**i.to_dict(), "source": "stock_data"} 
                    for i in stock_result.issues
                ])
            
            # GanZhi validation
            converter = GanZhiConverter()
            ganzhi_result = converter.validate_dataset(input.json_data)
            report["ganzhi"] = ganzhi_result.to_dict()
            
            if not ganzhi_result.is_valid:
                report["overall_valid"] = False
                report["issues"].extend([
                    {**i.to_dict(), "source": "ganzhi"} 
                    for i in ganzhi_result.issues
                ])
                
        except Exception as e:
            report["stock_data"] = {"is_valid": False, "error": str(e)}
            report["overall_valid"] = False
    
    # Database validation
    if input.supabase_url and input.supabase_key:
        try:
            db_validator = DatabaseValidator(input.supabase_url, input.supabase_key)
            db_result = db_validator.full_validation()
            report["database"] = db_result
            
            if not db_result.get("is_valid", True):
                report["overall_valid"] = False
                report["issues"].extend([
                    {**i, "source": "database"} 
                    for i in db_result.get("all_issues", [])
                ])
                
        except Exception as e:
            report["database"] = {"is_valid": False, "error": str(e)}
    
    return report


# ============== Server Entry Point ==============

if __name__ == "__main__":
    import sys
    
    transport = "streamable-http"
    if len(sys.argv) > 1:
        if sys.argv[1] == "--stdio":
            transport = "stdio"
        elif sys.argv[1] == "--stdio":
            transport = "streamable-http"
    
    mcp.run(transport=transport)
