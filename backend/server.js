
const axios = require("axios");
const {
  aggregateContext,
  fetchLocalEvents,
  fetchNearbyPOIs,
} = require("./contextAggregator");
const { generateOffer } = require("./offerGenerator");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Load stub data
const merchants = require("./data/merchants.json");
const payoneFeed = require("./data/payone_feed.json");
const events = require("./data/events.json");
const merchantRules = require("./data/merchant_rules.json");
const redemptions = {};

// ---- Route 1: Health check ----
app.get("/", (req, res) => {
  res.json({ status: "CityPulse backend running!" });
});

// ---- Route 2: Get context for a merchant ----
app.get("/context/:merchantId", (req, res) => {
  const { merchantId } = req.params;

  const merchant = merchants.find((m) => m.id === merchantId);
  const payone = payoneFeed.find((p) => p.merchant_id === merchantId);
  const activeEvent = events.find((e) => e.today === true);

  if (!merchant || !payone) {
    return res.status(404).json({ error: "Merchant not found" });
  }

  res.json({
    merchant,
    demandLevel: payone.status,
    tx_last_hour: payone.tx_last_hour,
    baseline: payone.baseline,
    event: activeEvent || null,
  });
});

// ---- Route 3: Get all merchants ----
app.get("/merchants", (req, res) => {
  res.json(merchants);
});

// ---- Route 4: Get merchant rules ----
app.get("/rules/:merchantId", (req, res) => {
  const rules = merchantRules.find(
    (r) => r.merchant_id === req.params.merchantId
  );
  if (!rules) return res.status(404).json({ error: "Rules not found" });
  res.json(rules);
});

// ---- Route 5: Get weather ----
app.get("/weather", async (req, res) => {
  try {
    const userLat = parseFloat(req.query.lat);
    const userLon = parseFloat(req.query.lon);
    if (!Number.isFinite(userLat) || !Number.isFinite(userLon)) {
      return res.status(400).json({ error: "lat and lon query params are required" });
    }

    console.log("Calling Weather API");
    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          lat: userLat,
          lon: userLon,
          appid: process.env.OPENWEATHER_API_KEY,
          units: "metric",
        },
      }
    );

    const weather = response.data;
    const weatherPayload = {
      temp: Math.round(weather.main.temp),
      feels_like: Math.round(weather.main.feels_like),
      description: weather.weather[0].description,
      main: weather.weather[0].main,
      city: weather.name,
      source: "openweathermap",
    };
    console.log("Data fetched from Weather API");

    res.json(weatherPayload);
  } catch (error) {
    console.log("Weather API fetch failed");
    res.status(500).json({ error: "Could not fetch weather" });
  }
});

// ---- Route 6: Get full context for a user location ----
app.get("/events", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "lat and lon query params are required" });
    }

    let activeEvents = await fetchLocalEvents(lat, lon);
    if (activeEvents.length === 0) {
      const fallbackEvent = events.find((e) => e.today === true);
      activeEvents = fallbackEvent
        ? [{ name: fallbackEvent.name, category: "Local", starts: "TBD" }]
        : [];
    }
    res.json({ active_events: activeEvents });
  } catch (error) {
    console.error("Events route error:", error.message);
    res.status(500).json({ active_events: [] });
  }
});

// ---- Route 7: Get full context for a user location ----
app.get("/nearby-pois", async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: "lat and lon query params are required" });
    }
    let pois = await fetchNearbyPOIs(lat, lon);
    if (pois.length === 0) {
      pois = merchants.slice(0, 3).map((m) => ({
        name: m.name,
        category: m.category,
        lat: m.lat,
        lon: m.lon,
      }));
    }
    res.json({ nearby_pois: pois });
  } catch (error) {
    console.error("Nearby POIs route error:", error.message);
    res.status(500).json({ nearby_pois: [] });
  }
});

// ---- Route 8: Get full context for a user location ----
app.get("/aggregate-context", async (req, res) => {
  try {
    const userLat = parseFloat(req.query.lat);
    const userLon = parseFloat(req.query.lon);
    if (!Number.isFinite(userLat) || !Number.isFinite(userLon)) {
      return res.status(400).json({ error: "lat and lon query params are required" });
    }

    // Use weather if available, fallback if not
    let weatherData = null;
    try {
      console.log("Calling Weather API");
      const weatherRes = await axios.get(
        "https://api.openweathermap.org/data/2.5/weather",
        {
          params: {
            lat: userLat,
            lon: userLon,
            appid: process.env.OPENWEATHER_API_KEY,
            units: "metric",
          },
        }
      );
      weatherData = {
        temp: Math.round(weatherRes.data.main.temp),
        feels_like: Math.round(weatherRes.data.main.feels_like),
        description: weatherRes.data.weather[0].description,
        main: weatherRes.data.weather[0].main,
        city: weatherRes.data.name,
      };
      console.log("Data fetched from Weather API");
    } catch (error) {
      console.log(
        "Weather API fetch failed in aggregate-context; using weather fallback"
      );
    }

    const context = await aggregateContext(userLat, userLon, weatherData);
    res.json(context);
  } catch (error) {
    console.error("Context error:", error.message);
    res.status(500).json({ error: "Could not aggregate context" });
  }
});

// ---- Route 9: Generate offer ----
app.post("/generate-offer", async (req, res) => {
  try {
    const { merchantId, userLat, userLon, overrides } = req.body;
    if (!Number.isFinite(userLat) || !Number.isFinite(userLon)) {
      return res.status(400).json({ error: "userLat and userLon are required" });
    }

    // Get merchant
    const merchant = merchants.find((m) => m.id === merchantId);
    if (!merchant) return res.status(404).json({ error: "Merchant not found" });

    // Get rules
    const rules = merchantRules.find((r) => r.merchant_id === merchantId);
    if (!rules) return res.status(404).json({ error: "Rules not found" });

    // Get context
    let weatherData = null;
    try {
      console.log("Calling Weather API");
      const weatherRes = await axios.get(
        "https://api.openweathermap.org/data/2.5/weather",
        {
          params: {
            lat: userLat,
            lon: userLon,
            appid: process.env.OPENWEATHER_API_KEY,
            units: "metric",
          },
        }
      );
      weatherData = {
        temp: Math.round(weatherRes.data.main.temp),
        feels_like: Math.round(weatherRes.data.main.feels_like),
        description: weatherRes.data.weather[0].description,
        main: weatherRes.data.weather[0].main,
      };
      console.log("Data fetched from Weather API");
    } catch (error) {
      console.log(
        "Weather API fetch failed in generate-offer; using weather fallback"
      );
    }

    const context = await aggregateContext(
      userLat,
      userLon,
      weatherData
    );

    if (overrides) {
      if (overrides.weather) {
        context.weather = {
          ...context.weather,
          main: overrides.weather,
          description: overrides.weather,
        };
      }
      if (overrides.demand_level) {
        context.demandLevel = overrides.demand_level;
        context.demand_level = overrides.demand_level;
      }
      if (overrides.merchant_name) {
        context.nearest_poi = {
          ...(context.nearest_poi || {}),
          name: overrides.merchant_name,
        };
      }
      if (context.intentSignal) {
        if (overrides.demand_level) {
          context.intentSignal.urgency =
            overrides.demand_level === "quiet" ? "high" : "low";
        }
        if (context.nearest_poi?.name && context.nearest_poi?.distance_metres) {
          context.intentSignal.context = `${context.nearest_poi.name} ${context.nearest_poi.distance_metres}m away`;
        }
      }
    }

    // Generate offer using LLM
    const offer = await generateOffer(
      context.intentSignal,
      merchant,
      rules,
      {
        active_events: context.active_events || [],
        nearest_poi: context.nearest_poi || null,
      }
    );

    // Return offer + context together
    res.json({
      offer,
      context: {
        weather: context.weather,
        timeSlot: context.timeSlot,
        demandLevel: context.demandLevel,
        distanceMetres: context.distanceMetres,
        intentSignal: context.intentSignal,
        active_events: context.active_events || [],
        nearest_poi: context.nearest_poi || null,
      },
    });
  } catch (error) {
    console.error("Offer generation error:", error);
    res.status(500).json({ error: "Could not generate offer" });
  }
});

// ---- Route 10: Create redeem token ----
app.post("/redeem", (req, res) => {
  try {
    const { merchantId, discount_pct } = req.body;
    if (!merchantId) {
      return res.status(400).json({ error: "merchantId is required" });
    }

    const token = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + 15 * 60 * 1000;

    redemptions[token] = {
      token,
      merchant_id: merchantId,
      discount_pct: Number(discount_pct) || 0,
      status: "pending",
      created_at: now,
      expires_at: expiresAt,
    };

    res.json({
      token,
      expires_at: expiresAt,
      status: "pending",
    });
  } catch (error) {
    console.error("Redeem route error:", error.message);
    res.status(500).json({ error: "Could not create redeem token" });
  }
});

// ---- Route 11: Validate token ----
app.post("/validate/:token", (req, res) => {
  try {
    const { token } = req.params;
    const record = redemptions[token];

    if (!record) {
      return res.status(404).json({ error: "Token not found" });
    }

    if (Date.now() > record.expires_at) {
      record.status = "expired";
      return res.status(410).json({ error: "Token expired", status: "expired" });
    }

    if (record.status === "redeemed") {
      const cashback = Number(
        ((12 * record.discount_pct) / 100).toFixed(2)
      );
      return res.json({ status: "redeemed", cashback });
    }

    record.status = "redeemed";
    record.redeemed_at = Date.now();
    const cashback = Number(((12 * record.discount_pct) / 100).toFixed(2));

    res.json({
      status: "redeemed",
      cashback,
      merchant_id: record.merchant_id,
    });
  } catch (error) {
    console.error("Validate route error:", error.message);
    res.status(500).json({ error: "Could not validate token" });
  }
});

// ---- Route 12: Merchant dashboard metrics ----
app.get("/dashboard/:merchantId", (req, res) => {
  try {
    const { merchantId } = req.params;
    const records = Object.values(redemptions).filter(
      (r) => r.merchant_id === merchantId
    );

    const offersSent = records.length;
    const offersRedeemed = records.filter((r) => r.status === "redeemed").length;
    const acceptRate = offersSent
      ? Number(((offersRedeemed / offersSent) * 100).toFixed(1))
      : 0;
    const avgDiscount = offersSent
      ? Number(
          (
            records.reduce((sum, r) => sum + (Number(r.discount_pct) || 0), 0) /
            offersSent
          ).toFixed(1)
        )
      : 0;

    res.json({
      merchant_id: merchantId,
      offers_sent: offersSent,
      offers_redeemed: offersRedeemed,
      accept_rate: acceptRate,
      avg_discount: avgDiscount,
      best_headline: "Rainy day? Warm up nearby",
    });
  } catch (error) {
    console.error("Dashboard route error:", error.message);
    res.status(500).json({ error: "Could not fetch dashboard metrics" });
  }
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`CityPulse backend running on http://localhost:${PORT}`);
});