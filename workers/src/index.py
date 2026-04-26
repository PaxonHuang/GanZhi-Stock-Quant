"""
GanZhi Stock Dashboard - Cloudflare Worker (Python)

This Worker provides API endpoints for:
- GET /api/stock-data: Fetch stock data from Supabase
- POST /api/import: Import data (for authenticated users)
- GET /api/health: Health check

Note: This Worker uses built-in fetch for HTTP calls to Supabase PostgREST API.
GanZhi calculation is implemented manually (lunar_python not available in Workers).
"""

from datetime import date, datetime
from typing import Optional
import json
import os


# Environment variables (set in Cloudflare Dashboard or .env)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# GanZhi constants
TIAN_GAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]
DI_ZHI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]


def get_supabase_headers() -> dict:
    """Get headers for Supabase API calls."""
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }


def parse_date(date_str: str) -> Optional[date]:
    """Parse date from various formats including M/D/YY."""
    if not date_str:
        return None
    
    # Try M/D/YY format
    if "/" in date_str:
        parts = date_str.split("/")
        if len(parts) == 3:
            try:
                month, day, year = int(parts[0]), int(parts[1]), int(parts[2])
                # Convert 2-digit year
                if year < 100:
                    year = 1900 + year if year >= 90 else 2000 + year
                return date(year, month, day)
            except ValueError:
                pass
    
    # Try standard formats
    for fmt in ["%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y"]:
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            continue
    
    return None


def calculate_ganzhi(dt: date) -> dict:
    """
    Calculate GanZhi (干支) for a given date.
    
    Uses the formula based on:
    - Day GanZhi: (Julian Day Number - 1) mod 10
    - Year GanZhi: (Year - 4) mod 10 for stem, (Year - 4) mod 12 for branch
    """
    # Calculate Julian Day Number (JDN)
    # Using the formula for Gregorian calendar
    year = dt.year
    month = dt.month
    day = dt.day
    
    if month <= 2:
        year -= 1
        month += 12
    
    A = year // 100
    B = A // 4
    C = 2 - A + B
    E = int(365.25 * (year + 4716))
    F = int(30.6001 * (month + 1))
    JDN = C + day + E + F - 1524.5
    
    # Day GanZhi: (JDN - 1) mod 10, offset to start from 甲子 (index 0)
    day_gan_index = int((JDN - 1) % 10)
    day_zhi_index = int((JDN - 1) % 12)
    
    # Year GanZhi: (year - 4) mod 10 for stem, (year - 4) mod 12 for branch
    # Reference: 1984 is甲子 year
    year_gan_index = (year - 4) % 10
    year_zhi_index = (year - 4) % 12
    
    return {
        "year_ganzhi": TIAN_GAN[year_gan_index] + DI_ZHI[year_zhi_index],
        "day_ganzhi": TIAN_GAN[day_gan_index] + DI_ZHI[day_zhi_index]
    }


async def fetch_stock_data(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: Optional[int] = None
) -> list:
    """Fetch stock data from Supabase using PostgREST API."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return {"error": "Supabase credentials not configured"}
    
    # Build query URL
    url = f"{SUPABASE_URL}/rest/v1/stock_data"
    params = []
    
    if start_date:
        params.append(f"trade_date=gte.{start_date}")
    if end_date:
        params.append(f"trade_date=lte.{end_date}")
    
    params.append("order=trade_date.asc")
    
    if limit:
        params.append(f"limit={limit}")
    
    url += "?" + "&".join(params)
    
    # Use built-in fetch for Cloudflare Workers
    response = await fetch(url, {
        "method": "GET",
        "headers": get_supabase_headers()
    })
    
    if response.status == 200:
        return await response.json()
    else:
        text = await response.text()
        return {"error": f"API error: {response.status}", "detail": text}


async def import_stock_data(records: list) -> dict:
    """Import stock data to Supabase using PostgREST API."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return {"success": False, "error": "Supabase credentials not configured"}
    
    url = f"{SUPABASE_URL}/rest/v1/stock_data"
    
    # Use built-in fetch for Cloudflare Workers
    response = await fetch(url, {
        "method": "POST",
        "headers": get_supabase_headers(),
        "body": json.dumps(records)
    })
    
    if response.status in [200, 201]:
        return {"success": True, "imported": len(records)}
    else:
        text = await response.text()
        return {"success": False, "error": f"API error: {response.status}", "detail": text}


async def on_fetch(request):
    """Handle incoming requests."""
    from urllib.parse import urlparse, parse_qs
    
    # Parse URL and query params
    parsed = urlparse(request.url)
    path = parsed.path
    params = parse_qs(parsed.query)
    
    # CORS headers
    cors_headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
    }
    
    # Handle CORS preflight
    if request.method == "OPTIONS":
        return Response("", headers=cors_headers)
    
    # Route: /api/health
    if path == "/api/health":
        return Response(
            json.dumps({"status": "ok", "service": "ganzhi-stock-worker"}),
            headers={**cors_headers, "Content-Type": "application/json"}
        )
    
    # Route: GET /api/stock-data
    if path == "/api/stock-data" and request.method == "GET":
        start_date = params.get("start_date", [None])[0]
        end_date = params.get("end_date", [None])[0]
        limit_str = params.get("limit", [None])[0]
        
        limit = None
        if limit_str:
            try:
                limit = int(limit_str)
            except ValueError:
                pass
        
        data = await fetch_stock_data(start_date, end_date, limit)
        
        return Response(
            json.dumps({"data": data}),
            headers={**cors_headers, "Content-Type": "application/json"}
        )
    
    # Route: POST /api/import
    if path == "/api/import" and request.method == "POST":
        try:
            body = await request.json()
            records = body.get("records", [])
            
            # Process records - calculate GanZhi if not provided
            processed_records = []
            for record in records:
                trade_date = record.get("trade_date")
                if trade_date:
                    # Parse date if string
                    if isinstance(trade_date, str):
                        dt = parse_date(trade_date)
                    else:
                        dt = trade_date
                    
                    if dt and not record.get("ganzi_year"):
                        ganzhi = calculate_ganzhi(dt)
                        record["ganzi_year"] = ganzhi["year_ganzhi"]
                        record["ganzi_day"] = ganzhi["day_ganzhi"]
                
                processed_records.append(record)
            
            result = await import_stock_data(processed_records)
            
            return Response(
                json.dumps(result),
                headers={**cors_headers, "Content-Type": "application/json"}
            )
        except Exception as e:
            return Response(
                json.dumps({"error": str(e)}),
                status=500,
                headers={**cors_headers, "Content-Type": "application/json"}
            )
    
    # Default: 404
    return Response(
        json.dumps({"error": "Not found", "path": path}),
        status=404,
        headers={**cors_headers, "Content-Type": "application/json"}
    )
