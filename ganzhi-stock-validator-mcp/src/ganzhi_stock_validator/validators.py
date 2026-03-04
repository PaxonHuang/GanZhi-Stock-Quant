"""
Stock data validation utilities.

Provides comprehensive validation for stock market data including:
- OHLC (Open, High, Low, Close) relationship validation
- Date format and range validation
- Volume and amount validation
- Data completeness checks
"""

from dataclasses import dataclass
from datetime import date, datetime
from enum import Enum
from typing import Any

import pandas as pd


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

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for structured output."""
        return {
            "level": self.level.value,
            "field": self.field,
            "row": self.row,
            "message": self.message,
            "value": str(self.value) if self.value is not None else None,
        }


@dataclass
class ValidationResult:
    """Result of data validation."""
    is_valid: bool
    total_rows: int
    issues: list[ValidationIssue]
    summary: dict[str, int]

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for structured output."""
        return {
            "is_valid": self.is_valid,
            "total_rows": self.total_rows,
            "valid_rows": self.total_rows - len([i for i in self.issues if i.level == ValidationLevel.ERROR]),
            "error_count": self.summary.get("error", 0),
            "warning_count": self.summary.get("warning", 0),
            "info_count": self.summary.get("info", 0),
            "issues": [i.to_dict() for i in self.issues],
        }


class StockDataValidator:
    """
    Validator for stock market data.
    
    Validates data according to standard stock market data rules:
    - OHLC relationships
    - Date formats and ranges
    - Volume and amount validity
    - Data completeness
    """

    # Valid date formats to try
    DATE_FORMATS = [
        "%Y-%m-%d",
        "%Y/%m/%d",
        "%m/%d/%Y",
        "%m/%d/%y",
        "%d/%m/%Y",
        "%Y%m%d",
    ]

    # Minimum valid date for stock data (1990-01-01 for Shanghai Stock Exchange)
    MIN_DATE = date(1990, 1, 1)
    # Maximum date is today + 1 day (to allow future-dated entries)
    MAX_DATE = date.today()

    def __init__(self, min_date: date | None = None, max_date: date | None = None):
        """
        Initialize validator with optional date bounds.
        
        Args:
            min_date: Minimum valid date (defaults to 1990-01-01)
            max_date: Maximum valid date (defaults to today)
        """
        self.min_date = min_date or self.MIN_DATE
        self.max_date = max_date or self.MAX_DATE

    def parse_date(self, date_str: str) -> date | None:
        """
        Parse date string with multiple format support.
        
        Handles M/D/YY format specifically (e.g., "12/19/90" -> 1990-12-19)
        
        Args:
            date_str: Date string to parse
            
        Returns:
            Parsed date or None if parsing fails
        """
        if pd.isna(date_str):
            return None

        date_str = str(date_str).strip()

        # Handle M/D/YY format specifically (common in Excel exports)
        # This is critical for the GanZhi Stock Dashboard project
        if "/" in date_str:
            parts = date_str.split("/")
            if len(parts) == 3:
                try:
                    month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
                    # Handle 2-digit year conversion
                    if year < 100:
                        year = 1900 + year if year >= 90 else 2000 + year
                    return date(year, month, day)
                except ValueError:
                    pass

        # Try other formats
        for fmt in self.DATE_FORMATS:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue

        return None

    def validate_ohlc(self, row: dict[str, Any], row_num: int) -> list[ValidationIssue]:
        """
        Validate OHLC (Open, High, Low, Close) relationships.
        
        Rules:
        - High must be >= max(Open, Close)
        - Low must be <= min(Open, Close)
        - All values must be positive
        - Open and Close cannot both be zero
        
        Args:
            row: Data row as dictionary
            row_num: Row number for error reporting
            
        Returns:
            List of validation issues
        """
        issues = []

        try:
            open_price = float(row.get("open", 0))
            high_price = float(row.get("high", 0))
            low_price = float(row.get("low", 0))
            close_price = float(row.get("close", 0))
        except (ValueError, TypeError):
            issues.append(ValidationIssue(
                level=ValidationLevel.ERROR,
                field="OHLC",
                row=row_num,
                message="OHLC values must be numeric",
            ))
            return issues

        # Check positivity
        for field, value in [("open", open_price), ("high", high_price), 
                            ("low", low_price), ("close", close_price)]:
            if value <= 0:
                issues.append(ValidationIssue(
                    level=ValidationLevel.ERROR,
                    field=field,
                    row=row_num,
                    message=f"{field.capitalize()} price must be positive",
                    value=value,
                ))

        if len(issues) > 0:
            return issues

        # Check High >= max(Open, Close)
        max_oc = max(open_price, close_price)
        if high_price < max_oc:
            issues.append(ValidationIssue(
                level=ValidationLevel.ERROR,
                field="high",
                row=row_num,
                message=f"High ({high_price}) must be >= max(Open, Close) ({max_oc})",
                value=high_price,
            ))

        # Check Low <= min(Open, Close)
        min_oc = min(open_price, close_price)
        if low_price > min_oc:
            issues.append(ValidationIssue(
                level=ValidationLevel.ERROR,
                field="low",
                row=row_num,
                message=f"Low ({low_price}) must be <= min(Open, Close) ({min_oc})",
                value=low_price,
            ))

        # Check Open and Close not both zero
        if open_price == 0 and close_price == 0:
            issues.append(ValidationIssue(
                level=ValidationLevel.WARNING,
                field="open,close",
                row=row_num,
                message="Both Open and Close are zero - possible missing data",
                value={"open": open_price, "close": close_price},
            ))

        return issues

    def validate_date(self, row: dict[str, Any], row_num: int) -> list[ValidationIssue]:
        """
        Validate date field.
        
        Args:
            row: Data row as dictionary
            row_num: Row number for error reporting
            
        Returns:
            List of validation issues
        """
        issues = []
        date_field = row.get("trade_date") or row.get("date") or row.get("日期")

        if date_field is None:
            issues.append(ValidationIssue(
                level=ValidationLevel.ERROR,
                field="trade_date",
                row=row_num,
                message="Date field is missing",
            ))
            return issues

        parsed_date = self.parse_date(date_field)

        if parsed_date is None:
            issues.append(ValidationIssue(
                level=ValidationLevel.ERROR,
                field="trade_date",
                row=row_num,
                message=f"Invalid date format: {date_field}",
                value=date_field,
            ))
            return issues

        if parsed_date < self.min_date:
            issues.append(ValidationIssue(
                level=ValidationLevel.ERROR,
                field="trade_date",
                row=row_num,
                message=f"Date {parsed_date} is before minimum date {self.min_date}",
                value=parsed_date,
            ))

        if parsed_date > self.max_date:
            issues.append(ValidationIssue(
                level=ValidationLevel.WARNING,
                field="trade_date",
                row=row_num,
                message=f"Date {parsed_date} is in the future",
                value=parsed_date,
            ))

        return issues

    def validate_volume(self, row: dict[str, Any], row_num: int) -> list[ValidationIssue]:
        """
        Validate volume and amount fields.
        
        Args:
            row: Data row as dictionary
            row_num: Row number for error reporting
            
        Returns:
            List of validation issues
        """
        issues = []

        # Validate volume
        volume = row.get("volume") or row.get("vol") or row.get("成交量")
        if volume is not None:
            try:
                volume_val = float(volume)
                if volume_val < 0:
                    issues.append(ValidationIssue(
                        level=ValidationLevel.ERROR,
                        field="volume",
                        row=row_num,
                        message="Volume cannot be negative",
                        value=volume_val,
                    ))
                elif volume_val == 0:
                    issues.append(ValidationIssue(
                        level=ValidationLevel.WARNING,
                        field="volume",
                        row=row_num,
                        message="Volume is zero - trading may have been suspended",
                        value=volume_val,
                    ))
            except (ValueError, TypeError):
                issues.append(ValidationIssue(
                    level=ValidationLevel.ERROR,
                    field="volume",
                    row=row_num,
                    message="Volume must be numeric",
                    value=volume,
                ))

        # Validate amount
        amount = row.get("amount") or row.get("成交额")
        if amount is not None:
            try:
                amount_val = float(amount)
                if amount_val < 0:
                    issues.append(ValidationIssue(
                        level=ValidationLevel.ERROR,
                        field="amount",
                        row=row_num,
                        message="Amount cannot be negative",
                        value=amount_val,
                    ))
            except (ValueError, TypeError):
                issues.append(ValidationIssue(
                    level=ValidationLevel.ERROR,
                    field="amount",
                    row=row_num,
                    message="Amount must be numeric",
                    value=amount,
                ))

        return issues

    def validate_row(self, row: dict[str, Any], row_num: int) -> list[ValidationIssue]:
        """
        Validate a single data row.
        
        Args:
            row: Data row as dictionary
            row_num: Row number (1-based, excluding header)
            
        Returns:
            List of validation issues
        """
        all_issues = []
        
        # Validate date first
        all_issues.extend(self.validate_date(row, row_num))
        
        # Validate OHLC
        all_issues.extend(self.validate_ohlc(row, row_num))
        
        # Validate volume and amount
        all_issues.extend(self.validate_volume(row, row_num))
        
        return all_issues

    def validate_dataframe(self, df: pd.DataFrame) -> ValidationResult:
        """
        Validate an entire DataFrame of stock data.
        
        Args:
            df: DataFrame containing stock data
            
        Returns:
            ValidationResult with all issues found
        """
        issues: list[ValidationIssue] = []
        
        # Check for empty DataFrame
        if df.empty:
            return ValidationResult(
                is_valid=False,
                total_rows=0,
                issues=[ValidationIssue(
                    level=ValidationLevel.ERROR,
                    field="dataframe",
                    row=None,
                    message="DataFrame is empty",
                )],
                summary={"error": 1},
            )

        # Check for required columns
        required_fields = ["open", "high", "low", "close"]
        missing_fields = [f for f in required_fields if f not in df.columns]
        
        # Also check Chinese column names
        chinese_mapping = {
            "日期": "trade_date",
            "开盘": "open",
            "最高": "high",
            "最低": "low",
            "收盘": "close",
            "成交量": "volume",
            "成交额": "amount",
        }
        
        # If using Chinese columns, try to standardize
        df_work = df.copy()
        for cn, en in chinese_mapping.items():
            if cn in df_work.columns and en not in df_work.columns:
                df_work.rename(columns={cn: en}, inplace=True)
        
        missing_fields = [f for f in required_fields if f not in df_work.columns]
        if missing_fields:
            issues.append(ValidationIssue(
                level=ValidationLevel.ERROR,
                field="schema",
                row=None,
                message=f"Missing required columns: {missing_fields}",
            ))
            return ValidationResult(
                is_valid=False,
                total_rows=len(df),
                issues=issues,
                summary={"error": 1},
            )

        # Validate each row
        for idx, row in df_work.iterrows():
            row_issues = self.validate_row(row.to_dict(), idx + 1)
            issues.extend(row_issues)

        # Calculate summary
        summary = {
            "error": len([i for i in issues if i.level == ValidationLevel.ERROR]),
            "warning": len([i for i in issues if i.level == ValidationLevel.WARNING]),
            "info": len([i for i in issues if i.level == ValidationLevel.INFO]),
        }

        is_valid = summary["error"] == 0

        return ValidationResult(
            is_valid=is_valid,
            total_rows=len(df),
            issues=issues,
            summary=summary,
        )

    def validate_json(self, data: list[dict[str, Any]]) -> ValidationResult:
        """
        Validate stock data from JSON format.
        
        Args:
            data: List of dictionaries containing stock data
            
        Returns:
            ValidationResult with all issues found
        """
        df = pd.DataFrame(data)
        return self.validate_dataframe(df)
