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

    const { photoUrl, language = "en", userSkinType = "Normal", primaryConcern = "General maintenance" } = await req.json();
    const langInstruction = language === "ru"
      ? "\n\nCRITICAL LANGUAGE REQUIREMENT: You MUST respond ENTIRELY in Russian. Product name and brand should remain in their original language, but the category MUST be one of the English categories listed above (for database consistency). The 'active_ingredients' array should use INCI/Latin names. The 'safety_summary', 'warnings', and 'skin_fit.reason' MUST be in Russian. Any error messages or descriptions must be in Russian."
      : "\n\nRespond in English.";

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
              content: `You are a cosmetics and skincare product expert with deep knowledge of ingredients, formulations, and product safety.
The current user has ${userSkinType} skin and their primary concern is ${primaryConcern}.${langInstruction}

### TASK:
Analyze the provided image of a cosmetic/skincare product (packaging, label, or ingredients list) and extract structured product information WITH safety analysis AND personalized skin fit.

### EXTRACTION GUIDELINES:
1. **Product Name**: Extract the exact product name from the label/packaging.
2. **Brand**: Identify the brand name.
3. **Category**: Classify into ONE of: Cleanser, Toner, Serum, Moisturizer, SPF, Mask, Exfoliant, Eye Cream, Oil, Treatment, Other.
4. **Ingredients**: If the ingredients list is visible, extract the full text.
5. **Active Ingredients**: Identify key active ingredients like Retinol, Vitamin C, Niacinamide, Salicylic Acid, Hyaluronic Acid, AHA, BHA, Peptides, Ceramides, etc.
6. **Shelf Life**: Estimate typical shelf life in months (usually indicated by PAO symbol — the open jar icon with "12M", "6M", etc.). If not visible, estimate based on product type.

### SAFETY ANALYSIS:
7. **Safety Rating**: Rate the product as one of: "Safe", "Caution", "Warning".
   - "Safe" = All ingredients are generally well-tolerated.
   - "Caution" = Contains ingredients that may irritate sensitive skin (e.g., fragrances, essential oils, high-concentration acids).
   - "Warning" = Contains potentially harsh ingredients (e.g., high-% retinol, strong acids, known allergens).

### SKIN FIT (PERSONALIZED):
8. **Skin Fit**: Evaluate if this product fits the user's specific skin (${userSkinType}).
   - Rating: "Perfect" (Ideal for this skin), "Good" (Safe but generic), "Risky" (Contains potential triggers for this skin type).
   - Reason: Brief explanation (e.g., "Contains Salicylic Acid which is great for your oily skin" or "Contains fragrance which may trigger your sensitivity").

### RESPONSE FORMAT (STRICT JSON):
Return ONLY a valid JSON object — no text outside it.

{
  "product_name": "Full product name",
  "brand": "Brand name",
  "category": "One of the categories listed above",
  "ingredients_list": "Full ingredients text if visible, or null",
  "active_ingredients": ["Ingredient 1", "Ingredient 2"],
  "shelf_life_months": 12,
  "confidence": "high" | "medium" | "low",
  "safety_rating": "Safe" | "Caution" | "Warning",
  "safety_summary": "Brief overall safety assessment",
  "warnings": ["Warning 1", "Warning 2"],
  "skin_fit": {
    "rating": "Perfect" | "Good" | "Risky",
    "reason": "Personalized explanation"
  }
}

If the image is not a cosmetic product or is unreadable, return:
{
  "product_name": null,
  "brand": null,
  "category": "Other",
  "ingredients_list": null,
  "active_ingredients": [],
  "shelf_life_months": 12,
  "confidence": "low",
  "safety_rating": "Safe",
  "safety_summary": "Could not analyze ingredients.",
  "warnings": [],
  "skin_fit": { "rating": "Good", "reason": "Could not determine suitability." },
  "error": "Could not identify a cosmetic product in this image."
}`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this cosmetic product image. Extract the product name, brand, ingredients, categorize it, and provide a safety analysis of the ingredients.",
                },
                { type: "image_url", image_url: { url: photoUrl } },
              ],
            },
          ],
          max_tokens: 1200,
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
      JSON.stringify({ error: error.message || "Product scan failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
