"""
Excel file validation utilities.

Provides validation for Excel file imports:
- File format validation
- Column mapping
- Data type validation
- Sample data extraction
"""

from dataclasses import dataclass
from enum import Enum
from io import BytesIO
from typing import Any

import pandas as pd
import openpyxl


class ValidationLevel(Enum):
    """Severity level of validation issues."""
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationIssue:
    """Represents a single validation issue."""
    level: ValidationLevel
    field: str
    row: int | None
    message: str
    value: Any | None = None


@dataclass
class ExcelValidationResult:
    """Result of Excel file validation."""
    is_valid: bool
    file_info: dict[str, Any]
    column_mapping: dict[str, str]
    issues: list[ValidationIssue]
    sample_data: list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for structured output."""
        return {
            "is_valid": self.is_valid,
            "file_info": self.file_info,
            "column_mapping": self.column_mapping,
            "error_count": len([i for i in self.issues if i.level == ValidationLevel.ERROR]),
            "warning_count": len([i for i in self.issues if i.level == ValidationLevel.WARNING]),
            "issues": [vars(i) for i in self.issues],
            "sample_data": self.sample_data,
        }


class ExcelValidator:
    """
    Validator for Excel file imports.
    
    Validates:
    - File format (.xlsx, .xls)
    - Required columns presence
    - Column name mapping (English/Chinese)
    - Data type validation
    - Sample data extraction
    """

    # Required columns (English)
    REQUIRED_COLUMNS_EN = ["open", "high", "low", "close"]
    
    # Alternative Chinese column names
    COLUMN_ALTERNATIVES = {
        "open": ["开盘", "open", "Open"],
        "high": ["最高", "high", "High"],
        "low": ["最低", "low", "Low"],
        "close": ["收盘", "close", "Close"],
        "volume": ["成交量", "volume", "Volume", "vol"],
        "amount": ["成交额", "amount", "Amount"],
        "date": ["日期", "date", "Date", "trade_date", "时间"],
        "trade_date": ["日期", "date", "Date", "时间"],
    }

    def __init__(self):
        """Initialize Excel validator."""
        pass

    def _find_column(self, df_columns: list[str], target: str) -> str | None:
        """
        Find column name with flexible matching.
        
        Args:
            df_columns: Available DataFrame columns
            target: Target column name (English)
            
        Returns:
            Matched column name or None
        """
        alternatives = self.COLUMN_ALTERNATIVES.get(target, [target])
        
        for alt in alternatives:
            if alt in df_columns:
                return alt
        
        # Try case-insensitive match
        for col in df_columns:
            for alt in alternatives:
                if col.lower() == alt.lower():
                    return col
        
        return None

    def _map_columns(self, df_columns: list[str]) -> dict[str, str]:
        """
        Map DataFrame columns to standard names.
        
        Args:
            df_columns: Available DataFrame columns
            
        Returns:
            Dictionary mapping standard names to actual column names
        """
        mapping = {}
        
        for standard_name in self.REQUIRED_COLUMNS_EN + ["volume", "amount", "date", "trade_date"]:
            found = self._find_column(df_columns, standard_name)
            if found:
                mapping[standard_name] = found
        
        return mapping

    def validate_file_format(self, file_bytes: bytes) -> tuple[bool, str | None]:
        """
        Validate Excel file format.
        
        Args:
            file_bytes: Raw Excel file bytes
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Try to open as Excel
            wb = openpyxl.load_workbook(BytesIO(file_bytes), read_only=True)
            wb.close()
            return True, None
        except Exception as e:
            return False, f"Invalid Excel file: {str(e)}"

    def read_excel(self, file_bytes: bytes, sheet_name: str | int = 0) -> pd.DataFrame:
        """
        Read Excel file into DataFrame.
        
        Args:
            file_bytes: Raw Excel file bytes
            sheet_name: Sheet name or index (default: first sheet)
            
        Returns:
            DataFrame with parsed data
        """
        df = pd.read_excel(BytesIO(file_bytes), sheet_name=sheet_name)
        
        # Clean column names (remove whitespace)
        df.columns = df.columns.str.strip()
        
        return df

    def validate(self, file_bytes: bytes, sheet_name: str | int = 0) -> ExcelValidationResult:
        """
        Validate Excel file.
        
        Args:
            file_bytes: Raw Excel file bytes
            sheet_name: Sheet name or index
            
        Returns:
            ExcelValidationResult
        """
        issues: list[ValidationIssue] = []
        
        # Validate file format
        is_valid_format, error_msg = self.validate_file_format(file_bytes)
        
        if not is_valid_format:
            return ExcelValidationResult(
                is_valid=False,
                file_info={"error": error_msg},
                column_mapping={},
                issues=[ValidationIssue(
                    level=ValidationLevel.ERROR,
                    field="file",
                    row=None,
                    message=error_msg or "Invalid file format",
                )],
                sample_data=[],
            )

        # Get file info
        try:
            wb = openpyxl.load_workbook(BytesIO(file_bytes), read_only=True)
            sheet_names = wb.sheetnames
            sheet = wb.active
            file_info = {
                "sheet_count": len(sheet_names),
                "sheet_names": sheet_names,
                "active_sheet": sheet.title,
                "max_row": sheet.max_row,
                "max_column": sheet.max_column,
            }
            wb.close()
        except Exception as e:
            issues.append(ValidationIssue(
                level=ValidationLevel.ERROR,
                field="file",
                row=None,
                message=f"Could not read file info: {str(e)}",
            ))
            return ExcelValidationResult(
                is_valid=False,
                file_info={"error": str(e)},
                column_mapping={},
                issues=issues,
                sample_data=[],
            )

        # Read data
        try:
            df = self.read_excel(file_bytes, sheet_name)
        except Exception as e:
            issues.append(ValidationIssue(
                level=ValidationLevel.ERROR,
                field="file",
                row=None,
                message=f"Could not parse Excel data: {str(e)}",
            ))
            return ExcelValidationResult(
                is_valid=False,
                file_info=file_info,
                column_mapping={},
                issues=issues,
                sample_data=[],
            )

        # Map columns
        column_mapping = self._map_columns(list(df.columns))
        
        # Check required columns
        missing_columns = []
        for col in self.REQUIRED_COLUMNS_EN:
            if col not in column_mapping:
                missing_columns.append(col)
        
        if missing_columns:
            issues.append(ValidationIssue(
                level=ValidationLevel.ERROR,
                field="schema",
                row=None,
                message=f"Missing required columns: {missing_columns}",
                value=missing_columns,
            ))

        # Check if date column exists (either date or trade_date)
        if "date" not in column_mapping and "trade_date" not in column_mapping:
            issues.append(ValidationIssue(
                level=ValidationLevel.WARNING,
                field="schema",
                row=None,
                message="No date column found - date column is recommended",
            ))

        # Get sample data
        sample_data = []
        if not df.empty:
            sample_count = min(5, len(df))
            for idx in range(sample_count):
                row = df.iloc[idx].to_dict()
                sample_data.append({k: str(v) for k, v in row.items()})

        # Check for empty DataFrame
        if df.empty:
            issues.append(ValidationIssue(
                level=ValidationLevel.ERROR,
                field="data",
                row=None,
                message="Excel sheet is empty",
            ))

        error_count = len([i for i in issues if i.level == ValidationLevel.ERROR])
        
        return ExcelValidationResult(
            is_valid=error_count == 0,
            file_info=file_info,
            column_mapping=column_mapping,
            issues=issues,
            sample_data=sample_data,
        )

    def extract_data(self, file_bytes: bytes, sheet_name: str | int = 0) -> list[dict[str, Any]]:
        """
        Extract and normalize data from Excel file.
        
        Args:
            file_bytes: Raw Excel file bytes
            sheet_name: Sheet name or index
            
        Returns:
            List of normalized data dictionaries
        """
        result = self.validate(file_bytes, sheet_name)
        
        if not result.is_valid:
            raise ValueError(f"Cannot extract data from invalid Excel file: {result.issues}")
        
        df = self.read_excel(file_bytes, sheet_name)
        
        # Normalize column names
        normalized_data = []
        for idx, row in df.iterrows():
            normalized_row = {}
            
            # Map columns to standard names
            for std_name, actual_name in result.column_mapping.items():
                if actual_name in row:
                    value = row[actual_name]
                    # Handle NaN values
                    if pd.notna(value):
                        normalized_row[std_name] = value
            
            # Also add raw date if exists
            if "date" in result.column_mapping:
                normalized_row["trade_date"] = row[result.column_mapping["date"]]
            elif "trade_date" in result.column_mapping:
                normalized_row["trade_date"] = row[result.column_mapping["trade_date"]]
            
            normalized_data.append(normalized_row)
        
        return normalized_data
