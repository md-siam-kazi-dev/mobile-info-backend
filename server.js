const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ─────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ─── Load Data ──────────────────────────────────────────
const DATA_PATH = path.join(__dirname, "phones_data_v3.json");
let DB = { phones: [], total: 0 };

try {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  DB = JSON.parse(raw);
  console.log(`✅ Loaded ${DB.total} phones`);
} catch (err) {
  console.error("❌ Failed to load JSON:", err.message);
  process.exit(1);
}

const PHONES = DB.phones;

// ─── Helpers ────────────────────────────────────────────

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

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

function applyFilters(phones, query) {
  let result = [...phones];

  if (query.brand) {
    const brands = query.brand.split(",").map((b) => b.toLowerCase());
    result = result.filter((p) =>
      brands.includes(p.brand.toLowerCase())
    );
  }

  if (query.min_price) {
    result = result.filter(
      (p) => p.price_bdt >= parseInt(query.min_price)
    );
  }

  if (query.max_price) {
    result = result.filter(
      (p) => p.price_bdt <= parseInt(query.max_price)
    );
  }

  return result;
}

function applySort(phones, sortBy) {
  const arr = [...phones];

  switch (sortBy) {
    case "price_asc":
      return arr.sort((a, b) => a.price_bdt - b.price_bdt);
    case "price_desc":
      return arr.sort((a, b) => b.price_bdt - a.price_bdt);
    case "rating":
      return arr.sort((a, b) => b.rating - a.rating);
    case "newest":
      return arr.sort((a, b) => b.release_year - a.release_year);
    default:
      return arr;
  }
}

// 🔀 Shuffle function (IMPORTANT)
function shuffleArray(array) {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

// ─── Routes ─────────────────────────────────────────────

// Home
app.get("/", (_req, res) => {
  res.json({ message: "API Running 🚀" });
});

// 🔥 UPDATED ROUTE
app.get("/api/phones", (req, res) => {
  try {
    let phones = applyFilters(PHONES, req.query);

    // 🎯 MAIN LOGIC
    if (req.query.sort_by) {
      phones = applySort(phones, req.query.sort_by);
    } else {
      phones = shuffleArray(phones); // 🔀 random every refresh
    }

    const { page, limit, skip } = parsePagination(req.query);

    res.json({
      success: true,
      pagination: paginationMeta(phones.length, page, limit),
      data: phones.slice(skip, skip + limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});