"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectImage } from "@/lib/types";

interface ImageCarouselProps {
  images: ProjectImage[];
}

export function ImageCarousel({ images }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const photos = images.filter((img) => img.type === "photo");

  if (photos.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed bg-muted/30">
        <div className="text-center text-muted-foreground">
          <Camera className="mx-auto mb-2 h-8 w-8" />
          <p>Ei kuvia</p>
        </div>
      </div>
    );
  }

  function goTo(index: number) {
    if (index < 0) setCurrentIndex(photos.length - 1);
    else if (index >= photos.length) setCurrentIndex(0);
    else setCurrentIndex(index);
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-lg bg-black">
        <div className="relative aspect-[16/9]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[currentIndex].url}
            alt={photos[currentIndex].caption || `Kuva ${currentIndex + 1}`}
            className="h-full w-full object-contain"
          />

          {photos.length > 1 && (
            <>
              <button
                onClick={() => goTo(currentIndex - 1)}
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={() => goTo(currentIndex + 1)}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <button
            onClick={() => setFullscreen(true)}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/50 px-3 py-1">
            <span className="text-sm text-white">
              {currentIndex + 1} / {photos.length}
            </span>
          </div>
        </div>

        {photos[currentIndex].caption && (
          <div className="bg-black/80 px-4 py-2 text-sm text-white">
            {photos[currentIndex].caption}
          </div>
        )}

        {photos.length > 1 && (
          <div className="flex gap-1 overflow-x-auto bg-black/90 p-2">
            {photos.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setCurrentIndex(i)}
                className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded transition ${
                  i === currentIndex
                    ? "ring-2 ring-white"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`Pikkukuva ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black">
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 text-white hover:bg-white/20"
            onClick={() => setFullscreen(false)}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[currentIndex].url}
            alt={photos[currentIndex].caption || ""}
            className="max-h-[90vh] max-w-[95vw] object-contain"
          />

          {photos.length > 1 && (
            <>
              <button
                onClick={() => goTo(currentIndex - 1)}
                className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                onClick={() => goTo(currentIndex + 1)}
                className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-white">
            {currentIndex + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}
