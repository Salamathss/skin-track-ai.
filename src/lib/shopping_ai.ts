export interface ShoppingItem {
  name: string;
  reason: string;
  category: string;
  badge_text: string;
}

const MODELS_TO_TRY = ["gemini-pro", "gemini-1.0-pro"];

export async function generateShoppingList(params: {
  profile: any;
  facts: any[];
  scan: any | null;
  weather: any | null;
  shelf: any[];
  language: string;
}): Promise<ShoppingItem[]> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("CRITICAL: Gemini API Key is missing!");
    return getDummyRecommendations(params.language);
  }

  const { profile, facts, scan, weather, shelf, language } = params;
  const isRu = language === "ru";
  
  const findFact = (key: string) => facts.find(f => f.fact_key === key)?.fact_value;
  const age = findFact("age") || "Unknown";
  const skinType = scan?.skin_type || findFact("skin_type") || profile?.skin_type || "Unknown";
  const concerns = scan?.primary_concern || findFact("concerns") || "General maintenance";
  const city = weather?.city || profile?.city_name || "Unknown Location";

  const systemPrompt = `You are an expert Skincare Shopping Consultant. 
Your goal is to provide a highly personalized, diverse, and professional shopping list.

### USER PROFILE:
- Name: ${profile?.profile_name}
- Age: ${age}
- Skin Type: ${skinType}
- Primary Concerns: ${concerns}
- Location: ${city} (Current Temperature: ${weather?.temperature || "N/A"}°C, UV Index: ${weather?.uv_index || "N/A"}, AQI: ${weather?.aqi || "N/A"})
- Current Products in Use: ${shelf.map(p => p.product_name).join(", ") || "None"}

### RULES:
1. VARIETY: ABSOLUTELY AVOID recommending only CeraVe or basic drugstore creams. 
2. BRAND POOL: Choose from a diverse set of brands:
   - Luxury/Pharmacy: La Roche-Posay, Vichy, Paula's Choice, Skinceuticals, Clinique.
   - Effective Mass-Market: The Ordinary, Inkey List, Bioderma.
   - Trendy Korean/Asian: Anua, Beauty of Joseon, Cosrx, Round Lab, Isntree.
3. CATEGORY MIX: Your list of 3-4 products MUST contain:
   - One high-end or pharmacy-grade treatment.
   - One effective mass-market staple.
   - One trending Korean skincare product.
4. ENVIRONMENTAL ADVICE: 
   - If in a cold/dry city (like Astana), focus on barrier repair and thick creams.
   - If in a polluted city (like Almaty), focus on antioxidants and deep cleansing.
   - If UV index is high, emphasize advanced SPF.
5. NO REPETITION: Every time you are asked, try to suggest DIFFERENT brands or products than standard defaults.
6. JSON ONLY: Return ONLY a raw JSON array. No markdown, no explanations outside the JSON.

### RESPONSE FORMAT (JSON):
[
  {
    "name": "Full Product Name including Brand",
    "reason": "Specific reason why this fits the user's type, concerns, and environment.",
    "category": "Cleanser/Serum/Moisturizer/SPF",
    "badge_text": "Short punchy label (e.g. 'K-BEAUTY TREND', 'BARRIER REPAIR', 'LUXE CARE')"
  }
]

${isRu ? "CRITICAL: Respond ENTIRELY in Russian." : "Respond in English."}`;

  const payload = {
    contents: [{ parts: [{ text: systemPrompt }] }],
    generationConfig: { 
      temperature: 0.85, 
      maxOutputTokens: 1024,
      topP: 0.95,
      topK: 40
    }
  };

  for (const model of MODELS_TO_TRY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
      
      console.log(`%c [SHOPPING AI] Attempting with model: ${model}`, "color: #3b82f6; font-weight: bold;");

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        console.warn(`Model ${model} failed:`, err);
        continue;
      }

      const data = await response.json();
      let content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) continue;

      content = content.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error(`Attempt with ${model} failed:`, e);
    }
  }

  console.error("CRITICAL: All Gemini models failed. Falling back to curated dummy data.");
  return getDummyRecommendations(language);
}

function getDummyRecommendations(lang: string): ShoppingItem[] {
  const isRu = lang === "ru";
  return [
    {
      name: "Beauty of Joseon - Relief Sun: Rice + Probiotics",
      category: "SPF",
      reason: isRu ? "Легкий корейский солнцезащитный крем, идеален для ежедневной защиты без жирности." : "Trending Korean sunscreen, perfect for lightweight daily protection.",
      badge_text: isRu ? "КОРЕЙСКИЙ ТРЕНД" : "K-BEAUTY TREND"
    },
    {
      name: "La Roche-Posay Cicaplast Baume B5+",
      category: "Moisturizer",
      reason: isRu ? "Аптечная классика для восстановления барьера, особенно в условиях ветра и холода." : "Pharmacy classic for barrier repair, essential in windy or cold conditions.",
      badge_text: isRu ? "АПТЕЧНЫЙ УХОД" : "PHARMACY CARE"
    },
    {
      name: "The Ordinary Niacinamide 10% + Zinc 1%",
      category: "Serum",
      reason: isRu ? "Эффективная сыворотка для регуляции себума и борьбы с несовершенствами по доступной цене." : "Highly effective mass-market serum for sebum control and blemish care.",
      badge_text: isRu ? "ДОКАЗАННАЯ ЭФФЕКТИВНОСТЬ" : "PROVEN RESULTS"
    }
  ];
}
