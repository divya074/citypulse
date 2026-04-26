const axios = require("axios");
const Groq = require("groq-sdk");

function buildFallbackOffer(intentSignal, merchant, rules) {
  const isFood = (merchant?.category || "").toLowerCase().includes("cafe");
  return {
    headline: isFood ? "Warm break near you" : "Local deal just dropped",
    subtext: `${merchant.name} · ${intentSignal.context || "nearby now"}`,
    discount_pct: Math.min(Math.max(10, 5), rules.max_discount),
    expires_mins: 15,
    color_scheme: "warm",
    emoji: isFood ? "☕" : "✨",
    cta: "Claim offer",
  };
}

async function generateOffer(intentSignal, merchant, rules, extraContext = {}) {
  const activeEvents = extraContext.active_events || [];
  const nearestPoi = extraContext.nearest_poi || null;
  let localContextSummary = "Stuttgart city centre is active with local movement and foot traffic.";

  try {
    const tavilyQuery = [
      "What is happening in Stuttgart right now?",
      nearestPoi?.name ? `Nearby place: ${nearestPoi.name}` : "",
      activeEvents[0]?.name ? `Event: ${activeEvents[0].name}` : "",
      "Include local events, weather vibe, and popular areas.",
    ]
      .filter(Boolean)
      .join(" ");

    console.log("Calling Tavily API");
    const tavilyRes = await axios.post(
      "https://api.tavily.com/search",
      {
        api_key: process.env.TAVILY_API_KEY,
        query: tavilyQuery,
        search_depth: "basic",
        max_results: 3,
      },
      { timeout: 10000 }
    );

    const tavilyResults = tavilyRes.data?.results || [];
    if (tavilyResults.length > 0) {
      localContextSummary = tavilyResults
        .map((item) => item.content || item.title)
        .filter(Boolean)
        .slice(0, 3)
        .join(" ");
    }
  } catch (error) {
    console.log("Tavily fetch failed; using fallback local context summary");
  }

  const prompt = `You are a hyper-local city wallet offer engine for CityPulse.
Given a user's context and merchant rules, generate a personalized offer.
Respond ONLY with valid JSON, no explanation, no markdown.

Context: ${JSON.stringify(intentSignal)}
Active local events today: ${JSON.stringify(activeEvents)}
Nearest real-world POI: ${JSON.stringify(nearestPoi)}
Live Stuttgart web context from Tavily: ${localContextSummary}
Merchant name: ${merchant.name}
Merchant category: ${merchant.category}
Rules: max_discount: ${rules.max_discount}%, tone: ${rules.tone}, trigger: ${rules.trigger}

Return exactly this JSON structure:
{
  "headline": "short emotional 5 word hook max",
  "subtext": "merchant name + distance + one relevant fact",
  "discount_pct": a number between 5 and ${rules.max_discount},
  "expires_mins": a number between 10 and 20,
  "color_scheme": "warm or cool or neutral",
  "emoji": "one relevant emoji",
  "cta": "short call to action button text"
}`;

  let raw = "";
  try {
    if (!process.env.GROQ_API_KEY) {
      return buildFallbackOffer(intentSignal, merchant, rules);
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const modelCandidates = ["llama-3.1-8b-instant", "llama3-8b-8192"];
    let lastError = null;

    for (const modelName of modelCandidates) {
      try {
        console.log(`Calling Groq API with model: ${modelName}`);
        const response = await groq.chat.completions.create({
          model: modelName,
          temperature: 0.6,
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        });
        raw = response?.choices?.[0]?.message?.content || "";
        if (raw) break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!raw) {
      throw lastError || new Error("Groq returned empty response");
    }
  } catch (error) {
    console.log(
      `Groq offer generation failed; using fallback offer: ${error.message}`
    );
    return buildFallbackOffer(intentSignal, merchant, rules);
  }

  // Safely parse the JSON
  try {
    // Strip markdown code blocks if Claude adds them
    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("LLM returned invalid JSON:", raw);
    return buildFallbackOffer(intentSignal, merchant, rules);
  }
}

module.exports = { generateOffer };