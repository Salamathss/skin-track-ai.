import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { photoUrl, language = "en", shelfProducts = [] } = await req.json();
    const langInstruction = language === "ru"
      ? "\n\nCRITICAL LANGUAGE REQUIREMENT: You MUST respond ENTIRELY in Russian. ALL text values in the JSON (summary.type, summary.primary_concern, detailed_findings, routine_adjustments, skincare_steps) MUST be written in Russian using professional dermatological and cosmetic terminology. Do NOT use English for any text field. Ingredient names (INCI) may remain in Latin/International format, but all descriptions and explanations must be in Russian."
      : "\n\nRespond in English using professional dermatological terminology.";

    const shelfContext = shelfProducts.length > 0
      ? `\n\n### USER'S COSMETIC SHELF:\nThe user currently owns these products:\n${shelfProducts.map((p: any) => `- ${p.product_name} (${p.brand || 'Unknown brand'}) — Category: ${p.category}, Active ingredients: ${(p.active_ingredients || []).join(', ') || 'unknown'}`).join('\n')}\n\nIMPORTANT: In your "routine_adjustments" and "skincare_steps", reference the user's OWN products by name when applicable. For example: "Apply your [Product Name] because it contains [Ingredient] which addresses [finding]." Also check for ingredient conflicts (e.g., don't recommend using Retinol and AHA/BHA at the same time) and add warnings.`
      : "";

    if (!photoUrl) {
      return new Response(JSON.stringify({ error: "photoUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Act as a Senior Clinical Dermatologist and Computer Vision Expert. Perform a granular, pixel-level analysis of the provided skin image.${langInstruction}${shelfContext}

### ANALYSIS GUIDELINES:

1. **No Generic Responses:** Do not provide the same result twice. If the image changes, the data MUST change.
2. **Detection Zones:** Analyze the T-zone (forehead, nose) and U-zone (cheeks, chin) separately to determine combination skin patterns.
3. **Specific Markers:** Look for:
   - Papules, pustules, and comedones (count them if possible).
   - Micro-flaking or rough texture indicating dehydration.
   - Erythema (redness) and its intensity.
   - Pore size and blockage level.
   - Fine lines vs. deep wrinkles.

IMPORTANT: Analyze ONLY this single photo. Do NOT make any comparisons to previous scans, past conditions, or suggest improvement or worsening over time. Do NOT use phrases like "better than before", "has improved", "getting worse", or any temporal comparisons. Only describe what you see in this photo.

### RESPONSE FORMAT (STRICT JSON):

Return ONLY a valid JSON object — no text outside it.

{
  "summary": {
    "type": "Specific skin type (e.g., Dehydrated Combination)",
    "overall_score": 0-100,
    "primary_concern": "The most urgent issue found"
  },
  "metrics": {
    "oiliness": 0-100,
    "hydration": 0-100,
    "sensitivity": 0-100,
    "acne_severity": 0-100
  },
  "detailed_findings": [
    "Observation 1 (e.g., 'Visible redness around the nasolabial folds')",
    "Observation 2",
    "Observation 3"
  ],
  "routine_adjustments": [
    "Add this ingredient",
    "Remove this product",
    "Lifestyle tip"
  ],
  "skincare_steps": [
    {"step": "Specific actionable skincare step", "category": "Morning or Evening"},
    {"step": "Another step", "category": "Morning or Evening"},
    {"step": "Another step", "category": "Morning or Evening"}
  ]
}

IMPORTANT: The "skincare_steps" array must contain 3-5 specific, actionable skincare steps personalized to the findings. Each step must have a "step" (text describing the action, e.g. "Apply 2% salicylic acid serum to T-zone") and "category" ("Morning" or "Evening"). Base these directly on the detected skin issues.

CRITICAL: The "skincare_steps" field MUST ALWAYS be written in ENGLISH regardless of the response language. Use short, canonical English step names like "Morning Cleanser", "Apply SPF", "Vitamin C Serum", "Evening Moisturizer", "Retinol", "Double Cleanse", "Hyaluronic Acid", "Niacinamide Serum", "Eye Cream", "Exfoliate", "Night Cream", "Morning Toner", "Salicylic Acid", "Benzoyl Peroxide", "Face Mask", "Lip Balm", "Spot Treatment". Keep step names SHORT (2-4 words). The category must also always be "Morning" or "Evening" in English. All other fields (detailed_findings, routine_adjustments, summary) should follow the language instruction above.

### FINAL INSTRUCTION:

If the image quality is too low to see pores or texture, set 'overall_score' to 0 and add "Image quality insufficient for medical-grade analysis. Please provide a high-res photo in natural lighting." as the only item in detailed_findings.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this skin photo with full clinical precision. Provide granular observations for each facial zone.",
                },
                { type: "image_url", image_url: { url: photoUrl } },
              ],
            },
          ],
          max_tokens: 1000,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI Gateway error:", errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const result = JSON.parse(jsonStr);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Analysis failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
