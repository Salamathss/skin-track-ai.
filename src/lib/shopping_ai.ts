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

  const systemPrompt = `You are an expert Skincare Shopping Consultant.
Generate a JSON array of 3-5 recommended skincare products.
- Age: ${age}
- Skin Type: ${skinType}
- ${isRu ? "Response must be in Russian." : "Response must be in English."}
RETURN ONLY A RAW JSON ARRAY. No markdown.
Example: [{"name": "SPF 50", "reason": "High UV", "category": "SPF", "badge_text": "UV Protection"}]`;

  const payload = {
    contents: [{ parts: [{ text: systemPrompt }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
  };

  for (const model of MODELS_TO_TRY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
      
      console.log(`%c FINAL ATTEMPT with model: ${model} and key: ${apiKey.substring(0, 5)}...`, "color: #00ff00; font-weight: bold; font-size: 14px;");

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) continue;

      const data = await response.json();
      let content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) continue;

      content = content.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
      return JSON.parse(content);
    } catch (e) {
      console.warn(`Attempt with ${model} failed, trying next...`);
    }
  }

  console.error("CRITICAL: All Gemini models failed or returned 404. Falling back to dummy data.");
  return getDummyRecommendations(language);
}

function getDummyRecommendations(lang: string): ShoppingItem[] {
  const isRu = lang === "ru";
  return [
    {
      name: isRu ? "Мягкое очищающее средство (CeraVe)" : "Gentle Hydrating Cleanser (CeraVe)",
      category: "Cleanser",
      reason: isRu ? "Базовое очищение, которое подходит для вашего типа кожи и не нарушает барьер." : "Essential daily cleansing that preserves your skin barrier and matches your profile.",
      badge_text: isRu ? "БАЗОВЫЙ УХОД" : "DAILY ESSENTIAL"
    },
    {
      name: isRu ? "Увлажняющий крем с гиалуроновой кислотой" : "Hyaluronic Acid Moisturizer",
      category: "Moisturizer",
      reason: isRu ? "Глубокое увлажнение необходимо для поддержания здоровья кожи в текущих условиях." : "Deep hydration is critical for maintaining skin health in Almaty conditions.",
      badge_text: isRu ? "УВЛАЖНЕНИЕ" : "HYDRATION"
    },
    {
      name: isRu ? "Солнцезащитный крем SPF 50+" : "Sunscreen SPF 50+ (La Roche-Posay)",
      category: "SPF",
      reason: isRu ? "Защита от ультрафиолета - самый важный шаг для предотвращения старения и повреждений." : "UV protection is the most vital step to prevent premature aging and sun damage.",
      badge_text: isRu ? "ЗАЩИТА ОТ УФ" : "UV PROTECTION"
    }
  ];
}
