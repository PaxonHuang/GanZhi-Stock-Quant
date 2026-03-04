"""
GanZhi Stock Dashboard - Cloudflare Worker (Python)

This Worker provides API endpoints for:
- GET /api/stock-data: Fetch stock data from Supabase
- POST /api/import: Import data (for authenticated users)

Note: This Worker uses direct HTTP calls to Supabase PostgREST API
instead of the Python client (which has compatibility issues with Workers).
"""

from datetime import date, datetime
from typing import Optional
import json
import os
import httpx
from lunar_python import Solar, Lunar


# Environment variables (set in Cloudflare Dashboard or .env)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")


def get_supabase_headers() -> dict:
    """Get headers for Supabase API calls."""
    return {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }


def parse_date(date_str: str) -> Optional[date]:
    """
    Parse date from various formats including M/D/YY.
    
    Examples:
        - "12/19/90" -> 1990-12-19
        - "1/5/05" -> 2005-01-05
        - "1990-12-19" -> 1990-12-19
    """
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


def solar_to_ganzhi(dt: date) -> dict:
    """Convert solar date to GanZhi (干支) information."""
    solar = Solar.fromYmd(dt.year, dt.month, dt.day)
    lunar = solar.getLunar()
    
    return {
        "year_ganzhi": lunar.getYearInGanZhi(),
        "day_ganzhi": lunar.getDayInGanZhi()
    }


async def fetch_stock_data(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: Optional[int] = None
) -> list:
    """
    Fetch stock data from Supabase using PostgREST API.
    
    Args:
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)  
        limit: Maximum number of records
    
    Returns:
        List of stock data records
    """
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
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            url,
            headers=get_supabase_headers()
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            return {"error": f"API error: {response.status_code}", "detail": response.text}


async def import_stock_data(records: list) -> dict:
    """
    Import stock data to Supabase using PostgREST API.
    
    Args:
        records: List of stock data records
    
    Returns:
        Result with success count and any errors
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return {"success": False, "error": "Supabase credentials not configured"}
    
    url = f"{SUPABASE_URL}/rest/v1/stock_data"
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=get_supabase_headers(),
            json=records
        )
        
        if response.status_code in [200, 201]:
            return {"success": True, "imported": len(records)}
        else:
            return {"success": False, "error": f"API error: {response.status_code}", "detail": response.text}


async def on_fetch(request: Request) -> Response:


async def on_fetch(request: Request) -> Response:
    """
    Handle incoming requests.
    
    Routes:
        - GET /api/stock-data - Fetch stock data
        - GET /api/health - Health check
    """
    # Parse URL and query params
    url = URL(request.url)
    path = url.path
    params = dict(url.search_params)
    
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
        start_date = params.get("start_date")
        end_date = params.get("end_date")
        limit = params.get("limit")
        
        if limit:
            try:
                limit = int(limit)
            except ValueError:
                limit = None
        
        data = await fetch_stock_data(start_date, end_date, limit)
        
        return Response(
            json.dumps({"data": data}),
            headers={**cors_headers, "Content-Type": "application/json"}
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
                        ganzhi = solar_to_ganzhi(dt)
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
    
    # Default: 404
    return Response(
        json.dumps({"error": "Not found", "path": path}),
        status=404,
        headers={**cors_headers, "Content-Type": "application/json"}
    )


# For local development with wrangler
if __name__ == "__main__":
    from hyper import hole
    hole.serve()
