"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, X, Image as ImageIcon, Move, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ImageType } from "@/lib/types";

interface UploadedImage {
  url: string;
  type: ImageType;
  caption: string;
}

interface ImageUploaderProps {
  projectId: string;
  onUploadComplete?: () => void;
}

export function ImageUploader({ projectId, onUploadComplete }: ImageUploaderProps) {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState<UploadedImage[]>([]);
  const [uploadType, setUploadType] = useState<ImageType>("photo");

  async function uploadToImgBB(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) return data.url;
      toast.error(data.error || "Kuvan lataus epäonnistui");
      return null;
    } catch {
      toast.error("Yhteysvirhe kuvan latauksessa");
      return null;
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} ei ole kuvatiedosto`);
        continue;
      }

      if (file.size > 32 * 1024 * 1024) {
        toast.error(`${file.name} on liian suuri (max 32MB)`);
        continue;
      }

      const url = await uploadToImgBB(file);
      if (url) {
        setPendingImages((prev) => [
          ...prev,
          { url, type: uploadType, caption: "" },
        ]);
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateCaption(index: number, caption: string) {
    setPendingImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, caption } : img))
    );
  }

  function removeImage(index: number) {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveImages() {
    if (pendingImages.length === 0) return;
    setUploading(true);

    try {
      const inserts = pendingImages.map((img, i) => ({
        project_id: projectId,
        url: img.url,
        type: img.type,
        caption: img.caption || null,
        sort_order: i,
      }));

      const { error } = await supabase.from("project_images").insert(inserts);
      if (error) throw error;

      setPendingImages([]);
      toast.success(`${inserts.length} kuvaa tallennettu!`);
      onUploadComplete?.();
    } catch {
      toast.error("Kuvien tallennus epäonnistui");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Lisää kuvia</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={uploadType === "photo" ? "default" : "outline"}
            size="sm"
            onClick={() => setUploadType("photo")}
          >
            <ImageIcon className="mr-1 h-4 w-4" />
            Valokuva
          </Button>
          <Button
            type="button"
            variant={uploadType === "360" ? "default" : "outline"}
            size="sm"
            onClick={() => setUploadType("360")}
          >
            <Move className="mr-1 h-4 w-4" />
            360° kuva
          </Button>
        </div>

        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition hover:border-primary hover:bg-muted/30"
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">
            {uploading
              ? "Ladataan..."
              : `Klikkaa ladataksesi ${uploadType === "360" ? "360°" : ""} kuvia`}
          </p>
          <p className="text-xs text-muted-foreground">JPG, PNG, WebP (max 32MB)</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={uploading}
        />

        {pendingImages.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              Ladatut kuvat ({pendingImages.length})
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative rounded-lg border p-2">
                  <div className="relative aspect-video overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={`Ladattu ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute right-1 top-1 flex gap-1">
                      <span className="rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                        {img.type === "360" ? "360°" : "Kuva"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Input
                      placeholder="Kuvateksti (valinnainen)"
                      value={img.caption}
                      onChange={(e) => updateCaption(i, e.target.value)}
                      className="text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeImage(i)}
                    >
                      <X className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              onClick={saveImages}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? "Tallennetaan..." : `Tallenna ${pendingImages.length} kuvaa`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
