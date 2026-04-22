import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface WeatherData {
  temperature: number;
  humidity: number;
  uvIndex: number;
  aqi: number;
  city: string;
  weatherCode: number;
}

interface SkinAdvice {
  key: string;
  severity: "info" | "warning" | "alert";
  icon: string;
}

function generateAdvice(weather: WeatherData, skinType: string | null): SkinAdvice[] {
  const advice: SkinAdvice[] = [];

  // High UV
  if (weather.uvIndex > 4) {
    if (skinType && (skinType.toLowerCase().includes("fair") || skinType.toLowerCase().includes("sensitive"))) {
      advice.push({ key: "uv_sensitive", severity: "alert", icon: "sun" });
    } else if (skinType && skinType.toLowerCase().includes("oily")) {
      advice.push({ key: "uv_oily", severity: "warning", icon: "sun" });
    } else {
      advice.push({ key: "uv_general", severity: "warning", icon: "sun" });
    }
  }

  // Low humidity
  if (weather.humidity < 30) {
    advice.push({ key: "low_humidity", severity: "warning", icon: "droplets" });
  }

  // High AQI
  if (weather.aqi > 100) {
    advice.push({ key: "high_aqi", severity: "alert", icon: "cloud" });
  }

  // Extreme cold
  if (weather.temperature < -5) {
    advice.push({ key: "extreme_cold", severity: "alert", icon: "thermometer" });
  }

  // Hot weather
  if (weather.temperature > 32) {
    advice.push({ key: "hot_weather", severity: "warning", icon: "sun" });
  }

  // Good conditions
  if (advice.length === 0) {
    advice.push({ key: "all_good", severity: "info", icon: "shield" });
  }

  return advice;
}

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

    const { latitude, longitude, city, profileId, skinType } = await req.json();

    if (!latitude || !longitude) {
      return new Response(JSON.stringify({ error: "Location required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch weather + air quality from Open-Meteo (free, no key needed)
    const [weatherRes, aqiRes] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&daily=uv_index_max&timezone=auto&forecast_days=1`),
      fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=european_aqi`),
    ]);

    const weatherData = await weatherRes.json();
    const aqiData = await aqiRes.json();

    const weather: WeatherData = {
      temperature: weatherData.current?.temperature_2m ?? 20,
      humidity: weatherData.current?.relative_humidity_2m ?? 50,
      uvIndex: weatherData.daily?.uv_index_max?.[0] ?? 0,
      aqi: aqiData.current?.european_aqi ?? 0,
      city: city || "Unknown",
      weatherCode: weatherData.current?.weather_code ?? 0,
    };

    const advice = generateAdvice(weather, skinType);

    // Log to database
    await supabaseClient.from("weather_logs").insert({
      user_id: user.id,
      profile_id: profileId || null,
      city: weather.city,
      temperature: weather.temperature,
      humidity: weather.humidity,
      uv_index: weather.uvIndex,
      aqi: weather.aqi,
      advice: advice,
    });

    return new Response(
      JSON.stringify({ weather, advice }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Weather error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Weather fetch failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
