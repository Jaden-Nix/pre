# Predora Market Data API Documentation

## Overview
The Market Data API provides comprehensive access to historical market data, user activity, leaderboards, and platform statistics.

## Base URL
```
http://localhost:5000/api/data
```

## Endpoints

### 1. Get All Markets
**GET** `/api/data/markets`

Query markets with filtering and pagination.

**Query Parameters:**
- `category` (optional): Filter by category (e.g., "crypto", "sports")
- `status` (optional): Filter by status ("active", "resolved")
- `limit` (optional, default: 50): Number of results to return
- `offset` (optional, default: 0): Pagination offset

**Example:**
```bash
GET /api/data/markets?category=crypto&status=active&limit=20
```

**Response:**
```json
{
  "markets": [
    {
      "id": "market-123",
      "title": "Will BTC reach $100k by EOY?",
      "category": "crypto",
      "isResolved": false,
      "yesOdds": 65,
      "noOdds": 35,
      "totalVolume": 1250,
      "createdAt": "2025-01-15T10:00:00Z"
    }
  ],
  "count": 20
}
```

---

### 2. Get Market Details
**GET** `/api/data/market/:marketId`

Get detailed information about a specific market including all pledges.

**Example:**
```bash
GET /api/data/market/market-123
```

**Response:**
```json
{
  "market": {
    "id": "market-123",
    "title": "Will BTC reach $100k by EOY?",
    "description": "...",
    "category": "crypto",
    "isResolved": false
  },
  "stats": {
    "totalVolume": 1250,
    "yesCount": 45,
    "noCount": 32,
    "totalPledges": 77
  },
  "pledges": [
    {
      "userId": "user-456",
      "prediction": "YES",
      "amount": 50,
      "timestamp": "2025-01-20T15:30:00Z"
    }
  ]
}
```

---

### 3. Get Market History
**GET** `/api/data/market/:marketId/history`

Get historical odds and volume data for a market.

**Example:**
```bash
GET /api/data/market/market-123/history
```

**Response:**
```json
{
  "marketId": "market-123",
  "history": [
    {
      "timestamp": "2025-01-15T10:00:00Z",
      "yesOdds": 50,
      "noOdds": 50,
      "volume": 0
    },
    {
      "timestamp": "2025-01-15T11:00:00Z",
      "yesOdds": 55,
      "noOdds": 45,
      "volume": 150
    }
  ]
}
```

---

### 4. Get Leaderboard
**GET** `/api/data/leaderboard`

Get platform leaderboard with rankings.

**Query Parameters:**
- `limit` (optional, default: 100): Number of users to return
- `sortBy` (optional, default: "xp"): Sort by "xp", "totalEarnings", or "winRate"

**Example:**
```bash
GET /api/data/leaderboard?sortBy=totalEarnings&limit=50
```

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "user-789",
      "displayName": "CryptoKing",
      "avatar": "🚀",
      "xp": 15000,
      "totalEarnings": 2500,
      "totalPredictions": 120,
      "totalWins": 85,
      "winRate": 70.8
    }
  ]
}
```

---

### 5. Get User Activity
**GET** `/api/data/user/:userId/activity`

Get user profile and recent activity.

**Example:**
```bash
GET /api/data/user/user-456/activity
```

**Response:**
```json
{
  "profile": {
    "id": "user-456",
    "displayName": "TraderJoe",
    "avatar": "🎯",
    "xp": 5000,
    "totalEarnings": 750,
    "winRate": 65.5
  },
  "recentActivity": [
    {
      "marketId": "market-123",
      "prediction": "YES",
      "amount": 50,
      "timestamp": "2025-01-20T15:30:00Z"
    }
  ],
  "stats": {
    "marketsCreated": 5,
    "totalPledges": 42
  }
}
```

---

### 6. Get Platform Statistics
**GET** `/api/data/stats`

Get overall platform statistics.

**Example:**
```bash
GET /api/data/stats
```

**Response:**
```json
{
  "totalMarkets": 450,
  "resolvedMarkets": 320,
  "activeMarkets": 130,
  "totalPledges": 12500,
  "totalVolume": 45000,
  "totalUsers": 2340
}
```

---

## Use Cases

### Analytics Dashboard
Fetch platform-wide statistics:
```javascript
const response = await fetch('/api/data/stats');
const stats = await response.json();
console.log(`Total Volume: $${stats.totalVolume}`);
```

### User Profile Page
Display user activity and performance:
```javascript
const userId = 'user-456';
const response = await fetch(`/api/data/user/${userId}/activity`);
const data = await response.json();
console.log(`Win Rate: ${data.profile.winRate}%`);
```

### Market Charts
Visualize historical odds:
```javascript
const marketId = 'market-123';
const response = await fetch(`/api/data/market/${marketId}/history`);
const { history } = await response.json();

// Use with Chart.js or any charting library
const labels = history.map(h => new Date(h.timestamp).toLocaleDateString());
const yesData = history.map(h => h.yesOdds);
const noData = history.map(h => h.noOdds);
```

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message description"
}
```

Common status codes:
- `200`: Success
- `404`: Resource not found
- `500`: Server error
- `503`: Firebase not initialized

---

## Notes

- All timestamps are in ISO 8601 format
- Odds are returned as percentages (0-100)
- Volume and amounts are in platform currency units
- All endpoints are read-only (GET requests only)
- No authentication required for public data endpoints
