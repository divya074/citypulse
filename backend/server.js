
const axios = require("axios");
const {
  aggregateContext,
  fetchLocalEvents,
  fetchNearbyPOIs,
} = require("./contextAggregator");
const { generateOffer } = require("./offerGenerator");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Load stub data
const merchants = require("./data/merchants.json");
const payoneFeed = require("./data/payone_feed.json");
const events = require("./data/events.json");
const merchantRules = require("./data/merchant_rules.json");

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
    const lat = Number.isFinite(userLat) ? userLat : 48.7758;
    const lon = Number.isFinite(userLon) ? userLon : 9.1829;

    console.log("Calling Weather API");
    const response = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          lat,
          lon,
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
    const fallbackWeather = {
      temp: 11,
      feels_like: 8,
      description: "light rain",
      main: "Rain",
      city: "Stuttgart",
      source: "fallback",
    };
    console.log("Weather API fetch failed; using fallback weather");
    res.json(fallbackWeather);
  }
});

// ---- Route 6: Get full context for a user location ----
app.get("/events", async (req, res) => {
  try {
    let activeEvents = await fetchLocalEvents();
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
    const lat = parseFloat(req.query.lat) || 48.7758;
    const lon = parseFloat(req.query.lon) || 9.1829;
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
    // Use Stuttgart centre coords for now — mobile will send real GPS later
    const userLat = parseFloat(req.query.lat) || 48.7758;
    const userLon = parseFloat(req.query.lon) || 9.1829;

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
    const { merchantId, userLat, userLon } = req.body;

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
            lat: userLat || 48.7758,
            lon: userLon || 9.1829,
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
      userLat || 48.7758,
      userLon || 9.1829,
      weatherData
    );

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

// Start server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`CityPulse backend running on http://localhost:${PORT}`);
});