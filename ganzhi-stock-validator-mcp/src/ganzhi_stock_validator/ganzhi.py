"""
GanZhi (干支) conversion and validation utilities.

Provides validation for Chinese lunar calendar conversions:
- Year stem-branch (年干支)
- Day stem-branch (日干支)
- Solar term validation
"""

from dataclasses import dataclass
from datetime import date, datetime
from enum import Enum
from typing import Any

from lunar_python import Lunar, Solar


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
class GanZhiValidationResult:
    """Result of GanZhi validation."""
    is_valid: bool
    total_rows: int
    issues: list[ValidationIssue]
    sample_conversions: list[dict[str, Any]]

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for structured output."""
        return {
            "is_valid": self.is_valid,
            "total_rows": self.total_rows,
            "error_count": len([i for i in self.issues if i.level == ValidationLevel.ERROR]),
            "warning_count": len([i for i in self.issues if i.level == ValidationLevel.WARNING]),
            "issues": [i.to_dict() for i in self.issues],
            "sample_conversions": self.sample_conversions[:5],  # First 5 samples
        }


class GanZhiConverter:
    """
    Converter and validator for Chinese GanZhi (干支) calendar system.
    
    Supports:
    - Year stem-branch (天干地支年)
    - Day stem-branch (日干支)
    - Solar date to lunar date conversion
    """

    # Tian Gan (Heavenly Stems) - 天干
    TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
    
    # Di Zhi (Earthly Branches) - 地支
    DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
    
    # Chinese zodiac animals
    ZODIAC_ANIMALS = {
        "子": "鼠", "丑": "牛", "寅": "虎", "卯": "兔",
        "辰": "龙", "巳": "蛇", "午": "马", "未": "羊",
        "申": "猴", "酉": "鸡", "戌": "狗", "亥": "猪",
    }

    def __init__(self):
        """Initialize the GanZhi converter."""
        pass

    def solar_to_ganzhi_year(self, year: int) -> str:
        """
        Convert solar year to GanZhi year.
        
        Args:
            year: Solar year (e.g., 2024)
            
        Returns:
            GanZhi year string (e.g., "甲辰年")
        """
        solar = Solar.fromYmd(year, 1, 1)
        lunar = solar.getLunar()
        year_ganzhi = lunar.getYearInGanZhi()
        return year_ganzhi

    def solar_to_ganzhi_day(self, year: int, month: int, day: int) -> str:
        """
        Convert solar date to GanZhi day.
        
        Args:
            year: Solar year
            month: Solar month
            day: Solar day
            
        Returns:
            GanZhi day string (e.g., "甲子日")
        """
        solar = Solar.fromYmd(year, month, day)
        lunar = solar.getLunar()
        day_ganzhi = lunar.getDayInGanZhi()
        return day_ganzhi

    def solar_to_ganzhi(self, dt: date | datetime) -> dict[str, str]:
        """
        Convert solar date to complete GanZhi information.
        
        Args:
            dt: Date or datetime to convert
            
        Returns:
            Dictionary with 'year_ganzhi', 'day_ganzhi', 'zodiac'
        """
        if isinstance(dt, datetime):
            dt = dt.date()
            
        year = dt.year
        month = dt.month
        day = dt.day
        
        year_ganzhi = self.solar_to_ganzhi_year(year)
        day_ganzhi = self.solar_to_ganzhi_day(year, month, day)
        
        # Extract zodiac from year
        year_gan = year_ganzhi[0]  # First character is Heavenly Stem
        year_zhi = year_ganzhi[1]  # Second character is Earthly Branch
        zodiac = self.ZODIAC_ANIMALS.get(year_zhi, "未知")
        
        return {
            "year_ganzhi": year_ganzhi,
            "day_ganzhi": day_ganzhi,
            "zodiac": zodiac,
            "date": dt.isoformat(),
        }

    def validate_ganzhi_field(self, row: dict[str, Any], row_num: int) -> list[ValidationIssue]:
        """
        Validate GanZhi fields in a data row.
        
        Args:
            row: Data row as dictionary
            row_num: Row number
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Try to get date from various column names
        date_field = row.get("trade_date") or row.get("date") or row.get("日期")
        
        if date_field is None:
            return []  # Skip if no date field
        
        # Parse date
        parsed_date = self._parse_date(date_field)
        if parsed_date is None:
            return []
        
        # Calculate expected GanZhi
        expected = self.solar_to_ganzhi(parsed_date)
        
        # Validate year GanZhi
        stored_year_ganzhi = row.get("ganzi_year") or row.get("year_ganzhi") or row.get("年干支")
        if stored_year_ganzhi:
            stored_year_ganzhi = str(stored_year_ganzhi).strip()
            if stored_year_ganzhi != expected["year_ganzhi"]:
                issues.append(ValidationIssue(
                    level=ValidationLevel.ERROR,
                    field="ganzi_year",
                    row=row_num,
                    message=f"Year GanZhi mismatch: expected '{expected['year_ganzhi']}', got '{stored_year_ganzhi}'",
                    value=stored_year_ganzhi,
                ))
        
        # Validate day GanZhi
        stored_day_ganzhi = row.get("ganzi_day") or row.get("day_ganzhi") or row.get("日干支")
        if stored_day_ganzhi:
            stored_day_ganzhi = str(stored_day_ganzhi).strip()
            if stored_day_ganzhi != expected["day_ganzhi"]:
                issues.append(ValidationIssue(
                    level=ValidationLevel.ERROR,
                    field="ganzi_day",
                    row=row_num,
                    message=f"Day GanZhi mismatch: expected '{expected['day_ganzhi']}', got '{stored_day_ganzhi}'",
                    value=stored_day_ganzhi,
                ))
        
        return issues

    def _parse_date(self, date_str: str) -> date | None:
        """Parse date string with multiple format support."""
        if date_str is None:
            return None
            
        date_str = str(date_str).strip()
        
        # Handle M/D/YY format
        if "/" in date_str:
            parts = date_str.split("/")
            if len(parts) == 3:
                try:
                    month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
                    if year < 100:
                        year = 1900 + year if year >= 90 else 2000 + year
                    return date(year, month, day)
                except ValueError:
                    pass
        
        # Try standard formats
        for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%m/%d/%y"]:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue
                
        return None

    def generate_ganzhi(self, data: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Generate GanZhi fields for stock data.
        
        Args:
            data: List of stock data dictionaries
            
        Returns:
            List with added 'ganzi_year' and 'ganzi_day' fields
        """
        result = []
        
        for row in data:
            row_copy = row.copy()
            
            # Get date
            date_field = row_copy.get("trade_date") or row_copy.get("date") or row_copy.get("日期")
            if date_field:
                parsed_date = self._parse_date(date_field)
                if parsed_date:
                    ganzhi = self.solar_to_ganzhi(parsed_date)
                    row_copy["ganzi_year"] = ganzhi["year_ganzhi"]
                    row_copy["ganzi_day"] = ganzhi["day_ganzhi"]
                    row_copy["zodiac"] = ganzhi["zodiac"]
            
            result.append(row_copy)
        
        return result

    def validate_dataset(self, data: list[dict[str, Any]]) -> GanZhiValidationResult:
        """
        Validate GanZhi fields in entire dataset.
        
        Args:
            data: List of stock data dictionaries
            
        Returns:
            GanZhiValidationResult
        """
        issues: list[ValidationIssue] = []
        sample_conversions: list[dict[str, Any]] = []
        
        for idx, row in enumerate(data):
            row_issues = self.validate_ganzhi_field(row, idx + 1)
            issues.extend(row_issues)
            
            # Collect sample conversions
            if len(sample_conversions) < 10:
                date_field = row.get("trade_date") or row.get("date")
                if date_field:
                    parsed = self._parse_date(date_field)
                    if parsed:
                        ganzhi = self.solar_to_ganzhi(parsed)
                        sample_conversions.append({
                            "date": date_field,
                            "parsed_date": parsed.isoformat(),
                            "year_ganzhi": ganzhi["year_ganzhi"],
                            "day_ganzhi": ganzhi["day_ganzhi"],
                            "zodiac": ganzhi["zodiac"],
                        })
        
        error_count = len([i for i in issues if i.level == ValidationLevel.ERROR])
        
        return GanZhiValidationResult(
            is_valid=error_count == 0,
            total_rows=len(data),
            issues=issues,
            sample_conversions=sample_conversions,
        )


# Singleton instance
converter = GanZhiConverter()
