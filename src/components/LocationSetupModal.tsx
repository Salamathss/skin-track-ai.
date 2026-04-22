import { useState } from "react";
import { MapPin, Locate, Search, Loader2, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface CityResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
}

interface LocationSetupModalProps {
  open: boolean;
  onClose: () => void;
  onLocationSet: (city: string, lat: number, lon: number) => void;
}

export default function LocationSetupModal({ open, onClose, onLocationSet }: LocationSetupModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsDenied, setGpsDenied] = useState(false);

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setGpsDenied(true);
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Reverse geocode using Open-Meteo geocoding
          const resp = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&count=1&language=en`
          );
          // Fallback: use nominatim for reverse geocode
          const nomResp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&zoom=10`
          );
          const nomData = await nomResp.json();
          const cityName = nomData.address?.city || nomData.address?.town || nomData.address?.village || nomData.display_name?.split(",")[0] || "Your Location";
          onLocationSet(cityName, pos.coords.latitude, pos.coords.longitude);
        } catch {
          onLocationSet("Your Location", pos.coords.latitude, pos.coords.longitude);
        }
        setGpsLoading(false);
      },
      () => {
        setGpsLoading(false);
        setGpsDenied(true);
      },
      { timeout: 10000 }
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const resp = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en`
      );
      const data = await resp.json();
      if (data.results) {
        setResults(
          data.results.map((r: any) => ({
            name: `${r.name}${r.admin1 ? `, ${r.admin1}` : ""}, ${r.country}`,
            lat: r.latitude,
            lon: r.longitude,
            country: r.country,
          }))
        );
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <MapPin className="w-5 h-5 text-primary" />
            {t("loc_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* GPS Option */}
          {!gpsDenied && (
            <Button
              onClick={handleGPS}
              disabled={gpsLoading}
              className="w-full rounded-2xl h-12 gap-2 gradient-primary text-primary-foreground font-semibold"
            >
              {gpsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Locate className="w-4 h-4" />
              )}
              {t("loc_autoDetect")}
            </Button>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">{t("loc_or")}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Manual Search */}
          <div className="flex gap-2">
            <Input
              placeholder={t("loc_searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="rounded-xl flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
              variant="outline"
              className="rounded-xl px-3"
            >
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {results.map((city, i) => (
                <button
                  key={i}
                  onClick={() => onLocationSet(city.name.split(",")[0], city.lat, city.lon)}
                  className="w-full text-left px-4 py-2.5 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm flex items-center gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{city.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Privacy note */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/50">
            <Lock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t("loc_privacyNote")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
