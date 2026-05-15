import { useState, useRef, useEffect, useCallback, useLayoutEffect } from "react";
import { MessageCircle, X, Send, Mic, MicOff, ImagePlus, Sparkles, Loader2, Trash2, Info, Pencil, Check, Plus, XCircle, RefreshCw, User, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile, SubProfile } from "@/contexts/ProfileContext";
import { usePremium } from "@/contexts/PremiumContext";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  image_url?: string | null;
  created_at?: string;
}

interface UserFact {
  id?: string;
  fact_key: string;
  fact_value: string;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;
const PROXIED_GEMINI_URL = GEMINI_URL;

const FACT_LABELS: Record<string, { en: string; ru: string }> = {
  age: { en: "Age", ru: "Возраст" },
  skin_type: { en: "Skin Type", ru: "Тип кожи" },
  skin_goal: { en: "Goal", ru: "Цель" },
  allergies: { en: "Allergies", ru: "Аллергии" },
  concerns: { en: "Concerns", ru: "Проблемы" },
  preferences: { en: "Preferences", ru: "Предпочтения" },
  birth_date: { en: "Birth Date", ru: "Дата рождения" },
};

function getGenderAvatar(gender: string | null) {
  switch (gender) {
    case "female": return "👩";
    case "male": return "👨";
    default: return "🧑";
  }
}

export default function AiChat() {
  const { user, session } = useAuth();
  const { profiles, activeProfile, setActiveProfile } = useProfile();
  const { isPremium, setShowPremiumModal } = usePremium();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showFacts, setShowFacts] = useState(false);
  const [facts, setFacts] = useState<UserFact[]>([]);
  const [editingFact, setEditingFact] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [newFactKey, setNewFactKey] = useState("");
  const [newFactValue, setNewFactValue] = useState("");
  const [addingFact, setAddingFact] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile lock state
  const [lockedProfileId, setLockedProfileId] = useState<string | null>(null);
  const [lockedProfile, setLockedProfile] = useState<SubProfile | null>(null);
  const [chatSession, setChatSession] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Draggable FAB state
  const fabRef = useRef<HTMLButtonElement>(null);
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, fabX: 0, fabY: 0 });
  const hasMoved = useRef(false);

  // Initialize FAB position from localStorage or default
  useLayoutEffect(() => {
    if (!fabPos) {
      try {
        const saved = localStorage.getItem("fab_position");
        if (saved) {
          const parsed = JSON.parse(saved);
          // Validate bounds
          const x = Math.min(Math.max(24, parsed.x), window.innerWidth - 80);
          const y = Math.min(Math.max(80, parsed.y), window.innerHeight - 140);
          setFabPos({ x, y });
          return;
        }
      } catch { }
      setFabPos({ x: window.innerWidth - 80, y: window.innerHeight - 180 });
    }
  }, []);

  // FAB drag handlers
  const onFabPointerDown = useCallback((e: React.PointerEvent) => {
    if (!fabRef.current || !fabPos) return;
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, fabX: fabPos.x, fabY: fabPos.y };
    fabRef.current.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [fabPos]);

  const onFabPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) hasMoved.current = true;
    const newX = dragStart.current.fabX + dx;
    const newY = Math.max(80, Math.min(window.innerHeight - 140, dragStart.current.fabY + dy));
    setFabPos({ x: newX, y: newY });
  }, []);

  const onFabPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    // Snap to nearest horizontal edge
    const snapX = (fabPos?.x ?? 0) < window.innerWidth / 2 ? 24 : window.innerWidth - 80;
    const newPos = { x: snapX, y: fabPos?.y ?? window.innerHeight - 180 };
    setFabPos(newPos);
    localStorage.setItem("fab_position", JSON.stringify(newPos));
    if (!hasMoved.current) {
      setOpen(true);
    }
  }, [fabPos]);

  // Restore locked profile from localStorage or default to activeProfile
  useEffect(() => {
    if (!user) return;
    const savedLock = localStorage.getItem(`chat_locked_profile_${user.id}`);
    if (savedLock) {
      setLockedProfileId(savedLock);
    } else if (profiles.length > 0) {
      // If no saved lock, but we have profiles, try to find a good default
      // Either current activeProfile or the first one
      const defaultId = profiles[0].id;
      setLockedProfileId(defaultId);
    }
  }, [user, profiles]);

  // Sync with activeProfile change and clear history to prevent memory bleed
  useEffect(() => {
    if (activeProfile?.id && activeProfile.id !== lockedProfileId) {
      setLockedProfileId(activeProfile.id);
      setLockedProfile(activeProfile);
      setMessages([]);
      setChatSession(null); // Reset Gemini context
      setError(null); // Clear error state on profile change
    }
  }, [activeProfile?.id]);

  // Resolve locked profile object when profiles or lockedProfileId change
  useEffect(() => {
    if (lockedProfileId && profiles.length > 0) {
      const found = profiles.find(p => p.id === lockedProfileId);
      if (found) {
        setLockedProfile(found);
      } else {
        // Profile was deleted, reset lock
        setLockedProfileId(null);
        setLockedProfile(null);
        if (user) localStorage.removeItem(`chat_locked_profile_${user.id}`);
      }
    } else if (!lockedProfileId) {
      setLockedProfile(null);
    }
  }, [lockedProfileId, profiles, user]);

  // Load facts
  const loadFacts = useCallback(async () => {
    if (!user || !lockedProfileId || lockedProfileId === "null" || lockedProfileId.length < 32) return;
    let query = (supabase
      .from("user_facts") as any)
      .select("*")
      .eq("user_id", user.id)
      .eq("profile_id", lockedProfileId);

    const { data, error } = await query;
    if (error && (error as any).code === "42703") {
      const fallbackQuery = await supabase.from("user_facts").select("*").eq("user_id", user.id);
      if (fallbackQuery.data) setFacts(fallbackQuery.data as UserFact[]);
    } else if (data) {
      setFacts(data as UserFact[]);
    }
  }, [user, lockedProfileId]);

  // Load chat history on open (only when profile is locked)
  useEffect(() => {
    if (!open || !user || !lockedProfileId || lockedProfileId === "null" || lockedProfileId.length < 32) return;
    const loadHistory = async () => {
      setMessages([]); // Clear state before loading new profile history
      setIsHistoryLoading(true);
      setError(null);

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 10000)
      );

      try {
        const query = (supabase
          .from("chat_messages") as any)
          .select("*")
          .eq("user_id", user.id)
          .eq("profile_id", lockedProfileId)
          .order("created_at", { ascending: true })
          .limit(20);

        const { data, error: fetchError } = await Promise.race([query, timeout]) as any;

        if (fetchError) {
          console.error("Error loading chat history:", fetchError);
          return;
        }

        if (data) setMessages(data as ChatMessage[]);
      } catch (err: any) {
        console.error("Failed to fetch chat history:", err);
        if (err.message === "Timeout") {
          setError("Превышено время ожидания загрузки истории");
        }
      } finally {
        setIsHistoryLoading(false);
      }
    };
    loadHistory();
    loadFacts();
  }, [open, user, lockedProfileId, loadFacts]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Lock a profile for the chat
  const lockProfile = (profile: SubProfile) => {
    setActiveProfile(profile);
    setLockedProfileId(profile.id);
    setLockedProfile(profile);
    if (user) localStorage.setItem(`chat_locked_profile_${user.id}`, profile.id);
    setMessages([]);
    setChatSession(null);
  };

  // Reset chat & unlock profile
  const resetChatAndProfile = async () => {
    if (!user) return;
    await supabase.from("chat_messages").delete().eq("user_id", user.id);
    setMessages([]);
    setLockedProfileId(null);
    setLockedProfile(null);
    localStorage.removeItem(`chat_locked_profile_${user.id}`);
    setShowSettings(false);
  };

  // Voice-to-text
  const toggleVoice = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) return;
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = i18n.language === "ru" ? "ru-RU" : "en-US";
    recognition.interimResults = false;
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + (prev ? " " : "") + transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening, i18n.language]);

  // Image handling
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/chat-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("skin-photos").upload(path, file);
    if (error) { console.error("Upload error:", error); return null; }
    const { data: { publicUrl } } = supabase.storage.from("skin-photos").getPublicUrl(path);
    return publicUrl;
  };

  // Parse save_facts from AI response
  const parseSaveFacts = async (content: string) => {
    const match = content.match(/```json:save_facts\n(\[[\s\S]*?\])\n```/);
    if (!match) return;
    try {
      const factsToSave = JSON.parse(match[1]) as { key: string; value: string }[];
      for (const f of factsToSave) {
        const payload: any = {
          user_id: user!.id,
          profile_id: activeProfile?.id,
          fact_key: f.key,
          fact_value: f.value,
          updated_at: new Date().toISOString()
        };
        let { error } = await supabase
          .from("user_facts")
          .upsert(payload, { onConflict: "user_id,fact_key" });

        if (error && (error as any).code === "42703") {
          delete payload.profile_id;
          await supabase.from("user_facts").upsert(payload, { onConflict: "user_id,fact_key" });
        }
      }
      loadFacts();
    } catch (e) {
      console.error("Failed to parse save_facts:", e);
    }
  };

  const cleanContent = (content: string) => {
    return content.replace(/```json:save_facts\n[\s\S]*?\n```/g, "").trim();
  };

  // Send message
  const sendMessage = async () => {
    // Emergency reset: if chat is stuck in loading state
    if (isLoading || isHistoryLoading) {
      console.warn("Chat stuck detected, forcing reset...");
      setIsLoading(false);
      setIsHistoryLoading(false);
      setIsThinking(false);
    }

    if ((!input.trim() && !imageFile) || !user || !activeProfile || isSending) return;
    const profileId = activeProfile.id;
    setIsSending(true);

    if (!GEMINI_API_KEY) {
      toast.error("Gemini API key not found. Please check your .env file.");
      return;
    }

    let uploadedImageUrl: string | null = null;
    if (imageFile) {
      uploadedImageUrl = await uploadImage(imageFile);
    }

    const userMsg: ChatMessage = {
      role: "user",
      content: input.trim() || (uploadedImageUrl ? t("chat_analyzePhoto") : ""),
      image_url: uploadedImageUrl,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    clearImage();
    setIsLoading(true);
    setIsThinking(true);

    let payload: any = {
      user_id: user.id,
      role: "user",
      content: userMsg.content,
      image_url: uploadedImageUrl,
    };
    if (activeProfile?.id) {
      payload.profile_id = activeProfile.id;
    }

    const { error: insertError } = await (supabase.from("chat_messages") as any).insert(payload);

    if (insertError) {
      console.error("Error saving user message to database:", insertError);
    }

    try {
      // Fetch context data (scans and products)
      const [scansRes, shelfRes] = await Promise.all([
        (supabase
          .from("skin_scans") as any)
          .select("score, skin_type, primary_concern, oiliness, hydration, sensitivity, acne_type, inflammation, detailed_findings, created_at")
          .eq("user_id", user.id)
          .eq("profile_id", activeProfile.id)
          .order("created_at", { ascending: false })
          .limit(5),
        (supabase
          .from("cosmetic_shelf") as any)
          .select("product_name, brand, category, active_ingredients, is_active")
          .eq("user_id", user.id)
          .eq("profile_id", activeProfile.id)
          .eq("is_active", true)
      ]);

      const recentScans = scansRes.data || [];
      const shelfProducts = shelfRes.data || [];

      // Build System Prompt (Simplified version of the Edge Function prompt)
      let contextInfo = `User Profile: ${lockedProfile.profile_name} (${lockedProfile.gender || "unknown"}).`;

      if (facts.length > 0) {
        contextInfo += "\nKnown Facts: " + facts.map(f => `${f.fact_key}: ${f.fact_value}`).join(", ");
      }

      if (recentScans.length > 0) {
        const latest = recentScans[0];
        contextInfo += `\nLatest Scan (${latest.created_at}): Score ${latest.score}, Type: ${latest.skin_type}, Concern: ${latest.primary_concern}.`;
      }

      if (shelfProducts.length > 0) {
        contextInfo += "\nCosmetic Shelf: " + shelfProducts.map(p => `${p.product_name} (${p.brand})`).join(", ");
      }

      // Fetch weather context (try cache first)
      let weatherInfo = "No current weather data available.";
      try {
        const cachedWeather = localStorage.getItem("weather_cache");
        if (cachedWeather) {
          const w = JSON.parse(cachedWeather);
          // Only use if recent (last 3 hours)
          if (Date.now() - w.timestamp < 3 * 60 * 60 * 1000) {
            weatherInfo = `Current Weather in ${w.city || "Almaty"}: ${Math.round(w.weather.temperature)}°C, Humidity: ${Math.round(w.weather.humidity)}%, UV Index: ${w.weather.uvIndex.toFixed(1)}, AQI: ${Math.round(w.weather.aqi)}.`;
          }
        }
      } catch (e) {
        console.warn("Could not load weather for AI prompt", e);
      }

      const systemInstruction = {
        parts: [{
          text: `You are an AI Skincare Buddy. Be empathetic and professional.
Language: ${i18n.language === "ru" ? "Russian" : "English"}.

### USER CONTEXT:
- Name: ${activeProfile.profile_name}
- Age: ${facts.find(f => f.fact_key === "age")?.fact_value || "Unknown"}

### CONTEXT:
${contextInfo}

### ENVIRONMENTAL CONTEXT:
${weatherInfo}

If the user shares personal info (age, goal, etc.), confirm you'll remember it and include this block at the END of your response:
\`\`\`json:save_facts
[{"key": "fact_key", "value": "fact_value"}]
\`\`\`
Common keys: age, skin_type, skin_goal, allergies, concerns.` }]
      };

      // Prepare Gemini payload - ensure role alternation and start with user
      const historyItems = messages.slice(-10); // Last 10 messages for memory
      const history = [];
      let lastRole = null;

      for (const m of historyItems) {
        const role = m.role === "user" ? "user" : "model";
        if (role !== lastRole) {
          history.push({
            role,
            parts: [{ text: m.content }]
          });
          lastRole = role;
        }
      }

      // If last history item is user, we need to merge with current user turn or remove it
      // Standard chatbot flow: user -> model -> user -> model
      if (lastRole === "user") {
        history.pop();
      }

      const contents = [
        ...history,
        {
          role: "user",
          parts: [
            { text: userMsg.content },
            ...(uploadedImageUrl ? [{
              inline_data: {
                mime_type: "image/jpeg", data: await (async () => {
                  const resp = await fetch(uploadedImageUrl);
                  const blob = await resp.blob();
                  return new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
                    reader.readAsDataURL(blob);
                  });
                })()
              }
            }] : [])
          ]
        }
      ];

      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 10000);

      const resp = await fetch(PROXIED_GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          system_instruction: systemInstruction,
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
        }),
        signal: controller.signal
      });
      clearTimeout(id);

      if (!resp.ok) {
        const errorText = await resp.text().catch(() => "Unknown error");
        console.error("Gemini API Detailed Error:", {
          status: resp.status,
          statusText: resp.statusText,
          body: errorText,
          url: PROXIED_GEMINI_URL
        });

        if (resp.status === 429) {
          throw new Error("Слишком много запросов. Пожалуйста, подождите 1 минуту.");
        }

        throw new Error(`Gemini API call failed: ${resp.status}`);
      }

      setIsThinking(false);
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  assistantContent += text;
                  const displayContent = cleanContent(assistantContent);
                  setMessages((prev) => {
                    const last = prev[prev.length - 1];
                    if (last?.role === "assistant" && !last.id) {
                      return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: displayContent } : m);
                    }
                    return [...prev, { role: "assistant", content: displayContent }];
                  });
                }
              } catch (e) { }
            }
          }
        }
      }

      if (assistantContent) {
        await parseSaveFacts(assistantContent);
        const displayContent = cleanContent(assistantContent);
        let assistantPayload: any = {
          user_id: user.id,
          role: "assistant",
          content: displayContent,
        };
        if (activeProfile?.id) {
          assistantPayload.profile_id = activeProfile.id;
        }

        const { error: assistantInsertError } = await (supabase.from("chat_messages") as any).insert(assistantPayload);

        if (assistantInsertError) {
          console.error("Error saving assistant message to database:", assistantInsertError);
        }
      }
    } catch (err: any) {
      console.error("FULL CHAT ERROR:", err);
      const errorMsg: ChatMessage = {
        role: "assistant",
        content: `⚠️ ${err.message || "Something went wrong. Please try again."}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
      setIsThinking(false);
    } finally {
      setIsLoading(false);
      setIsThinking(false);
      setIsSending(false);
    }
  };

  const clearHistory = async () => {
    if (!user) return;
    await supabase.from("chat_messages").delete().eq("user_id", user.id);
    setMessages([]);
  };

  // Fact management
  const saveFact = async (key: string, value: string) => {
    if (!user || !key.trim() || !value.trim() || !lockedProfileId) return;
    const payload: any = {
      user_id: user.id,
      profile_id: activeProfile?.id,
      fact_key: key.trim(),
      fact_value: value.trim(),
      updated_at: new Date().toISOString()
    };

    let { error } = await (supabase.from("user_facts") as any).upsert(payload, { onConflict: "user_id,fact_key" });

    if (error && (error as any).code === "42703") {
      delete payload.profile_id;
      await (supabase.from("user_facts") as any).upsert(payload, { onConflict: "user_id,fact_key" });
    }

    loadFacts();
    setEditingFact(null);
    setEditValue("");
  };

  const deleteFact = async (key: string) => {
    if (!user || !activeProfile?.id || activeProfile.id === "null") return;
    await (supabase.from("user_facts") as any).delete().eq("user_id", user.id).eq("profile_id", activeProfile.id).eq("fact_key", key);
    loadFacts();
  };

  const addNewFact = async () => {
    if (!newFactKey.trim() || !newFactValue.trim()) return;
    await saveFact(newFactKey, newFactValue);
    setNewFactKey("");
    setNewFactValue("");
    setAddingFact(false);
  };

  const getFactLabel = (key: string) => {
    const label = FACT_LABELS[key];
    if (label) return i18n.language === "ru" ? label.ru : label.en;
    return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const quickActions = [
    { label: t("chat_quickScan"), message: t("chat_quickScanMsg") },
    { label: t("chat_quickCompat"), message: t("chat_quickCompatMsg") },
    { label: t("chat_quickRoutine"), message: t("chat_quickRoutineMsg") },
  ];

  const handleQuickAction = (msg: string) => {
    setInput(msg);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  if (!user) return null;

  // Profile Selection Screen
  const renderProfileSelection = () => (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
      <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4">
        <User className="w-8 h-8 text-primary-foreground" />
      </div>
      <h3 className="text-lg font-bold mb-1">{t("chat_selectProfile")}</h3>
      <p className="text-sm text-muted-foreground text-center mb-6">{t("chat_selectProfileDesc")}</p>
      <div className="w-full space-y-2">
        {profiles.map((profile) => {
          const isPro = isPremium || activeProfile?.is_premium;
          const isBlocked = !isPro && profile.id !== activeProfile?.id;
          return (
            <button
              key={profile.id}
              onClick={() => {
                if (isBlocked) {
                  setShowPremiumModal(true);
                  return;
                }
                lockProfile(profile);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${isBlocked ? "border-border opacity-60 bg-muted/30 cursor-not-allowed" : "border-border hover:border-primary/50 hover:bg-primary/5"}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isBlocked ? "bg-muted/50 grayscale" : "bg-muted"}`}>
                {getGenderAvatar(profile.gender)}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold flex items-center gap-2">
                  {profile.profile_name}
                  {isBlocked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                </p>
                <p className="text-[11px] text-muted-foreground capitalize">{profile.gender || t("chat_genderNotSet")}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Floating bubble - draggable */}
      {!open && fabPos && (
        <button
          ref={fabRef}
          onPointerDown={onFabPointerDown}
          onPointerMove={onFabPointerMove}
          onPointerUp={onFabPointerUp}
          className="fixed z-[9999] w-14 h-14 rounded-full gradient-primary shadow-elevated flex items-center justify-center hover:scale-105 animate-scale-in touch-none select-none"
          style={{
            left: fabPos.x,
            top: fabPos.y,
            transition: isDragging.current ? 'none' : 'left 0.3s ease-out, top 0.05s ease-out',
          }}
          aria-label={t("chat_title")}
        >
          <MessageCircle className="w-6 h-6 text-primary-foreground" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[420px] h-[100dvh] sm:h-[600px] sm:max-h-[80vh] flex flex-col bg-card/95 backdrop-blur-xl border border-border/50 sm:rounded-3xl shadow-elevated animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">{t("chat_title")}</h3>
                <p className="text-[11px] text-muted-foreground">{t("chat_subtitle")}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {lockedProfile && (
                <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-xl transition-colors ${showSettings ? "bg-primary/10 text-primary" : "hover:bg-muted/60 text-muted-foreground"}`} title={t("chat_settings")}>
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setShowFacts(!showFacts)} className={`p-2 rounded-xl transition-colors ${showFacts ? "bg-primary/10 text-primary" : "hover:bg-muted/60 text-muted-foreground"}`} title={t("chat_factsTitle")}>
                <Info className="w-4 h-4" />
              </button>
              <button onClick={clearHistory} className="p-2 rounded-xl hover:bg-muted/60 transition-colors" title={t("chat_clear")}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={() => setOpen(false)} className="p-2 rounded-xl hover:bg-muted/60 transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Profile lock badge */}
          {lockedProfile && (
            <div className="px-4 py-2 bg-primary/5 border-b border-border/30 flex items-center gap-2">
              <span className="text-lg">{getGenderAvatar(lockedProfile.gender)}</span>
              <span className="text-xs font-medium text-primary">{t("chat_consultingFor")}: {lockedProfile.profile_name}</span>
            </div>
          )}

          {/* Settings overlay */}
          {showSettings && lockedProfile && (
            <div className="border-b border-border/40 bg-muted/30 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-2">{t("chat_resetDesc")}</p>
              <button
                onClick={resetChatAndProfile}
                className="w-full py-2 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
              >
                {t("chat_resetBtn")}
              </button>
            </div>
          )}

          {/* Facts sidebar overlay */}
          {showFacts && (
            <div className="border-b border-border/40 bg-muted/30 px-4 py-3 max-h-[240px] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">{t("chat_factsTitle")}</h4>
                <button onClick={() => setAddingFact(true)} className="p-1 rounded-lg hover:bg-muted/60 text-primary">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mb-2">{t("chat_factsDesc")}</p>

              {facts.length === 0 && !addingFact && (
                <p className="text-xs text-muted-foreground italic">{t("chat_noFacts")}</p>
              )}

              <div className="space-y-1.5">
                {facts.map((f) => (
                  <div key={f.fact_key} className="flex items-center gap-2 group">
                    <span className="text-[11px] font-medium text-muted-foreground min-w-[60px]">{getFactLabel(f.fact_key)}:</span>
                    {editingFact === f.fact_key ? (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-6 text-xs py-0 px-2"
                          onKeyDown={(e) => e.key === "Enter" && saveFact(f.fact_key, editValue)}
                        />
                        <button onClick={() => saveFact(f.fact_key, editValue)} className="text-primary"><Check className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setEditingFact(null)} className="text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs text-foreground flex-1">{f.fact_value}</span>
                        <button onClick={() => { setEditingFact(f.fact_key); setEditValue(f.fact_value); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-opacity">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => deleteFact(f.fact_key)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                          <XCircle className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}

                {addingFact && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <Input placeholder={t("chat_factKey")} value={newFactKey} onChange={(e) => setNewFactKey(e.target.value)} className="h-6 text-xs py-0 px-2 w-20" />
                    <Input placeholder={t("chat_factValue")} value={newFactValue} onChange={(e) => setNewFactValue(e.target.value)} className="h-6 text-xs py-0 px-2 flex-1" onKeyDown={(e) => e.key === "Enter" && addNewFact()} />
                    <button onClick={addNewFact} className="text-primary"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setAddingFact(false); setNewFactKey(""); setNewFactValue(""); }} className="text-muted-foreground"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile selection OR Messages */}
          {!lockedProfile ? (
            renderProfileSelection()
          ) : (
            <>
              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {isHistoryLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-sm text-muted-foreground animate-pulse">{t("chat_loadingHistory")}</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-10 h-10 text-primary/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">{t("chat_welcome")}</p>
                  </div>
                ) : null}

                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === "user"
                        ? "gradient-primary text-primary-foreground rounded-br-md"
                        : "bg-muted/60 text-foreground rounded-bl-md"
                      }`}>
                      {msg.image_url && (
                        <img src={msg.image_url} alt="" className="rounded-xl mb-2 max-h-40 object-cover" />
                      )}
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:mt-1 [&>ol]:mt-1">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex justify-start">
                    <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">{t("chat_thinking")}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick actions */}
              {messages.length === 0 && (
                <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
                  {quickActions.map((qa) => (
                    <button
                      key={qa.label}
                      onClick={() => handleQuickAction(qa.message)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    >
                      {qa.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Image preview */}
              {imagePreview && (
                <div className="px-4 pb-2">
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="" className="h-16 rounded-xl object-cover" />
                    <button
                      onClick={clearImage}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="px-4 pb-4 pt-2 border-t border-border/40 bg-card/80">
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="p-2.5 rounded-xl hover:bg-muted/60 transition-colors flex-shrink-0"
                    disabled={isLoading}
                  >
                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={t("chat_placeholder")}
                    rows={1}
                    className="flex-1 resize-none rounded-2xl border border-input bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring max-h-24"
                    disabled={isLoading}
                  />
                  {("webkitSpeechRecognition" in window || "SpeechRecognition" in window) && (
                    <button
                      onClick={toggleVoice}
                      className={`p-2.5 rounded-xl transition-colors flex-shrink-0 ${listening ? "bg-destructive/10 text-destructive" : "hover:bg-muted/60 text-muted-foreground"}`}
                      disabled={isLoading}
                    >
                      {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                  )}
                  <button
                    onClick={sendMessage}
                    disabled={(!input.trim() && !imageFile) || isLoading || isSending || (isHistoryLoading && !error)}
                    className={`p-3 rounded-xl transition-all ${(!input.trim() && !imageFile) || isLoading || (isHistoryLoading && !error)
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
                      }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
