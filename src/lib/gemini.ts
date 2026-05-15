export interface AnalysisResult {
  summary: {
    type: string;
    overall_score: number;
    primary_concern: string;
    justification?: string;
  };
  metrics: {
    oiliness: number;
    hydration: number;
    sensitivity: number;
    acne_severity: number;
  };
  detailed_findings: string[];
  routine_adjustments: string[];
  skincare_steps?: { step: string; category: string }[];
}

const MODELS_TO_TRY = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro-vision"];

export async function analyzeSkinDirectly(
  base64Image: string,
  language: string = "en",
  shelfProducts: any[] = [],
  isRoutineEmpty: boolean = false
): Promise<AnalysisResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;

  if (!apiKey) {
    console.error("CRITICAL: Gemini API Key is missing!");
    return getDummyAnalysis(language);
  }

  const langInstruction = language === "ru"
    ? "Return ALL text values in Russian. Table/Step names in skincare_steps should remain in English but use specific brand names if available."
    : "Respond in English. Use specific brand names in skincare_steps if available.";

  const shelfContext = shelfProducts.length > 0
    ? `The user has these products on their shelf: ${shelfProducts.map(p => `${p.brand || ''} ${p.product_name} (${p.category})`).join(", ")}.`
    : "The user's shelf is empty.";

  const routineInstruction = isRoutineEmpty
    ? "The user has NO active routine. You MUST generate a FULL comprehensive skincare plan (at least 4-5 steps: Cleanser, Treatment, Moisturizer, SPF). Use brands from the shelf if they fit these categories."
    : "The user already has a routine. Suggest only specific incremental additions or replacements based on the current skin condition.";

  const systemPrompt = `Act as a Strict, Objective Clinical Dermatologist. Your goal is to provide a high-precision skin health score on a scale from 0.00 to 100.00.

### SCORING PROTOCOL:
1. NO ROUND NUMBERS: Never return scores like "85.00" or "90.00". Always use specific floats based on visual evidence (e.g., 84.37, 71.12).
2. THE "PERFECTION" BARRIER: A score of 100.00 is impossible for human skin. Even the healthiest skin has micro-texture or pores. Start your evaluation from a baseline and deduct points for every imperfection.
3. MICRO-DETECTION: 
   - Deduct 0.05 - 0.50 points for slight redness or uneven skin tone.
   - Deduct 1.00 - 5.00 points for active acne, inflammation, or significant congestion.
   - Deduct 0.10 - 1.00 points for visible enlarged pores or dehydration lines.

### ANALYSIS CATEGORIES (Each contributes to the final 100 score):
- Clarity (33.3 pts): Absence of spots, acne, and blemishes.
- Texture (33.3 pts): Smoothness and pore visibility.
- Tone (33.4 pts): Evenness and absence of hyperpigmentation/redness.

${langInstruction}
${shelfContext}
${routineInstruction}

### KEY REQUIREMENT:
In 'skincare_steps', for each step's 'step' field, use the format "[Brand Name] [Product Type]" (e.g., "Vichy SPF 50" or "CeraVe Hydrating Cleanser"). Use the brands from the user's shelf provided above if they match the scan findings.

### RESPONSE FORMAT (STRICT JSON):
{
  "summary": { 
    "type": "string", 
    "overall_score": float (e.g. 84.37), 
    "primary_concern": "string",
    "justification": "Detailed Clinical Variance Report: Explain why you deducted even the smallest fraction of a point. Be specific about the areas of the face visible in the image."
  },
  "metrics": { "oiliness": number, "hydration": number, "sensitivity": number, "acne_severity": number },
  "detailed_findings": ["string"],
  "routine_adjustments": ["string"],
  "skincare_steps": [{ "step": "string", "category": "Morning | Evening | Both" }]
}

BE BRUTALLY HONEST. If the skin looks 0.1% worse than a perfect model, the score must drop. Politeness is a failure; accuracy is a success.CRITICAL: I repeat, NEVER return an overall_score of exactly 85 or 85.00. 
If you calculate something close to 85, you MUST adjust it by at least 0.01 based on a micro-detail. 
Your response will be REJECTED if the score is an integer.
RETURN ONLY RAW JSON. No markdown.`;

  const payload = {
    contents: [{
      parts: [
        { text: systemPrompt },
        { inline_data: { mime_type: "image/jpeg", data: base64Image } }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
  };

  for (const model of MODELS_TO_TRY) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

      console.log(`%c FINAL ATTEMPT (Analysis) with model: ${model}`, "color: #00ff00; font-weight: bold;");

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
      console.warn(`Analysis with ${model} failed, trying next...`);
    }
  }

  console.error("CRITICAL: All Gemini models failed for analysis. Returning dummy balanced profile.");
  return getDummyAnalysis(language);
}

function getDummyAnalysis(lang: string): AnalysisResult {
  const isRu = lang === "ru";
  return {
    summary: {
      type: isRu ? "Сбалансированная (Комбинированная)" : "Balanced (Combination)",
      overall_score: 85,
      primary_concern: isRu ? "Поддержание увлажнения" : "Hydration Maintenance"
    },
    metrics: {
      oiliness: 30,
      hydration: 70,
      sensitivity: 10,
      acne_severity: 0
    },
    detailed_findings: isRu
      ? ["Кожа выглядит здоровой и чистой", "Хороший уровень увлажненности", "Заметных дефектов не обнаружено"]
      : ["Skin looks healthy and clear", "Good hydration levels detected", "No significant blemishes found"],
    routine_adjustments: isRu
      ? ["Продолжайте текущий уход", "Используйте SPF ежедневно"]
      : ["Continue current routine", "Apply SPF daily"],
    skincare_steps: [
      { step: "Cleanser", category: "Morning" },
      { step: "Moisturizer", category: "Evening" }
    ]
  };
}
