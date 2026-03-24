"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Maximize2, X, Eye, Paintbrush, Home } from "lucide-react";
import type { RoomWithHotspots } from "@/lib/types";

interface PannellumMultiViewer {
  destroy: () => void;
  getScene: () => string;
  loadScene: (sceneId: string, pitch?: number, yaw?: number, hfov?: number) => void;
  on: (event: string, callback: () => void) => void;
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

    const existing = document.getElementById("pannellum-js");
    if (existing) {
      const check = setInterval(() => {
        if (window.pannellum) {
          pannellumLoaded = true;
          clearInterval(check);
          resolve();
        }
      }, 50);
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

interface VirtualTourProps {
  rooms: RoomWithHotspots[];
  projectAddress?: string;
}

export function VirtualTour({ rooms, projectAddress }: VirtualTourProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PannellumMultiViewer | null>(null);
  const [currentRoom, setCurrentRoom] = useState<string>("");
  const [viewMode, setViewMode] = useState<"original" | "visualized">("visualized");
  const [fullscreen, setFullscreen] = useState(false);

  const validRooms = rooms.filter(
    (r) => r.original_image_url || r.visualized_image_url
  );

  const buildScenes = useCallback(
    (mode: "original" | "visualized") => {
      const scenes: Record<string, Record<string, unknown>> = {};

      for (const room of validRooms) {
        const panorama =
          mode === "visualized" && room.visualized_image_url
            ? room.visualized_image_url
            : room.original_image_url || room.visualized_image_url;

        if (!panorama) continue;

        const hotSpots = room.room_hotspots
          .filter((hs) => validRooms.some((r) => r.id === hs.target_room_id))
          .map((hs) => ({
            pitch: Number(hs.pitch),
            yaw: Number(hs.yaw),
            type: "scene" as const,
            text: hs.label || validRooms.find((r) => r.id === hs.target_room_id)?.name || "",
            sceneId: hs.target_room_id,
            cssClass: "custom-hotspot",
          }));

        scenes[room.id] = {
          type: "equirectangular",
          panorama,
          hotSpots,
          autoLoad: true,
          showZoomCtrl: false,
          showFullscreenCtrl: false,
          compass: false,
          hfov: 90,
          minHfov: 40,
          maxHfov: 110,
          autoRotate: false,
        };
      }

      return scenes;
    },
    [validRooms]
  );

  const initViewer = useCallback(
    (container: HTMLElement, mode: "original" | "visualized") => {
      const scenes = buildScenes(mode);
      if (Object.keys(scenes).length === 0) return null;

      const firstRoomId = validRooms[0]?.id;
      if (!firstRoomId) return null;

      return window.pannellum.viewer(container, {
        default: {
          firstScene: currentRoom || firstRoomId,
          sceneFadeDuration: 500,
        },
        scenes,
      }) as unknown as PannellumMultiViewer;
    },
    [buildScenes, validRooms, currentRoom]
  );

  useEffect(() => {
    if (validRooms.length === 0) return;

    let cancelled = false;

    loadPannellum().then(() => {
      if (cancelled || !containerRef.current || !window.pannellum) return;

      if (viewerRef.current) {
        try {
          const scene = viewerRef.current.getScene();
          setCurrentRoom(scene);
        } catch { /* ignore */ }
        viewerRef.current.destroy();
      }

      const viewer = initViewer(containerRef.current, viewMode);
      if (viewer) {
        viewerRef.current = viewer;
        viewer.on("scenechange", () => {
          try {
            setCurrentRoom(viewer.getScene());
          } catch { /* ignore */ }
        });
        if (!currentRoom) {
          setCurrentRoom(validRooms[0].id);
        }
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, validRooms.length]);

  useEffect(() => {
    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  const navigateToRoom = useCallback((roomId: string) => {
    if (viewerRef.current) {
      try {
        viewerRef.current.loadScene(roomId);
        setCurrentRoom(roomId);
      } catch { /* ignore */ }
    }
  }, []);

  const toggleFullscreen = useCallback(() => setFullscreen((v) => !v), []);

  useEffect(() => {
    if (!fullscreen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  if (validRooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center">
        <Home className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">Ei huoneita</p>
        <p className="text-sm text-muted-foreground">
          Lisää huoneita ja 360-kuvia kierroksen luomiseksi
        </p>
      </div>
    );
  }

  const currentRoomData = validRooms.find((r) => r.id === currentRoom);
  const hasVisualized = validRooms.some((r) => r.visualized_image_url);

  const tourContent = (
    <div className={fullscreen ? "fixed inset-0 z-[100] bg-black" : ""}>
      <div
        className={
          fullscreen
            ? "relative h-full w-full"
            : "relative overflow-hidden rounded-xl border"
        }
      >
        <div
          ref={containerRef}
          className={fullscreen ? "h-full w-full" : "aspect-[2/1] max-h-[500px] w-full"}
          style={{ minHeight: fullscreen ? "100%" : "350px" }}
        />

        {/* Top bar */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex items-start justify-between p-3">
          <div className="pointer-events-auto flex flex-col gap-2">
            {projectAddress && (
              <span className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
                {projectAddress}
              </span>
            )}
            {currentRoomData && (
              <span className="rounded-lg bg-black/60 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
                {currentRoomData.name}
              </span>
            )}
          </div>

          <div className="pointer-events-auto flex gap-2">
            {hasVisualized && (
              <div className="flex overflow-hidden rounded-lg bg-black/60 backdrop-blur-sm">
                <button
                  onClick={() => setViewMode("original")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === "original"
                      ? "bg-white/20 text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Nykyinen
                </button>
                <button
                  onClick={() => setViewMode("visualized")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition ${
                    viewMode === "visualized"
                      ? "bg-white/20 text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Paintbrush className="h-3.5 w-3.5" />
                  Remontoitu
                </button>
              </div>
            )}
            <button
              onClick={toggleFullscreen}
              className="rounded-lg bg-black/60 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/80"
            >
              {fullscreen ? <X className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Room navigation bar */}
        {validRooms.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-10 flex gap-1 overflow-x-auto bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
            {validRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => navigateToRoom(room.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  room.id === currentRoom
                    ? "bg-white text-black"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {room.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return tourContent;
}
