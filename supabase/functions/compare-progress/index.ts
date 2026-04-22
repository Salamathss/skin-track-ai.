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
    // Authenticate
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

    const { before, after, language = "en" } = await req.json();

    const langInstruction = language === "ru"
      ? "CRITICAL: Respond ENTIRELY in Russian. Use professional medical/beauty terminology in Russian. The summary text must be completely in Russian."
      : "Respond in English.";

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a dermatology progress analyst. Compare two skin scan data points and write a concise, encouraging 2-3 sentence summary highlighting what improved, what worsened, and one actionable tip. ${langInstruction}

Return ONLY a JSON object: { "summary": "your text here" }`,
          },
          {
            role: "user",
            content: `BEFORE scan (${before.date}):
- Score: ${before.score}/100, Hydration: ${before.hydration}, Oiliness: ${before.oiliness}, Sensitivity: ${before.sensitivity}
- Skin type: ${before.skin_type || "unknown"}, Concern: ${before.primary_concern || "none"}

AFTER scan (${after.date}):
- Score: ${after.score}/100, Hydration: ${after.hydration}, Oiliness: ${after.oiliness}, Sensitivity: ${after.sensitivity}
- Skin type: ${after.skin_type || "unknown"}, Concern: ${after.primary_concern || "none"}

Compare and summarize the progress.`,
          },
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI error:", errText);
      throw new Error(`AI returned ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim() || "";
    if (content.startsWith("```")) {
      content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const result = JSON.parse(content);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message || "Comparison failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
