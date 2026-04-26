const axios = require("axios");
const merchants = require("./data/merchants.json");
const payoneFeed = require("./data/payone_feed.json");
const events = require("./data/events.json");

// Calculates distance between two GPS points in metres
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// Converts raw context into abstract intent — this runs "on device"
// Raw GPS never leaves this function — only the intent string goes to LLM
function mapToIntent(
  weather,
  nearestPoi,
  distance,
  demandLevel,
  activeEvents = []
) {
  let intent = "general_offer";

  if (weather.main === "Rain" || weather.temp < 12) {
    intent = "warm_drink";
  } else if (weather.temp > 25) {
    intent = "cold_drink";
  } else if (isLunchTime()) {
    intent = "lunch_deal";
  } else if (nearestPoi.category === "bakery") {
    intent = "fresh_food";
  }

  return {
    intent,
    urgency: demandLevel === "quiet" ? "high" : "low",
    context: `${nearestPoi.name} ${distance}m away`,
    event: activeEvents[0]?.name || null,
    // No raw GPS here — GDPR compliant
  };
}

async function fetchLocalEvents() {
  if (!process.env.TICKETMASTER_API_KEY) {
    console.log("Events API key missing; using fallback events");
    return [];
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const startDateTime = `${today}T00:00:00Z`;

    console.log("Calling Events API");
    const response = await axios.get(
      "https://app.ticketmaster.com/discovery/v2/events.json",
      {
        params: {
          apikey: process.env.TICKETMASTER_API_KEY,
          city: "Stuttgart",
          countryCode: "DE",
          radius: 10,
          unit: "km",
          size: 3,
          startDateTime,
          sort: "date,asc",
        },
        timeout: 8000,
      }
    );

    const apiEvents = response.data?._embedded?.events || [];
    const parsedEvents = apiEvents.slice(0, 3).map((event) => ({
      name: event.name || "Unknown event",
      category:
        event.classifications?.[0]?.segment?.name ||
        event.classifications?.[0]?.genre?.name ||
        "General",
      starts:
        event.dates?.start?.localTime ||
        event.dates?.start?.dateTime ||
        event.dates?.start?.localDate ||
        "TBD",
    }));

    console.log("Data fetched from Events API");
    return parsedEvents;
  } catch {
    console.log("Events API fetch failed; using fallback events");
    return [];
  }
}

async function fetchNearbyPOIs(userLat, userLon) {
  try {
    console.log("Calling Maps API");
    const query = `
[out:json][timeout:15];
(
  node(around:300,${userLat},${userLon})[amenity=cafe];
  node(around:300,${userLat},${userLon})[amenity=restaurant];
  node(around:300,${userLat},${userLon})[amenity=fast_food];
  node(around:300,${userLat},${userLon})[shop=bakery];
);
out body 10;
`;

    const response = await axios.get(
      "https://overpass-api.de/api/interpreter",
      {
        params: { data: query },
        headers: {
          Accept: "application/json",
          "User-Agent": "CityPulse/1.0",
        },
        timeout: 12000,
      }
    );

    const elements = response.data?.elements || [];
    const pois = elements
      .filter((el) => el?.tags?.name && typeof el.lat === "number" && typeof el.lon === "number")
      .map((el) => {
        const category =
          el.tags?.amenity || el.tags?.shop || "unknown";
        const distanceMetres = haversine(userLat, userLon, el.lat, el.lon);
        return {
          name: el.tags.name,
          category,
          lat: el.lat,
          lon: el.lon,
          distance_metres: distanceMetres,
        };
      })
      .sort((a, b) => a.distance_metres - b.distance_metres)
      .slice(0, 5);

    console.log("Data fetched from Maps API");
    return pois;
  } catch {
    console.log("Maps API fetch failed; using fallback POIs");
    return [];
  }
}

function isLunchTime() {
  const hour = new Date().getHours();
  return hour >= 11 && hour <= 14;
}

function getTimeSlot() {
  const hour = new Date().getHours();
  if (hour < 10) return "morning";
  if (hour < 14) return "lunch";
  if (hour < 18) return "afternoon";
  return "evening";
}

// Main function — takes user GPS, returns full context object
async function aggregateContext(userLat, userLon, weatherData) {
  // Find nearest merchant and their distance (fallback + Payone mapping)
  const merchantsWithDistance = merchants.map((m) => ({
    ...m,
    distance: haversine(userLat, userLon, m.lat, m.lon),
  }));

  const nearest = merchantsWithDistance.sort(
    (a, b) => a.distance - b.distance
  )[0];

  // Live POIs from Overpass with fallback to nearest merchant
  const nearbyPois = await fetchNearbyPOIs(userLat, userLon);
  const nearestPoi =
    nearbyPois[0] ||
    {
      name: nearest.name,
      category: nearest.category,
      lat: nearest.lat,
      lon: nearest.lon,
      distance_metres: nearest.distance,
    };

  // Get Payone demand level for nearest merchant
  const payone = payoneFeed.find((p) => p.merchant_id === nearest.id);
  const demandLevel = payone ? payone.status : "unknown";

  // Live events from Ticketmaster with safe fallback
  let activeEvents = await fetchLocalEvents();
  if (activeEvents.length === 0) {
    const fallbackEvent = events.find((e) => e.today === true);
    activeEvents = fallbackEvent
      ? [{ name: fallbackEvent.name, category: "Local", starts: "TBD" }]
      : [];
  }

  // Use fallback weather if API not ready yet
  const weather = weatherData || {
    temp: 11,
    feels_like: 8,
    description: "light rain",
    main: "Rain",
    city: "Stuttgart",
  };

  // Map to intent — raw GPS stays here, only intent goes upstream
  const intentSignal = mapToIntent(
    weather,
    nearestPoi,
    nearestPoi.distance_metres,
    demandLevel,
    activeEvents
  );

  return {
    // What gets sent to LLM
    intentSignal,

    // Full context for display/debugging
    weather,
    timeSlot: getTimeSlot(),
    nearestMerchant: nearest,
    distanceMetres: nearest.distance,
    demandLevel,
    nearest_poi: {
      name: nearestPoi.name,
      category: nearestPoi.category,
      distance_metres: nearestPoi.distance_metres,
    },
    nearby_pois: nearbyPois,
    active_events: activeEvents,

    // snake_case aliases for judge/demo responses
    demand_level: demandLevel,
    time_slot: getTimeSlot(),
  };
}

module.exports = { aggregateContext, fetchLocalEvents, fetchNearbyPOIs };