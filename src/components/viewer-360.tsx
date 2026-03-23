"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Move, Maximize2, X } from "lucide-react";
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
  getYaw: () => number;
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

function PanoramaView({
  src,
  className = "",
}: {
  src: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PannellumViewer | null>(null);

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
        autoRotate: -2,
        autoRotateInactivityDelay: 3000,
        compass: false,
        showZoomCtrl: true,
        showFullscreenCtrl: false,
        mouseZoom: true,
        draggable: true,
        hfov: 100,
        minHfov: 50,
        maxHfov: 120,
        friction: 0.15,
        yaw: 0,
        pitch: 0,
      });
    });

    return () => {
      cancelled = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [src]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: "300px" }}
    />
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
          className="aspect-[16/9] rounded-lg overflow-hidden"
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
          />
        </div>
      )}
    </>
  );
}
