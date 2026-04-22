import { useState, useEffect, useCallback } from "react";
import { Sun, Droplets, Cloud, Thermometer, Shield, MapPin, RefreshCw, Loader2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/contexts/ProfileContext";
import { useTranslation } from "react-i18next";
import LocationSetupModal from "@/components/LocationSetupModal";
import { fetchWeather as fetchWeatherFromApi, logWeatherToSupabase, type WeatherData as ApiWeatherData } from "@/lib/weather";

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

interface WeatherState {
  weather: WeatherData | null;
  advice: SkinAdvice[];
  loading: boolean;
  error: string | null;
}

function getAdviceIcon(icon: string) {
  switch (icon) {
    case "sun": return <Sun className="w-4 h-4" />;
    case "droplets": return <Droplets className="w-4 h-4" />;
    case "cloud": return <Cloud className="w-4 h-4" />;
    case "thermometer": return <Thermometer className="w-4 h-4" />;
    default: return <Shield className="w-4 h-4" />;
  }
}

function getSeverityClasses(severity: string) {
  switch (severity) {
    case "alert": return "bg-destructive/10 text-destructive border-destructive/20";
    case "warning": return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/30";
    default: return "bg-primary/5 text-primary border-primary/10";
  }
}

export default function EnvironmentalShield() {
  const { user, session } = useAuth();
  const { activeProfile, refreshProfiles } = useProfile();
  const { t, i18n } = useTranslation();
  const [state, setState] = useState<WeatherState>({ weather: null, advice: [], loading: false, error: null });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const isRu = i18n.language === "ru";

  const profileHasLocation = !!(activeProfile as any)?.city_name && !!(activeProfile as any)?.city_lat;

  const fetchWeather = useCallback(async (lat: number, lon: number, cityName: string) => {
    if (!user) return;
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      // Use the new Open-Meteo service
      const weatherData = await fetchWeatherFromApi(lat, lon, cityName);
      
      // Calculate active advice (mock logic based on thresholds)
      const advice: SkinAdvice[] = [];
      if (weatherData.uvIndex > 5) advice.push({ key: "uv_general", severity: "warning", icon: "sun" });
      if (weatherData.humidity < 40) advice.push({ key: "low_humidity", severity: "info", icon: "droplets" });
      if (weatherData.aqi > 50) advice.push({ key: "high_aqi", severity: "warning", icon: "cloud" });
      if (weatherData.temperature > 30) advice.push({ key: "hot_weather", severity: "info", icon: "thermometer" });
      if (weatherData.temperature < 5) advice.push({ key: "extreme_cold", severity: "warning", icon: "thermometer" });
      
      if (advice.length === 0) advice.push({ key: "all_good", severity: "info", icon: "shield" });

      setState({ weather: weatherData as any, advice, loading: false, error: null });
      
      // Cache the result
      localStorage.setItem("weather_cache", JSON.stringify({ 
        weather: weatherData, 
        advice, 
        timestamp: Date.now(), 
        city: cityName, 
        lat, 
        lon, 
        profileId: activeProfile?.id 
      }));

      // Background task: log to Supabase
      if (activeProfile) {
        logWeatherToSupabase(user.id, activeProfile.id, weatherData);
      }
    } catch (err: any) {
      console.error("Fetch weather failed:", err);
      setState(prev => ({ ...prev, loading: false, error: err.message }));
    }
  }, [user, activeProfile]);

  // Auto-fetch weather when profile has location set (or changes)
  useEffect(() => {
    if (!activeProfile || !user) return;
    const p = activeProfile as any;
    if (p.city_name && p.city_lat && p.city_lon) {
      // Check cache for this profile
      const cached = localStorage.getItem("weather_cache");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.profileId === activeProfile.id && Date.now() - parsed.timestamp < 30 * 60 * 1000) {
            setState({ weather: parsed.weather, advice: parsed.advice, loading: false, error: null });
            return;
          }
        } catch {}
      }
      fetchWeather(Number(p.city_lat), Number(p.city_lon), p.city_name);
    } else {
      // No location set, clear weather
      setState({ weather: null, advice: [], loading: false, error: null });
    }
  }, [activeProfile?.id, (activeProfile as any)?.city_name, fetchWeather, user]);

  const handleLocationSet = async (cityName: string, lat: number, lon: number) => {
    setShowLocationModal(false);
    if (!activeProfile) return;

    // Save to sub_profiles
    await supabase
      .from("sub_profiles")
      .update({ city_name: cityName, city_lat: lat, city_lon: lon } as any)
      .eq("id", activeProfile.id);

    await refreshProfiles();
    fetchWeather(lat, lon, cityName);
  };

  const getAdviceText = (key: string, weather: WeatherData) => {
    const texts: Record<string, string> = isRu ? {
      uv_sensitive: `Солнце сильное сегодня (УФ ${weather.uvIndex.toFixed(1)}). Защитите чувствительную кожу SPF 50+.`,
      uv_oily: `УФ-индекс высокий (${weather.uvIndex.toFixed(1)}). Используйте матирующий солнцезащитный крем.`,
      uv_general: `Солнце активно сегодня (УФ ${weather.uvIndex.toFixed(1)}). Нанесите SPF 30+ перед выходом.`,
      low_humidity: `Влажность всего ${weather.humidity}% — риск обезвоживания. Добавьте сыворотку с гиалуроновой кислотой.`,
      high_aqi: `Качество воздуха низкое (AQI ${weather.aqi}). Рекомендуем двойное очищение вечером.`,
      extreme_cold: `На улице ${weather.temperature}°C — риск повреждения барьера. Нанесите барьерный крем.`,
      hot_weather: `Жарко (${weather.temperature}°C). Пейте больше воды и используйте лёгкий гель.`,
      all_good: `Погодные условия комфортные. Придерживайтесь обычного ухода!`,
    } : {
      uv_sensitive: `The sun is strong today (UV ${weather.uvIndex.toFixed(1)}). Protect your sensitive skin with SPF 50+.`,
      uv_oily: `UV index is high (${weather.uvIndex.toFixed(1)}). Use a matte sunscreen to stay protected.`,
      uv_general: `The sun is active today (UV ${weather.uvIndex.toFixed(1)}). Apply SPF 30+ before heading out.`,
      low_humidity: `Humidity is only ${weather.humidity}% — dehydration risk. Add a hyaluronic acid serum.`,
      high_aqi: `Air quality is poor (AQI ${weather.aqi}). Double cleanse tonight to remove particulate matter.`,
      extreme_cold: `It's ${weather.temperature}°C outside — barrier damage risk. Apply a thick barrier cream.`,
      hot_weather: `It's hot (${weather.temperature}°C). Stay hydrated and use a lightweight gel moisturizer.`,
      all_good: `Weather conditions are comfortable. Stick to your regular routine!`,
    };
    return texts[key] || texts.all_good;
  };

  const widgetClass = "bg-card/70 backdrop-blur-sm border border-border/40 rounded-3xl shadow-card p-6 transition-all duration-300 hover:shadow-elevated";

  // No location set — show CTA
  if (!profileHasLocation && !state.loading) {
    return (
      <>
        <div className={`${widgetClass} animate-fade-in`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-semibold text-base">{t("weather_title")}</h2>
          </div>
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground mb-4">{t("loc_ctaMessage")}</p>
            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-2 mx-auto px-5 py-2.5 gradient-primary text-primary-foreground text-sm font-semibold rounded-2xl shadow-soft hover:opacity-90 transition-opacity"
            >
              <MapPin className="w-4 h-4" />
              {t("loc_setLocation")}
            </button>
          </div>
        </div>
        <LocationSetupModal
          open={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          onLocationSet={handleLocationSet}
        />
      </>
    );
  }

  // Loading
  if (state.loading) {
    return (
      <div className={`${widgetClass} animate-fade-in`}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-semibold text-base">{t("weather_title")}</h2>
        </div>
        <div className="flex items-center justify-center py-6 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">{t("weather_loading")}</span>
        </div>
      </div>
    );
  }

  if (!state.weather) return null;

  const w = state.weather;

  return (
    <>
      <div className={`${widgetClass} animate-fade-in`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-base">{t("weather_title")}</h2>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {(activeProfile as any)?.city_name || w.city}
                <button
                  onClick={() => setShowLocationModal(true)}
                  className="ml-1 p-0.5 rounded hover:bg-muted/60 transition-colors"
                  title={t("loc_edit")}
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const p = activeProfile as any;
              if (p?.city_lat && p?.city_lon) {
                fetchWeather(Number(p.city_lat), Number(p.city_lon), p.city_name);
              }
            }}
            className="p-2 rounded-xl hover:bg-muted/60 transition-colors"
            title={t("weather_refresh")}
          >
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${state.loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: isRu ? "Темп." : "Temp", value: `${Math.round(w.temperature)}°`, icon: <Thermometer className="w-3.5 h-3.5" /> },
            { label: isRu ? "Влажн." : "Humid", value: `${Math.round(w.humidity)}%`, icon: <Droplets className="w-3.5 h-3.5" /> },
            { label: "UV", value: w.uvIndex.toFixed(1), icon: <Sun className="w-3.5 h-3.5" /> },
            { label: "AQI", value: Math.round(w.aqi).toString(), icon: <Cloud className="w-3.5 h-3.5" /> },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div className="flex justify-center text-muted-foreground mb-1">{m.icon}</div>
              <p className="text-lg font-bold leading-tight">{m.value}</p>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Advice cards */}
        <div className="space-y-2">
          {state.advice.map((a, i) => (
            <div key={i} className={`flex items-start gap-2.5 p-3 rounded-2xl border ${getSeverityClasses(a.severity)}`}>
              <div className="mt-0.5 flex-shrink-0">{getAdviceIcon(a.icon)}</div>
              <p className="text-xs leading-relaxed">{getAdviceText(a.key, w)}</p>
            </div>
          ))}
        </div>
      </div>
      <LocationSetupModal
        open={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onLocationSet={handleLocationSet}
      />
    </>
  );
}
