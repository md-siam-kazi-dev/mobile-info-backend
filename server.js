/**
 * MobileDokan-style Backend API
 * Built for phones_data_v3.json (550 phones, BD market)
 *
 * Endpoints:
 *   GET /api/phones              - List all phones (filter, sort, paginate)
 *   GET /api/phones/:slug        - Single phone detail
 *   GET /api/brands              - All brands with phone count
 *   GET /api/brands/:brand       - Phones by brand
 *   GET /api/search?q=           - Search phones
 *   GET /api/compare?ids=        - Compare up to 4 phones
 *   GET /api/featured            - Featured/top-rated phones
 *   GET /api/latest              - Latest phones by release year
 *   GET /api/budget              - Phones under 15,000 BDT
 *   GET /api/price-range         - Min/max price metadata
 *   GET /api/stats               - Dataset statistics
 */

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── Load Data ───────────────────────────────────────────────────────────────
const DATA_PATH = path.join(__dirname, "phones_data_v3.json");
let DB = { phones: [], total: 0 };

try {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  DB = JSON.parse(raw);
  console.log(`✅ Loaded ${DB.total} phones from JSON`);
} catch (err) {
  console.error("❌ Failed to load phones_data_v3.json:", err.message);
  process.exit(1);
}

const PHONES = DB.phones;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse pagination params from query string.
 * Default: page=1, limit=20, max limit=100
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build pagination metadata for response.
 */
function paginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Apply filters to phones array.
 * Supported filters: brand, tier, network, min_price, max_price,
 *                    min_ram, in_stock, nfc, jack
 */
function applyFilters(phones, query) {
  let result = [...phones];

  if (query.brand) {
    const brands = query.brand.split(",").map((b) => b.trim().toLowerCase());
    result = result.filter((p) =>
      brands.includes(p.brand.toLowerCase())
    );
  }

  if (query.tier) {
    const tiers = query.tier.split(",").map((t) => t.trim().toLowerCase());
    result = result.filter((p) => tiers.includes(p.tier?.toLowerCase()));
  }

  if (query.network) {
    const net = query.network.toUpperCase();
    result = result.filter((p) =>
      p.connectivity?.network?.toUpperCase().includes(net)
    );
  }

  if (query.min_price) {
    const min = parseInt(query.min_price);
    if (!isNaN(min)) result = result.filter((p) => p.price_bdt >= min);
  }

  if (query.max_price) {
    const max = parseInt(query.max_price);
    if (!isNaN(max)) result = result.filter((p) => p.price_bdt <= max);
  }

  if (query.min_ram) {
    const minRam = parseInt(query.min_ram);
    if (!isNaN(minRam)) {
      result = result.filter((p) => {
        const ram = parseInt(p.memory?.ram);
        return !isNaN(ram) && ram >= minRam;
      });
    }
  }

  if (query.in_stock === "true") {
    result = result.filter((p) => p.in_stock === true);
  } else if (query.in_stock === "false") {
    result = result.filter((p) => p.in_stock === false);
  }

  if (query.nfc === "true") {
    result = result.filter(
      (p) => p.connectivity?.nfc?.toLowerCase() === "yes"
    );
  }

  if (query.jack === "true") {
    result = result.filter(
      (p) => p.connectivity?.jack && p.connectivity.jack !== "No"
    );
  }

  if (query.release_year) {
    const year = parseInt(query.release_year);
    if (!isNaN(year))
      result = result.filter((p) => p.release_year === year);
  }

  return result;
}

/**
 * Sort phones array.
 * sort_by: price_asc | price_desc | rating | reviews | newest | oldest
 */
function applySort(phones, sortBy) {
  const arr = [...phones];
  switch (sortBy) {
    case "price_asc":
      return arr.sort((a, b) => a.price_bdt - b.price_bdt);
    case "price_desc":
      return arr.sort((a, b) => b.price_bdt - a.price_bdt);
    case "rating":
      return arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    case "reviews":
      return arr.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
    case "newest":
      return arr.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
    case "oldest":
      return arr.sort((a, b) => (a.release_year || 0) - (b.release_year || 0));
    default:
      return arr; // original order
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// Health check
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    message: "MobileDokan API is running 🚀",
    version: "1.0.0",
    endpoints: {
      phones: "GET /api/phones",
      phone_detail: "GET /api/phones/:slug",
      brands: "GET /api/brands",
      brand_phones: "GET /api/brands/:brand",
      search: "GET /api/search?q=",
      compare: "GET /api/compare?ids=1,2,3",
      featured: "GET /api/featured",
      latest: "GET /api/latest",
      budget: "GET /api/budget",
      price_range: "GET /api/price-range",
      stats: "GET /api/stats",
    },
  });
});

// ── 1. GET /api/phones ────────────────────────────────────────────────────────
// Query params: brand, tier, network, min_price, max_price, min_ram,
//               in_stock, nfc, jack, release_year,
//               sort_by, page, limit
app.get("/api/phones", (req, res) => {
  try {
    let phones = applyFilters(PHONES, req.query);
    phones = applySort(phones, req.query.sort_by);

    const { page, limit, skip } = parsePagination(req.query);
    const total = phones.length;
    const paginated = phones.slice(skip, skip + limit);

    res.json({
      success: true,
      pagination: paginationMeta(total, page, limit),
      data: paginated,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── 2. GET /api/phones/:slug ──────────────────────────────────────────────────
app.get("/api/phones/:slug", (req, res) => {
  const phone = PHONES.find(
    (p) => p.slug === req.params.slug || String(p.id) === req.params.slug
  );

  if (!phone) {
    return res
      .status(404)
      .json({ success: false, error: "Phone not found" });
  }

  // Also return "related" phones: same brand, same tier, exclude self
  const related = PHONES.filter(
    (p) =>
      p.brand === phone.brand &&
      p.tier === phone.tier &&
      p.id !== phone.id
  )
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 6);

  res.json({ success: true, data: phone, related });
});

// ── 3. GET /api/brands ────────────────────────────────────────────────────────
app.get("/api/brands", (_req, res) => {
  const brandMap = {};
  PHONES.forEach((p) => {
    if (!brandMap[p.brand]) {
      brandMap[p.brand] = { brand: p.brand, count: 0, avgPrice: 0, totalPrice: 0 };
    }
    brandMap[p.brand].count++;
    brandMap[p.brand].totalPrice += p.price_bdt || 0;
  });

  const brands = Object.values(brandMap).map((b) => ({
    brand: b.brand,
    count: b.count,
    avgPrice: Math.round(b.totalPrice / b.count),
  })).sort((a, b) => b.count - a.count);

  res.json({ success: true, total: brands.length, data: brands });
});

// ── 4. GET /api/brands/:brand ─────────────────────────────────────────────────
app.get("/api/brands/:brand", (req, res) => {
  const brand = req.params.brand.toLowerCase();
  let phones = PHONES.filter((p) => p.brand.toLowerCase() === brand);

  if (!phones.length) {
    return res
      .status(404)
      .json({ success: false, error: `No phones found for brand: ${req.params.brand}` });
  }

  phones = applySort(phones, req.query.sort_by || "newest");
  const { page, limit, skip } = parsePagination(req.query);

  res.json({
    success: true,
    brand: req.params.brand,
    pagination: paginationMeta(phones.length, page, limit),
    data: phones.slice(skip, skip + limit),
  });
});

// ── 5. GET /api/search?q= ─────────────────────────────────────────────────────
app.get("/api/search", (req, res) => {
  const q = (req.query.q || "").trim().toLowerCase();
  if (!q) {
    return res
      .status(400)
      .json({ success: false, error: "Query parameter 'q' is required" });
  }

  const results = PHONES.filter(
    (p) =>
      p.full_name?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.model?.toLowerCase().includes(q) ||
      p.processor?.chipset?.toLowerCase().includes(q)
  );

  const sorted = applySort(results, req.query.sort_by || "rating");
  const { page, limit, skip } = parsePagination(req.query);

  res.json({
    success: true,
    query: q,
    pagination: paginationMeta(sorted.length, page, limit),
    data: sorted.slice(skip, skip + limit),
  });
});

// ── 6. GET /api/compare?ids=1,2,3,4 ──────────────────────────────────────────
app.get("/api/compare", (req, res) => {
  const rawIds = (req.query.ids || "").split(",").map((s) => s.trim());

  if (rawIds.length < 2) {
    return res
      .status(400)
      .json({ success: false, error: "Provide at least 2 phone ids to compare" });
  }

  if (rawIds.length > 4) {
    return res
      .status(400)
      .json({ success: false, error: "Maximum 4 phones can be compared at once" });
  }

  const phones = rawIds.map((id) => {
    const phone = PHONES.find(
      (p) => String(p.id) === id || p.slug === id
    );
    return phone || null;
  });

  const notFound = rawIds.filter((_, i) => !phones[i]);
  if (notFound.length) {
    return res.status(404).json({
      success: false,
      error: `Phones not found: ${notFound.join(", ")}`,
    });
  }

  // Build a flat comparison table
  const compareFields = phones.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    slug: p.slug,
    price_bdt: p.price_bdt,
    image_url: p.image_url,
    tier: p.tier,
    rating: p.rating,
    display_size: p.display?.size,
    display_type: p.display?.type,
    display_refresh: p.display?.refresh_rate,
    chipset: p.processor?.chipset,
    cpu: p.processor?.cpu,
    gpu: p.processor?.gpu,
    ram: p.memory?.ram,
    storage: p.memory?.rom,
    expandable: p.memory?.expandable,
    rear_camera: p.camera?.rear,
    front_camera: p.camera?.front,
    battery: p.battery?.capacity,
    charging: p.battery?.charging,
    network: p.connectivity?.network,
    nfc: p.connectivity?.nfc,
    usb: p.connectivity?.usb,
    jack: p.connectivity?.jack,
    os: p.software?.os,
    ui: p.software?.ui,
    weight: p.design?.weight,
    build: p.design?.build,
    in_stock: p.in_stock,
    release_year: p.release_year,
  }));

  res.json({ success: true, count: phones.length, data: compareFields });
});

// ── 7. GET /api/featured ──────────────────────────────────────────────────────
// Top-rated in-stock phones, one from each tier
app.get("/api/featured", (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit) || 12);

  const featured = PHONES
    .filter((p) => p.in_stock && p.rating >= 4.0)
    .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
    .slice(0, limit);

  res.json({ success: true, count: featured.length, data: featured });
});

// ── 8. GET /api/latest ────────────────────────────────────────────────────────
app.get("/api/latest", (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit) || 12);

  const latest = [...PHONES]
    .sort((a, b) => (b.release_year || 0) - (a.release_year || 0))
    .slice(0, limit);

  res.json({ success: true, count: latest.length, data: latest });
});

// ── 9. GET /api/budget ────────────────────────────────────────────────────────
// Phones ≤ 15,000 BDT, sorted by rating
app.get("/api/budget", (req, res) => {
  const maxPrice = parseInt(req.query.max_price) || 15000;
  const limit = Math.min(50, parseInt(req.query.limit) || 20);

  const budget = PHONES
    .filter((p) => p.price_bdt <= maxPrice && p.in_stock)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, limit);

  res.json({
    success: true,
    max_price: maxPrice,
    count: budget.length,
    data: budget,
  });
});

// ── 10. GET /api/price-range ──────────────────────────────────────────────────
app.get("/api/price-range", (_req, res) => {
  const prices = PHONES.map((p) => p.price_bdt).filter((p) => p > 0);
  const ranges = [
    { label: "Under ৳10,000", min: 0, max: 9999 },
    { label: "৳10,000 – ৳15,000", min: 10000, max: 15000 },
    { label: "৳15,001 – ৳25,000", min: 15001, max: 25000 },
    { label: "৳25,001 – ৳40,000", min: 25001, max: 40000 },
    { label: "৳40,001 – ৳60,000", min: 40001, max: 60000 },
    { label: "Above ৳60,000", min: 60001, max: Infinity },
  ].map((r) => ({
    ...r,
    count: PHONES.filter(
      (p) => p.price_bdt >= r.min && p.price_bdt <= r.max
    ).length,
    max: r.max === Infinity ? undefined : r.max,
  }));

  res.json({
    success: true,
    min: Math.min(...prices),
    max: Math.max(...prices),
    ranges,
  });
});

// ── 11. GET /api/stats ────────────────────────────────────────────────────────
app.get("/api/stats", (_req, res) => {
  const prices = PHONES.map((p) => p.price_bdt).filter(Boolean);
  const brands = [...new Set(PHONES.map((p) => p.brand))];
  const tiers = ["budget", "mid", "flagship"].map((t) => ({
    tier: t,
    count: PHONES.filter((p) => p.tier === t).length,
  }));
  const networks = {
    "5G": PHONES.filter((p) => p.connectivity?.network === "5G").length,
    "4G LTE": PHONES.filter((p) => p.connectivity?.network === "4G LTE").length,
  };

  const avgPrice = Math.round(
    prices.reduce((a, b) => a + b, 0) / prices.length
  );

  res.json({
    success: true,
    data: {
      totalPhones: PHONES.length,
      totalBrands: brands.length,
      brands,
      inStock: PHONES.filter((p) => p.in_stock).length,
      outOfStock: PHONES.filter((p) => !p.in_stock).length,
      tiers,
      networks,
      pricing: {
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: avgPrice,
      },
      ratings: {
        avg: (
          PHONES.reduce((a, p) => a + (p.rating || 0), 0) / PHONES.length
        ).toFixed(2),
        topRated: PHONES.filter((p) => p.rating >= 4.5).length,
      },
    },
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 MobileDokan API running at http://localhost:${PORT}`);
  console.log(`📱 ${DB.total} phones loaded`);
  console.log(`\nTry: http://localhost:${PORT}/api/phones?brand=Samsung&sort_by=price_asc`);
});

module.exports = app;