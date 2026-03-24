"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Move, Maximize2, X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectImage } from "@/lib/types";

declare global {
  interface Window {
    pannellum: {
      viewer: (
        container: HTMLElement,
        config: Record<string, unknown>
      ) => PannellumViewer;
    };
  }
}

interface PannellumViewer {
  destroy: () => void;
  getHfov: () => number;
  setHfov: (hfov: number) => void;
  getPitch: () => number;
  setPitch: (pitch: number) => void;
  getYaw: () => number;
  setYaw: (yaw: number) => void;
}

let pannellumLoaded = false;
let pannellumLoading: Promise<void> | null = null;

function loadPannellum(): Promise<void> {
  if (pannellumLoaded && window.pannellum) return Promise.resolve();
  if (pannellumLoading) return pannellumLoading;

  pannellumLoading = new Promise<void>((resolve) => {
    if (!document.getElementById("pannellum-css")) {
      const link = document.createElement("link");
      link.id = "pannellum-css";
      link.rel = "stylesheet";
      link.href =
        "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
      document.head.appendChild(link);
    }

    if (window.pannellum) {
      pannellumLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = "pannellum-js";
    script.src =
      "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
    script.onload = () => {
      pannellumLoaded = true;
      resolve();
    };
    document.head.appendChild(script);
  });

  return pannellumLoading;
}

interface PanoramaViewProps {
  src: string;
  className?: string;
  showControls?: boolean;
  initialPitch?: number;
  initialHfov?: number;
  onSettingsChange?: (pitch: number, hfov: number) => void;
}

function PanoramaView({
  src,
  className = "",
  showControls = false,
  initialPitch = 0,
  initialHfov = 90,
  onSettingsChange,
}: PanoramaViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PannellumViewer | null>(null);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [pitch, setPitch] = useState(initialPitch);
  const [hfov, setHfov] = useState(initialHfov);

  useEffect(() => {
    let cancelled = false;

    loadPannellum().then(() => {
      if (cancelled || !containerRef.current || !window.pannellum) return;

      if (viewerRef.current) {
        viewerRef.current.destroy();
      }

      viewerRef.current = window.pannellum.viewer(containerRef.current, {
        type: "equirectangular",
        panorama: src,
        autoLoad: true,
        autoRotate: false,
        compass: false,
        showZoomCtrl: false,
        showFullscreenCtrl: false,
        mouseZoom: true,
        draggable: true,
        hfov: initialHfov,
        minHfov: 30,
        maxHfov: 120,
        friction: 0.15,
        yaw: 0,
        pitch: initialPitch,
        minPitch: -90,
        maxPitch: 90,
      });
    });

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [src, initialPitch, initialHfov]);

  const handlePitchChange = useCallback(
    (value: number) => {
      setPitch(value);
      if (viewerRef.current) {
        viewerRef.current.setPitch(value);
      }
      onSettingsChange?.(value, hfov);
    },
    [hfov, onSettingsChange]
  );

  const handleHfovChange = useCallback(
    (value: number) => {
      setHfov(value);
      if (viewerRef.current) {
        viewerRef.current.setHfov(value);
      }
      onSettingsChange?.(pitch, value);
    },
    [pitch, onSettingsChange]
  );

  const resetDefaults = useCallback(() => {
    handlePitchChange(0);
    handleHfovChange(90);
  }, [handlePitchChange, handleHfovChange]);

  return (
    <div className={`relative ${className}`} style={{ minHeight: "300px" }}>
      <div ref={containerRef} className="absolute inset-0" />

      {showControls && (
        <>
          <button
            onClick={() => setControlsOpen((v) => !v)}
            className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white transition hover:bg-black/80"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Säädöt
          </button>

          {controlsOpen && (
            <div className="absolute left-3 top-12 z-10 w-64 rounded-xl bg-black/80 p-4 backdrop-blur-sm">
              <div className="space-y-4">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-medium text-white/90">
                      Horisontti (pitch)
                    </label>
                    <span className="text-xs tabular-nums text-white/60">
                      {pitch > 0 ? "+" : ""}
                      {pitch}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-45}
                    max={45}
                    step={0.5}
                    value={pitch}
                    onChange={(e) =>
                      handlePitchChange(parseFloat(e.target.value))
                    }
                    className="slider w-full"
                  />
                  <div className="mt-0.5 flex justify-between text-[10px] text-white/40">
                    <span>-45°</span>
                    <span>0°</span>
                    <span>+45°</span>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-xs font-medium text-white/90">
                      Kuvakulma (FOV)
                    </label>
                    <span className="text-xs tabular-nums text-white/60">
                      {hfov}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={120}
                    step={1}
                    value={hfov}
                    onChange={(e) =>
                      handleHfovChange(parseFloat(e.target.value))
                    }
                    className="slider w-full"
                  />
                  <div className="mt-0.5 flex justify-between text-[10px] text-white/40">
                    <span>30° (lähelle)</span>
                    <span>120° (laaja)</span>
                  </div>
                </div>

                <button
                  onClick={resetDefaults}
                  className="w-full rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20"
                >
                  Palauta oletukset
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function Viewer360({ images }: { images: ProjectImage[] }) {
  const panoramas = images.filter((img) => img.type === "360");
  const [activeIndex, setActiveIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  useEffect(() => {
    if (!fullscreen) return;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeFullscreen();
    }
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen, closeFullscreen]);

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
          className="aspect-[2/1] max-h-[400px] rounded-lg overflow-hidden"
          showControls
        />

        {panoramas[activeIndex].caption && (
          <p className="text-sm text-muted-foreground">
            {panoramas[activeIndex].caption}
          </p>
        )}

        {panoramas.length > 1 && (
          <div className="flex gap-2 flex-wrap">
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
            onClick={closeFullscreen}
          >
            <X className="h-6 w-6" />
          </Button>
          <PanoramaView
            src={panoramas[activeIndex].url}
            className="h-full w-full"
            showControls
          />
        </div>
      )}
    </>
  );
}
