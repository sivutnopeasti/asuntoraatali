"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Move, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectImage } from "@/lib/types";

interface Viewer360Props {
  images: ProjectImage[];
}

function PanoramaView({
  src,
  className = "",
}: {
  src: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      posStart.current = { x: position.x, y: position.y };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [position]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({
        x: posStart.current.x + dx * 0.3,
        y: Math.max(-60, Math.min(60, posStart.current.y + dy * 0.3)),
      });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ cursor: isDragging ? "grabbing" : "grab" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${src})`,
          backgroundSize: "200% 100%",
          backgroundPosition: `${50 - position.x}% ${50 - position.y}%`,
          backgroundRepeat: "repeat-x",
          transition: isDragging ? "none" : "background-position 0.1s ease-out",
        }}
      />
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs text-white">
        <Move className="h-3 w-3" />
        Raahaa kääntääksesi
      </div>
    </div>
  );
}

export function Viewer360({ images }: Viewer360Props) {
  const panoramas = images.filter((img) => img.type === "360");
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  if (panoramas.length === 0) return null;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Move className="h-4 w-4" />
            360° Kuvat ({panoramas.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFullscreen(true)}
          >
            <Maximize2 className="mr-1 h-3 w-3" />
            Koko näyttö
          </Button>
        </div>

        <PanoramaView
          src={panoramas[activeIndex].url}
          className="aspect-[16/9] rounded-lg"
        />

        {panoramas[activeIndex].caption && (
          <p className="text-sm text-muted-foreground">
            {panoramas[activeIndex].caption}
          </p>
        )}

        {panoramas.length > 1 && (
          <div className="flex gap-2">
            {panoramas.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setActiveIndex(i)}
                className={`rounded-md border px-3 py-1.5 text-xs transition ${
                  i === activeIndex
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                {img.caption || `360° #${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-[100] bg-black">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10 text-white hover:bg-white/20"
            onClick={() => setFullscreen(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          <PanoramaView
            src={panoramas[activeIndex].url}
            className="h-full w-full"
          />
        </div>
      )}
    </>
  );
}
