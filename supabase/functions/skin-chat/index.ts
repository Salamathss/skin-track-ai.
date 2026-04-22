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

    const { messages, language = "en", saveFact, profileId, profileName, profileGender, profileCity, weatherContext } = await req.json();

    // Handle "save fact" requests
    if (saveFact) {
      const { key, value } = saveFact;
      const { error } = await supabaseClient
        .from("user_facts")
        .upsert({ user_id: user.id, fact_key: key, fact_value: value, updated_at: new Date().toISOString() }, { onConflict: "user_id,fact_key" });
      if (error) console.error("Save fact error:", error);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load user context
    const scanFilter = profileId
      ? supabaseClient.from("skin_scans").select("score, skin_type, primary_concern, oiliness, hydration, sensitivity, acne_type, inflammation, detailed_findings, created_at").eq("user_id", user.id).eq("profile_id", profileId).order("created_at", { ascending: false }).limit(5)
      : supabaseClient.from("skin_scans").select("score, skin_type, primary_concern, oiliness, hydration, sensitivity, acne_type, inflammation, detailed_findings, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5);

    const historyFilter = profileId
      ? supabaseClient.from("skin_scans").select("score, oiliness, hydration, sensitivity, created_at").eq("user_id", user.id).eq("profile_id", profileId).gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: true })
      : supabaseClient.from("skin_scans").select("score, oiliness, hydration, sensitivity, created_at").eq("user_id", user.id).gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()).order("created_at", { ascending: true });

    const [factsRes, scansRes, shelfRes, historyRes] = await Promise.all([
      supabaseClient.from("user_facts").select("fact_key, fact_value").eq("user_id", user.id),
      scanFilter,
      supabaseClient.from("cosmetic_shelf").select("product_name, brand, category, active_ingredients, is_active, opened_at, shelf_life_months").eq("user_id", user.id).eq("is_active", true),
      historyFilter,
    ]);

    const userFacts = factsRes.data || [];
    const recentScans = scansRes.data || [];
    const shelfProducts = shelfRes.data || [];
    const history30d = historyRes.data || [];

    // Build profile identity block
    let profileBlock = "\n\n### PROFILE IDENTITY:\n";
    profileBlock += `You are the personal assistant for **${profileName || "this user"}**`;
    if (profileGender) profileBlock += `, who is **${profileGender}**`;
    const ageFact = userFacts.find((f: any) => f.fact_key === "age");
    if (ageFact) profileBlock += ` and **${ageFact.fact_value} years old**`;
    if (profileCity) profileBlock += `, located in **${profileCity}**`;
    profileBlock += `. Only use data associated with this profile. Do NOT mix data from other profiles.\n`;

    // Build user facts block
    let factsBlock = "\n\n### USER'S PERSONAL FACTS (remembered across sessions):\n";
    if (userFacts.length > 0) {
      userFacts.forEach((f: any) => {
        factsBlock += `- **${f.fact_key}**: ${f.fact_value}\n`;
      });
    } else {
      factsBlock += "No personal facts saved yet. If the user shares personal info (age, skin type, goals, allergies), offer to remember it.\n";
    }

    // Build context summary
    const latestScan = recentScans[0];
    let contextBlock = "\n\n### USER'S SKIN DATA CONTEXT:\n";

    if (latestScan) {
      contextBlock += `**Latest Scan** (${latestScan.created_at}):\n`;
      contextBlock += `- Score: ${latestScan.score}/100, Skin Type: ${latestScan.skin_type}\n`;
      contextBlock += `- Primary Concern: ${latestScan.primary_concern}\n`;
      contextBlock += `- Hydration: ${latestScan.hydration}%, Oiliness: ${latestScan.oiliness}%, Sensitivity: ${latestScan.sensitivity}%\n`;
      contextBlock += `- Inflammation: ${latestScan.inflammation}, Acne Type: ${latestScan.acne_type}\n`;
      if (latestScan.detailed_findings?.length) {
        contextBlock += `- Findings: ${latestScan.detailed_findings.join("; ")}\n`;
      }
    } else {
      contextBlock += "No skin scans available yet.\n";
    }

    if (history30d.length >= 2) {
      const first = history30d[0];
      const last = history30d[history30d.length - 1];
      contextBlock += `\n**30-Day Trend** (${history30d.length} scans):\n`;
      contextBlock += `- Score: ${first.score} → ${last.score} (${(last.score ?? 0) - (first.score ?? 0) > 0 ? "worsened" : "improved"})\n`;
      contextBlock += `- Hydration: ${first.hydration} → ${last.hydration}\n`;
      contextBlock += `- Oiliness: ${first.oiliness} → ${last.oiliness}\n`;
    }

    if (shelfProducts.length > 0) {
      contextBlock += `\n**Cosmetic Shelf** (${shelfProducts.length} active products):\n`;
      shelfProducts.forEach((p: any) => {
        contextBlock += `- ${p.product_name} (${p.brand || "Unknown"}) — ${p.category}`;
        if (p.active_ingredients?.length) contextBlock += `, Ingredients: ${p.active_ingredients.join(", ")}`;
        contextBlock += "\n";
      });
    } else {
      contextBlock += "\nNo products on shelf.\n";
    }

    // Build weather context block
    let weatherBlock = "";
    if (weatherContext) {
      weatherBlock = `\n\n### CURRENT WEATHER CONDITIONS:\n`;
      weatherBlock += `- Location: ${weatherContext.city}\n`;
      weatherBlock += `- Temperature: ${weatherContext.temperature}°C\n`;
      weatherBlock += `- Humidity: ${weatherContext.humidity}%\n`;
      weatherBlock += `- UV Index: ${weatherContext.uvIndex}\n`;
      weatherBlock += `- Air Quality Index (AQI): ${weatherContext.aqi}\n`;
      weatherBlock += `\nUse this weather data to give proactive skincare advice. For example, if UV is high, remind about SPF. If humidity is low, suggest hydration. If AQI is high, suggest double cleansing. Reference specific products from the user's shelf when possible.\n`;
    }

    const langInstruction = language === "ru"
      ? "You MUST respond ENTIRELY in Russian. Use professional dermatological and beauty terminology in Russian. INCI ingredient names may stay in Latin format."
      : "Respond in English using professional dermatological terminology.";

    const systemPrompt = `You are an AI Skincare Buddy — a warm, empathetic, and knowledgeable companion (not a cold assistant). You have LONG-TERM MEMORY of this user's personal facts. ${langInstruction}
${profileBlock}
### YOUR PERSONALITY:
- Be supportive and conversational, like a caring friend who happens to be a dermatologist.
- Use phrases like: "I remember you mentioned...", "We've seen progress since...", "Don't worry, we'll figure this out together!"
- Reference the user's personal facts naturally (age, goals, allergies, preferences).
- If the chat history is empty but you have personal facts, greet the user warmly: "Welcome back! I still remember [fact]. What's on your mind today?"

### MEMORY COMMANDS:
- If the user says something like "remember that I'm 20 years old" or "my goal is clear skin by summer", respond confirming you'll remember it and include a JSON block at the END of your message:
\`\`\`json:save_facts
[{"key": "age", "value": "20"}, {"key": "goal", "value": "Clear skin by summer"}]
\`\`\`
- Common fact keys: age, skin_type, skin_goal, allergies, concerns, preferences, birth_date
- Only include the JSON block when the user explicitly asks you to remember something.

### YOUR CAPABILITIES:
1. **Proactive Diagnosis**: Cross-reference issues with scan data and shelf products. Suggest specific products they OWN.
2. **Ingredient Expert**: Analyze ingredient interactions. Warn about conflicts (e.g., Retinol + AHA).
3. **Trend Analyst**: Use 30-day history to identify patterns and give forward-looking advice.
4. **Spot Analysis**: If the user sends a photo, analyze it and provide targeted advice.

### RESPONSE STYLE:
- Be concise but thorough. Use markdown for readability.
- Reference the user's actual data (scores, products, personal facts) when relevant.
- If suggesting a product they don't own, say "Consider adding..."
- Always be empathetic, supportive, and encouraging.
${factsBlock}${contextBlock}${weatherBlock}`;

    const aiMessages: any[] = [
      { role: "system", content: systemPrompt },
    ];

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        if (msg.image_url) {
          aiMessages.push({
            role: msg.role,
            content: [
              { type: "text", text: msg.content || "Analyze this photo" },
              { type: "image_url", image_url: { url: msg.image_url } },
            ],
          });
        } else {
          aiMessages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI Gateway error:", response.status, errText);
      throw new Error(`AI Gateway returned ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Chat failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
