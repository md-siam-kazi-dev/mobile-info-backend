# 📱 MobileDokan API — Full Reference

> REST API for Bangladesh mobile phone market · 550 phones · 6 brands · BDT pricing

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Base URL & Headers](#base-url--headers)
3. [Pagination System](#pagination-system)
4. [Response Format](#response-format)
5. [Error Codes](#error-codes)
6. [Endpoints](#endpoints)
   - [GET /api/phones](#1-get-apiphones)
   - [GET /api/phones/:slug](#2-get-apiphoneslug)
   - [GET /api/brands](#3-get-apibrands)
   - [GET /api/brands/:brand](#4-get-apibrandsbrand)
   - [GET /api/search](#5-get-apisearch)
   - [GET /api/compare](#6-get-apicompare)
   - [GET /api/featured](#7-get-apifeatured)
   - [GET /api/latest](#8-get-apilatest)
   - [GET /api/budget](#9-get-apibudget)
   - [GET /api/price-range](#10-get-apiprice-range)
   - [GET /api/stats](#11-get-apistats)
7. [Data Schema](#data-schema)
8. [Filter & Sort Reference](#filter--sort-reference)
9. [Common Use Cases](#common-use-cases)

---

## Getting Started

### Installation

```bash
# Install dependencies
npm install express cors

# Place your data file in the same folder
# phones_data_v3.json must be present

# Start the server
node server.js
```

### Development (auto-restart)

```bash
npm install -g nodemon
nodemon server.js
```

### Verify it's running

```bash
curl http://localhost:3000
```

Expected response:
```json
{
  "status": "ok",
  "message": "MobileDokan API is running 🚀",
  "version": "1.0.0"
}
```

---

## Base URL & Headers

```
Base URL:  http://localhost:3000
```

All endpoints return `Content-Type: application/json`.

No authentication required. No API key needed.

---

## Pagination System

All list endpoints support pagination via two query parameters:

| Param | Default | Min | Max | Description |
|-------|---------|-----|-----|-------------|
| `page` | `1` | `1` | — | Page number |
| `limit` | `20` | `1` | `100` | Items per page |

### How it works

```
skip = (page - 1) × limit
result = data.slice(skip, skip + limit)
```

**Example:** `page=3&limit=10`
- skip = (3−1) × 10 = 20
- returns items 21 → 30

### Pagination object in response

```json
"pagination": {
  "total": 550,       ← total matching records (after filters)
  "page": 2,          ← current page
  "limit": 20,        ← items per page
  "totalPages": 28,   ← ceil(total / limit)
  "hasNext": true,    ← page < totalPages
  "hasPrev": true     ← page > 1
}
```

> ⚠️ **Important:** Filters apply BEFORE pagination. If you filter `brand=Samsung`
> and get 80 results, `total` will be 80 — not 550.

---

## Response Format

### Success (list)
```json
{
  "success": true,
  "pagination": {
    "total": 80,
    "page": 1,
    "limit": 20,
    "totalPages": 4,
    "hasNext": true,
    "hasPrev": false
  },
  "data": [ ...phones ]
}
```

### Success (single item)
```json
{
  "success": true,
  "data": { ...phone },
  "related": [ ...phones ]
}
```

### Success (no pagination)
```json
{
  "success": true,
  "count": 12,
  "data": [ ...phones ]
}
```

### Error
```json
{
  "success": false,
  "error": "Phone not found"
}
```

---

## Error Codes

| HTTP Status | Meaning | When it happens |
|-------------|---------|-----------------|
| `200` | OK | Request succeeded |
| `400` | Bad Request | Missing required param (e.g. `q` in search, too few IDs in compare) |
| `404` | Not Found | Slug/ID doesn't exist, brand has no phones |
| `500` | Server Error | Unexpected server-side crash |

---

## Endpoints

---

### 1. GET /api/phones

List all phones with filtering, sorting, and pagination.

```
GET /api/phones
```

#### Query Parameters

| Param | Type | Example | Description |
|-------|------|---------|-------------|
| `brand` | string | `Samsung` | Filter by brand name. Case-insensitive. Comma-separate for multiple. |
| `tier` | string | `budget` | Filter by tier: `budget`, `mid`, `flagship`. Comma-separate for multiple. |
| `network` | string | `5G` | Filter by network: `5G` or `4G LTE` |
| `min_price` | number | `10000` | Minimum price in BDT (inclusive) |
| `max_price` | number | `30000` | Maximum price in BDT (inclusive) |
| `min_ram` | number | `6` | Minimum RAM in GB (e.g. `6` matches "6GB", "8GB", "12GB") |
| `in_stock` | boolean | `true` | `true` = in-stock only · `false` = out-of-stock only |
| `nfc` | boolean | `true` | `true` = only phones where NFC = "Yes" |
| `jack` | boolean | `true` | `true` = only phones with 3.5mm headphone jack |
| `release_year` | number | `2024` | Exact release year match |
| `sort_by` | string | `price_asc` | Sort order (see sort options below) |
| `page` | number | `1` | Page number (default: 1) |
| `limit` | number | `20` | Items per page (default: 20, max: 100) |

#### Sort Options

| Value | Sorts by |
|-------|----------|
| `price_asc` | Price low → high |
| `price_desc` | Price high → low |
| `rating` | Rating high → low |
| `reviews` | Most reviewed first |
| `newest` | Release year high → low |
| `oldest` | Release year low → high |

#### Example Requests

```bash
# All Samsung phones, cheapest first
GET /api/phones?brand=Samsung&sort_by=price_asc

# Flagship phones over ৳50,000
GET /api/phones?tier=flagship&min_price=50000

# 5G phones with NFC, sorted by rating
GET /api/phones?network=5G&nfc=true&sort_by=rating

# Redmi or POCO phones under ৳20,000
GET /api/phones?brand=Redmi,POCO&max_price=20000

# Page 2 of budget phones, 10 per page
GET /api/phones?tier=budget&page=2&limit=10

# In-stock phones with at least 8GB RAM
GET /api/phones?min_ram=8&in_stock=true&sort_by=price_asc

# Phones released in 2024
GET /api/phones?release_year=2024&sort_by=rating
```

#### Example Response

```json
{
  "success": true,
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  },
  "data": [
    {
      "id": 159427,
      "brand": "Samsung",
      "model": "Galaxy A05",
      "full_name": "Samsung Galaxy A05",
      "slug": "samsung-galaxy-a05",
      "price_bdt": 12999,
      "tier": "budget",
      "rating": 4.2,
      "reviews": 3711,
      "in_stock": true,
      "image_url": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a05.jpg",
      "release_year": 2022,
      "display": { ... },
      "processor": { ... },
      "memory": { ... },
      "camera": { ... },
      "battery": { ... },
      "connectivity": { ... },
      "design": { ... },
      "software": { ... }
    }
  ]
}
```

---

### 2. GET /api/phones/:slug

Get full details of a single phone plus 6 related phones.

```
GET /api/phones/:slug
```

#### URL Parameter

| Param | Type | Description |
|-------|------|-------------|
| `slug` | string | Phone slug (e.g. `samsung-galaxy-a05`) OR numeric ID (e.g. `159427`) |

#### Example Requests

```bash
# By slug
GET /api/phones/samsung-galaxy-a05

# By ID
GET /api/phones/159427

# Another example
GET /api/phones/redmi-note-13-pro
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "id": 159427,
    "brand": "Samsung",
    "model": "Galaxy A05",
    "full_name": "Samsung Galaxy A05",
    "slug": "samsung-galaxy-a05",
    "price_bdt": 12999,
    "tier": "budget",
    "display": {
      "size": "6.5\" IPS LCD",
      "resolution": "1612 x 720 pixels",
      "type": "IPS LCD",
      "refresh_rate": "90Hz",
      "protection": "Corning Gorilla Glass 3"
    },
    "processor": {
      "chipset": "Helio G96",
      "cpu": "Octa-core",
      "gpu": "Mali-G610"
    },
    "memory": {
      "ram": "4GB",
      "rom": "64GB",
      "expandable": "microSDXC (up to 1TB)"
    },
    "camera": {
      "rear": "48MP (Wide) + 2MP (Depth)",
      "front": "5MP",
      "video": "1080p@30fps",
      "features": "AI Scene Detection, Night Mode, Portrait Mode"
    },
    "battery": {
      "capacity": "4000mAh",
      "charging": "15W",
      "wireless": "No",
      "reverse_wireless": "No"
    },
    "connectivity": {
      "network": "5G",
      "wifi": "Wi-Fi 5",
      "bluetooth": "5.1",
      "nfc": "No",
      "usb": "USB Type-C",
      "jack": "3.5mm"
    },
    "design": {
      "dimensions": "163.4 x 75.9 x 8.8mm",
      "weight": "201g",
      "colors": ["Ice Blue", "Graphite Black"],
      "build": "Glass front, Plastic back"
    },
    "software": {
      "os": "Android 13",
      "ui": "One UI 6.1"
    },
    "rating": 4.2,
    "reviews": 3711,
    "in_stock": true,
    "image_url": "https://fdn2.gsmarena.com/vv/bigpic/samsung-galaxy-a05.jpg",
    "release_year": 2022
  },
  "related": [
    { ...phone },
    { ...phone },
    { ...phone },
    { ...phone },
    { ...phone },
    { ...phone }
  ]
}
```

> `related` contains up to 6 phones from the same **brand** and **tier**, sorted by rating.

#### Error Response (404)

```json
{
  "success": false,
  "error": "Phone not found"
}
```

---

### 3. GET /api/brands

Get all available brands with phone count and average price.

```
GET /api/brands
```

No query parameters.

#### Example Request

```bash
GET /api/brands
```

#### Example Response

```json
{
  "success": true,
  "total": 6,
  "data": [
    { "brand": "Samsung", "count": 120, "avgPrice": 28450 },
    { "brand": "Redmi",   "count": 98,  "avgPrice": 18200 },
    { "brand": "Vivo",    "count": 87,  "avgPrice": 22100 },
    { "brand": "POCO",    "count": 65,  "avgPrice": 19800 },
    { "brand": "Oppo",    "count": 95,  "avgPrice": 25300 },
    { "brand": "Realme",  "count": 85,  "avgPrice": 17600 }
  ]
}
```

> Sorted by phone count descending.

---

### 4. GET /api/brands/:brand

Get all phones from a specific brand with sorting and pagination.

```
GET /api/brands/:brand
```

#### URL Parameter

| Param | Type | Description |
|-------|------|-------------|
| `brand` | string | Brand name, case-insensitive (e.g. `Samsung`, `samsung`, `SAMSUNG`) |

#### Query Parameters

| Param | Description |
|-------|-------------|
| `sort_by` | Same sort options as `/api/phones` (default: `newest`) |
| `page` | Page number |
| `limit` | Items per page |

#### Example Requests

```bash
# All Samsung phones, newest first
GET /api/brands/Samsung

# Redmi phones cheapest first, 12 per page
GET /api/brands/Redmi?sort_by=price_asc&limit=12

# POCO phones page 2
GET /api/brands/POCO?page=2&limit=10
```

#### Example Response

```json
{
  "success": true,
  "brand": "Samsung",
  "pagination": {
    "total": 120,
    "page": 1,
    "limit": 20,
    "totalPages": 6,
    "hasNext": true,
    "hasPrev": false
  },
  "data": [ ...phones ]
}
```

#### Error Response (404)

```json
{
  "success": false,
  "error": "No phones found for brand: Nokia"
}
```

---

### 5. GET /api/search

Search phones by name, brand, model, or chipset.

```
GET /api/search?q=<query>
```

#### Query Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `q` | ✅ Yes | Search term (case-insensitive, partial match) |
| `sort_by` | No | Sort order (default: `rating`) |
| `page` | No | Page number |
| `limit` | No | Items per page |

#### What it searches

- `full_name` — e.g. "Samsung Galaxy A55"
- `brand` — e.g. "Realme"
- `model` — e.g. "Note 13 Pro"
- `processor.chipset` — e.g. "Snapdragon 8 Gen 3"

#### Example Requests

```bash
# Search by model name
GET /api/search?q=galaxy a55

# Search by chipset
GET /api/search?q=snapdragon&sort_by=price_asc

# Search by brand
GET /api/search?q=poco

# Search with pagination
GET /api/search?q=note&page=2&limit=10
```

#### Example Response

```json
{
  "success": true,
  "query": "galaxy a55",
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 20,
    "totalPages": 1,
    "hasNext": false,
    "hasPrev": false
  },
  "data": [ ...phones ]
}
```

#### Error Response (400)

```json
{
  "success": false,
  "error": "Query parameter 'q' is required"
}
```

---

### 6. GET /api/compare

Compare 2 to 4 phones side by side using IDs or slugs.

```
GET /api/compare?ids=<id1>,<id2>,<id3>,<id4>
```

#### Query Parameters

| Param | Required | Description |
|-------|----------|-------------|
| `ids` | ✅ Yes | Comma-separated list of 2–4 phone IDs or slugs |

#### Example Requests

```bash
# Compare by ID
GET /api/compare?ids=159427,333894

# Compare by slug
GET /api/compare?ids=samsung-galaxy-a55,redmi-note-13-pro

# Compare 3 phones (mixed IDs and slugs both work)
GET /api/compare?ids=samsung-galaxy-a55,redmi-note-13-pro,vivo-v30

# Compare 4 phones
GET /api/compare?ids=159427,333894,441122,553311
```

#### Example Response

Returns a **flattened** spec object per phone — ideal for building comparison tables:

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 159427,
      "full_name": "Samsung Galaxy A05",
      "slug": "samsung-galaxy-a05",
      "price_bdt": 12999,
      "image_url": "https://...",
      "tier": "budget",
      "rating": 4.2,
      "display_size": "6.5\" IPS LCD",
      "display_type": "IPS LCD",
      "display_refresh": "90Hz",
      "chipset": "Helio G96",
      "cpu": "Octa-core",
      "gpu": "Mali-G610",
      "ram": "4GB",
      "storage": "64GB",
      "expandable": "microSDXC (up to 1TB)",
      "rear_camera": "48MP (Wide) + 2MP (Depth)",
      "front_camera": "5MP",
      "battery": "4000mAh",
      "charging": "15W",
      "network": "5G",
      "nfc": "No",
      "usb": "USB Type-C",
      "jack": "3.5mm",
      "os": "Android 13",
      "ui": "One UI 6.1",
      "weight": "201g",
      "build": "Glass front, Plastic back",
      "in_stock": true,
      "release_year": 2022
    },
    {
      "id": 333894,
      "full_name": "Samsung Galaxy A05s",
      ...
    }
  ]
}
```

#### Error Responses

```json
// Less than 2 IDs
{ "success": false, "error": "Provide at least 2 phone ids to compare" }

// More than 4 IDs
{ "success": false, "error": "Maximum 4 phones can be compared at once" }

// One or more IDs not found
{ "success": false, "error": "Phones not found: 999999, bad-slug" }
```

---

### 7. GET /api/featured

Get top-rated in-stock phones across all brands.

```
GET /api/featured
```

#### Query Parameters

| Param | Default | Max | Description |
|-------|---------|-----|-------------|
| `limit` | `12` | `50` | Number of phones to return |

#### Selection Criteria

- `in_stock = true`
- `rating >= 4.0`
- Sorted by rating DESC, then by reviews DESC

#### Example Requests

```bash
# Default 12 featured phones
GET /api/featured

# Get top 24 featured phones
GET /api/featured?limit=24
```

#### Example Response

```json
{
  "success": true,
  "count": 12,
  "data": [ ...phones sorted by rating ]
}
```

---

### 8. GET /api/latest

Get the most recently released phones.

```
GET /api/latest
```

#### Query Parameters

| Param | Default | Max | Description |
|-------|---------|-----|-------------|
| `limit` | `12` | `50` | Number of phones to return |

#### Selection Criteria

- All phones (in-stock and out-of-stock)
- Sorted by `release_year` DESC

#### Example Requests

```bash
# 12 latest phones
GET /api/latest

# 30 latest phones
GET /api/latest?limit=30
```

#### Example Response

```json
{
  "success": true,
  "count": 12,
  "data": [ ...phones sorted by release_year desc ]
}
```

---

### 9. GET /api/budget

Get best-value phones within a price ceiling, sorted by rating.

```
GET /api/budget
```

#### Query Parameters

| Param | Default | Description |
|-------|---------|-------------|
| `max_price` | `15000` | Maximum price in BDT |
| `limit` | `20` | Number of phones to return (max: 50) |

#### Selection Criteria

- `price_bdt <= max_price`
- `in_stock = true`
- Sorted by rating DESC

#### Example Requests

```bash
# Best phones under ৳15,000 (default)
GET /api/budget

# Best phones under ৳10,000
GET /api/budget?max_price=10000

# Best phones under ৳25,000, top 30
GET /api/budget?max_price=25000&limit=30
```

#### Example Response

```json
{
  "success": true,
  "max_price": 15000,
  "count": 18,
  "data": [ ...phones sorted by rating ]
}
```

---

### 10. GET /api/price-range

Get price metadata and phone count per price bucket.

```
GET /api/price-range
```

No query parameters.

#### Example Request

```bash
GET /api/price-range
```

#### Example Response

```json
{
  "success": true,
  "min": 7999,
  "max": 199999,
  "ranges": [
    { "label": "Under ৳10,000",        "min": 0,      "max": 9999,   "count": 12 },
    { "label": "৳10,000 – ৳15,000",    "min": 10000,  "max": 15000,  "count": 87 },
    { "label": "৳15,001 – ৳25,000",    "min": 15001,  "max": 25000,  "count": 143 },
    { "label": "৳25,001 – ৳40,000",    "min": 25001,  "max": 40000,  "count": 156 },
    { "label": "৳40,001 – ৳60,000",    "min": 40001,  "max": 60000,  "count": 98 },
    { "label": "Above ৳60,000",         "min": 60001,  "count": 54 }
  ]
}
```

> Use this to build price filter UI (dropdown or range slider).

---

### 11. GET /api/stats

Get full statistics about the entire dataset.

```
GET /api/stats
```

No query parameters.

#### Example Request

```bash
GET /api/stats
```

#### Example Response

```json
{
  "success": true,
  "data": {
    "totalPhones": 550,
    "totalBrands": 6,
    "brands": ["Samsung", "Redmi", "Vivo", "POCO", "Oppo", "Realme"],
    "inStock": 498,
    "outOfStock": 52,
    "tiers": [
      { "tier": "budget",   "count": 210 },
      { "tier": "mid",      "count": 245 },
      { "tier": "flagship", "count": 95 }
    ],
    "networks": {
      "5G": 312,
      "4G LTE": 238
    },
    "pricing": {
      "min": 7999,
      "max": 199999,
      "avg": 28450
    },
    "ratings": {
      "avg": "4.15",
      "topRated": 187
    }
  }
}
```

> `topRated` = count of phones with rating ≥ 4.5

---

## Data Schema

Full structure of each phone object:

```json
{
  "id":          number,    // Unique phone ID (e.g. 159427)
  "brand":       string,    // "Samsung" | "Redmi" | "Vivo" | "POCO" | "Oppo" | "Realme"
  "model":       string,    // "Galaxy A05"
  "full_name":   string,    // "Samsung Galaxy A05"
  "slug":        string,    // "samsung-galaxy-a05" (URL-safe unique identifier)
  "price_bdt":   number,    // Price in Bangladeshi Taka
  "tier":        string,    // "budget" | "mid" | "flagship"

  "display": {
    "size":         string, // "6.5\" IPS LCD"
    "resolution":   string, // "1612 x 720 pixels"
    "type":         string, // "IPS LCD" | "AMOLED" | "Super AMOLED" | etc.
    "refresh_rate": string, // "90Hz" | "120Hz" | "144Hz"
    "protection":   string  // "Corning Gorilla Glass 3" | "Victus" | etc.
  },

  "processor": {
    "chipset": string,      // "Helio G96" | "Snapdragon 8 Gen 3" | etc.
    "cpu":     string,      // "Octa-core"
    "gpu":     string       // "Mali-G610" | "Adreno 750" | etc.
  },

  "memory": {
    "ram":        string,   // "4GB" | "6GB" | "8GB" | "12GB" | "16GB"
    "rom":        string,   // "64GB" | "128GB" | "256GB" | "512GB"
    "expandable": string    // "microSDXC (up to 1TB)" | "No"
  },

  "camera": {
    "rear":     string,     // "48MP (Wide) + 2MP (Depth)"
    "front":    string,     // "5MP" | "16MP" | "32MP"
    "video":    string,     // "1080p@30fps" | "4K@30fps"
    "features": string      // "Night Mode, Portrait Mode, ..."
  },

  "battery": {
    "capacity":         string,  // "4000mAh" | "5000mAh"
    "charging":         string,  // "15W" | "67W" | "120W"
    "wireless":         string,  // "Yes" | "No"
    "reverse_wireless": string   // "Yes" | "No"
  },

  "connectivity": {
    "network":   string,   // "5G" | "4G LTE"
    "wifi":      string,   // "Wi-Fi 5" | "Wi-Fi 6" | "Wi-Fi 6E"
    "bluetooth": string,   // "5.1" | "5.3"
    "nfc":       string,   // "Yes" | "No"
    "usb":       string,   // "USB Type-C" | "Micro USB"
    "jack":      string    // "3.5mm" | "No"
  },

  "design": {
    "dimensions": string,       // "163.4 x 75.9 x 8.8mm"
    "weight":     string,       // "201g"
    "colors":     string[],     // ["Ice Blue", "Graphite Black"]
    "build":      string        // "Glass front, Plastic back"
  },

  "software": {
    "os": string,         // "Android 13" | "Android 14"
    "ui": string          // "One UI 6.1" | "MIUI 14" | "Funtouch OS 14"
  },

  "rating":       number,  // 0.0 – 5.0
  "reviews":      number,  // Total review count
  "in_stock":     boolean, // true | false
  "image_url":    string,  // Full URL to GSMArena phone image
  "release_year": number,  // 2022 | 2023 | 2024
  "gsmarena_slug":string   // GSMArena slug for reference
}
```

---

## Filter & Sort Reference

### All Filter Params (for /api/phones)

| Filter | Values | Example |
|--------|--------|---------|
| `brand` | Samsung, Redmi, Vivo, POCO, Oppo, Realme | `brand=Samsung,Redmi` |
| `tier` | budget, mid, flagship | `tier=flagship` |
| `network` | 5G, 4G LTE | `network=5G` |
| `min_price` | any number (BDT) | `min_price=15000` |
| `max_price` | any number (BDT) | `max_price=40000` |
| `min_ram` | 4, 6, 8, 12, 16 | `min_ram=8` |
| `in_stock` | true, false | `in_stock=true` |
| `nfc` | true | `nfc=true` |
| `jack` | true | `jack=true` |
| `release_year` | 2022, 2023, 2024 | `release_year=2024` |

### All Sort Options

| Value | Description |
|-------|-------------|
| `price_asc` | Cheapest first |
| `price_desc` | Most expensive first |
| `rating` | Highest rated first |
| `reviews` | Most reviewed first |
| `newest` | Latest release year first |
| `oldest` | Oldest release year first |

---

## Common Use Cases

### Homepage — Featured + Latest phones
```bash
GET /api/featured?limit=8
GET /api/latest?limit=8
```

### Brand listing page
```bash
GET /api/brands
```

### Brand phones page (e.g. Samsung page)
```bash
GET /api/brands/Samsung?sort_by=newest&limit=20
```

### Search as user types
```bash
GET /api/search?q=redmi+note&limit=5
```

### Phone detail page
```bash
GET /api/phones/redmi-note-13-pro
# related phones are included in the response
```

### Filter sidebar (price range options)
```bash
GET /api/price-range
```

### Compare page
```bash
GET /api/compare?ids=samsung-galaxy-a55,redmi-note-13-pro,vivo-v30
```

### Budget picks section
```bash
GET /api/budget?max_price=15000&limit=8
```

### Admin/dashboard stats
```bash
GET /api/stats
```

### Advanced filter (e.g. user selects: 5G + NFC + ৳20k–৳40k + 8GB+ RAM)
```bash
GET /api/phones?network=5G&nfc=true&min_price=20000&max_price=40000&min_ram=8&sort_by=rating
```

---

## Dataset Overview

| Property | Value |
|----------|-------|
| Total Phones | 550 |
| Brands | Samsung, Redmi, Vivo, POCO, Oppo, Realme |
| Tiers | budget · mid · flagship |
| Price Range | ৳7,999 – ৳1,99,999 |
| Network Types | 5G, 4G LTE |
| Release Years | 2022, 2023, 2024 |
| Data Source | GSMArena (BD market) |
