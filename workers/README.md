# GanZhi Stock Dashboard - Cloudflare Worker

## Quick Start

### Prerequisites
1. Cloudflare account
2. Supabase project with PostgreSQL database

### Setup Steps

#### 1. Configure Supabase Database

Run the SQL schema in Supabase SQL Editor:

```sql
-- Copy contents from ../supabase/schema.sql and run in Supabase
```

#### 2. Create Cloudflare Worker

```bash
# Install wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy worker
cd workers
wrangler deploy
```

#### 3. Configure Supabase Integration

After deploying, configure Supabase in Cloudflare Dashboard:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your Worker
3. Go to Settings → Integrations
4. Find Supabase and add integration
5. Enter your Supabase project credentials

#### 4. Set Environment Variables

In Worker Settings → Variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Note**: Use service role key for server-side operations (bypasses RLS).

#### 5. Configure CORS (Optional)

The worker already includes CORS headers for public access.

## API Endpoints

### GET /api/health
Health check endpoint.

**Response:**
```json
{"status": "ok", "service": "ganzhi-stock-worker"}
```

### GET /api/stock-data
Fetch stock data from database.

**Query Parameters:**
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)
- `limit` (optional): Max records

**Example:**
```
/api/stock-data?start_date=1990-01-01&end_date=1990-12-31&limit=100
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "trade_date": "1990-12-19",
      "open": 99.98,
      "high": 100.17,
      "low": 99.52,
      "close": 99.71,
      "volume": 1020000,
      "amount": null,
      "ganzi_year": "庚午年",
      "ganzi_day": "甲子日",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## Development

### Local Development

```bash
# Install dependencies
cd workers
pip install -e .

# Run locally (requires .env file)
wrangler dev
```

### Environment Variables (.env)

Create a `.dev.vars` file in the workers directory:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

## Troubleshooting

### Issue: "Supabase credentials not configured"
**Solution**: Ensure environment variables are set in Cloudflare Dashboard.

### Issue: "API error: 404"
**Solution**: Check that the `stock_data` table exists in Supabase and the URL is correct.

### Issue: CORS errors
**Solution**: The worker includes CORS headers. If issues persist, check your Supabase project's CORS settings.
