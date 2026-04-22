import { supabase } from "@/integrations/supabase/client";

export interface WeatherData {
  temperature: number;
  humidity: number;
  uvIndex: number;
  aqi: number;
  city: string;
  timestamp: number;
}

// Default to Almaty
const DEFAULT_CITY = "Almaty";
const DEFAULT_LAT = 43.2389;
const DEFAULT_LON = 76.8897;

export async function fetchWeather(lat = DEFAULT_LAT, lon = DEFAULT_LON, city = DEFAULT_CITY): Promise<WeatherData> {
  try {
    // 1. Fetch Core Weather (Temp, Humidity, UV)
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m&daily=uv_index_max&timezone=auto&forecast_days=1`;
    
    // 2. Fetch Air Quality (AQI)
    const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi`;
    
    const [weatherResp, aqiResp] = await Promise.all([
      fetch(weatherUrl),
      fetch(aqiUrl)
    ]);

    if (!weatherResp.ok || !aqiResp.ok) {
      throw new Error("Failed to fetch weather from Open-Meteo");
    }

    const weatherData = await weatherResp.json();
    const aqiData = await aqiResp.json();

    return {
      temperature: weatherData.current.temperature_2m,
      humidity: weatherData.current.relative_humidity_2m,
      uvIndex: weatherData.daily.uv_index_max[0] || 0,
      aqi: aqiData.current.european_aqi || 0,
      city,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Weather service error:", error);
    throw error;
  }
}

export async function logWeatherToSupabase(
  userId: string, 
  profileId: string, 
  data: WeatherData
) {
  try {
    const { error } = await supabase.from("weather_logs").insert({
      user_id: userId,
      profile_id: profileId,
      city: data.city,
      temperature: data.temperature,
      humidity: data.humidity,
      uv_index: data.uvIndex,
      aqi: data.aqi
    });

    if (error) console.error("Error logging weather to Supabase:", error);
  } catch (error) {
    console.error("Weather logging error:", error);
  }
}
