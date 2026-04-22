import { useState, useRef, useCallback } from "react";
import { User } from "lucide-react";

interface ImageComparisonSliderProps {
  beforeImage: string | null;
  afterImage: string | null;
  beforeLabel?: string;
  afterLabel?: string;
}

export default function ImageComparisonSlider({
  beforeImage,
  afterImage,
  beforeLabel = "Before",
  afterLabel = "After",
}: ImageComparisonSliderProps) {
  const [position, setPosition] = useState(50);
  const [beforeFailed, setBeforeFailed] = useState(false);
  const [afterFailed, setAfterFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const renderFallback = (label: string) => (
    <div className="absolute inset-0 w-full h-full bg-muted/50 flex flex-col items-center justify-center text-muted-foreground">
      <User className="w-9 h-9 mb-2" />
      <span className="text-xs font-medium">{label}</span>
    </div>
  );

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square rounded-3xl overflow-hidden cursor-col-resize select-none touch-none border border-border/40 shadow-card"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* After image (full background) */}
      {afterImage && !afterFailed ? (
        <img
          src={afterImage}
          alt={afterLabel}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
          onError={() => setAfterFailed(true)}
        />
      ) : (
        renderFallback("No Photo")
      )}

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        {beforeImage && !beforeFailed ? (
          <img
            src={beforeImage}
            alt={beforeLabel}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ width: `${containerRef.current?.offsetWidth ?? 400}px` }}
            draggable={false}
            onError={() => setBeforeFailed(true)}
          />
        ) : (
          renderFallback("No Photo")
        )}
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-primary-foreground/90 shadow-lg z-10"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        {/* Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card border-2 border-primary shadow-elevated flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" className="text-primary">
            <path d="M5 3L2 8L5 13" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 3L14 8L11 13" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-card/80 backdrop-blur-sm text-xs font-semibold z-20">
        {beforeLabel}
      </div>
      <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-card/80 backdrop-blur-sm text-xs font-semibold z-20">
        {afterLabel}
      </div>
    </div>
  );
}
