"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  Upload,
  Loader2,
  Image as ImageIcon,
  Paintbrush,
  Target,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import type { Room, RoomHotspot } from "@/lib/types";

interface TourEditorProps {
  projectId: string;
  rooms: Room[];
  hotspots: RoomHotspot[];
  onUpdate: () => void;
}

function compressImage(file: File, maxSizeMB = 25): Promise<File> {
  return new Promise((resolve) => {
    if (file.size <= maxSizeMB * 1024 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, img.width, img.height);

      let quality = 0.95;
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return; }
            if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.7) {
              quality -= 0.05;
              tryCompress();
            } else {
              resolve(new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() }));
            }
          },
          "image/jpeg",
          quality
        );
      };
      tryCompress();
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

async function uploadToImgBB(file: File): Promise<string | null> {
  try {
    toast.info("Pakataan kuvaa...");
    const compressed = await compressImage(file);

    const formData = new FormData();
    formData.append("image", compressed);

    let apiKey: string | null = null;
    try {
      const keyRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "X-Get-Key": "1" },
      });
      const keyData = await keyRes.json();
      apiKey = keyData.key;
    } catch { /* ignore */ }

    if (apiKey) {
      const imgbbForm = new FormData();
      imgbbForm.append("key", apiKey);
      imgbbForm.append("image", compressed);
      const res = await fetch("https://api.imgbb.com/1/upload", {
        method: "POST",
        body: imgbbForm,
      });
      const data = await res.json();
      if (data?.data?.url) return data.data.url;
    }

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      toast.error("Kuva on liian suuri. Pienennä kuvaa ensin.");
      return null;
    }
    if (data.url) return data.url;
    toast.error(data.error || "Kuvan lataus epäonnistui");
    return null;
  } catch {
    toast.error("Yhteysvirhe kuvan latauksessa");
    return null;
  }
}

function RoomCard({
  room,
  allRooms,
  hotspots,
  onUpdate,
  onDelete,
}: {
  room: Room;
  allRooms: Room[];
  hotspots: RoomHotspot[];
  onUpdate: () => void;
  onDelete: () => void;
}) {
  const supabase = createClient();
  const [uploading, setUploading] = useState<"original" | "visualized" | null>(null);
  const [addingHotspot, setAddingHotspot] = useState(false);
  const [hotspotTarget, setHotspotTarget] = useState("");
  const [hotspotPitch, setHotspotPitch] = useState("0");
  const [hotspotYaw, setHotspotYaw] = useState("0");
  const originalInputRef = useRef<HTMLInputElement>(null);
  const visualizedInputRef = useRef<HTMLInputElement>(null);

  const roomHotspots = hotspots.filter((hs) => hs.room_id === room.id);
  const otherRooms = allRooms.filter((r) => r.id !== room.id);

  async function handleImageUpload(
    file: File,
    type: "original" | "visualized"
  ) {
    setUploading(type);
    const url = await uploadToImgBB(file);
    if (url) {
      const field =
        type === "original" ? "original_image_url" : "visualized_image_url";
      const { error } = await supabase
        .from("rooms")
        .update({ [field]: url })
        .eq("id", room.id);
      if (error) {
        toast.error("Kuvan tallennus epäonnistui");
      } else {
        toast.success(
          `${type === "original" ? "Alkuperäinen" : "Visualisoitu"} kuva ladattu`
        );
        onUpdate();
      }
    }
    setUploading(null);
  }

  async function addHotspot() {
    if (!hotspotTarget) {
      toast.error("Valitse kohdehuone");
      return;
    }
    const targetRoom = allRooms.find((r) => r.id === hotspotTarget);
    const { error } = await supabase.from("room_hotspots").insert({
      room_id: room.id,
      target_room_id: hotspotTarget,
      pitch: parseFloat(hotspotPitch) || 0,
      yaw: parseFloat(hotspotYaw) || 0,
      label: targetRoom?.name || null,
    });
    if (error) {
      toast.error("Hotspotin lisäys epäonnistui");
    } else {
      toast.success("Hotspot lisätty");
      setAddingHotspot(false);
      setHotspotTarget("");
      setHotspotPitch("0");
      setHotspotYaw("0");
      onUpdate();
    }
  }

  async function deleteHotspot(id: string) {
    const { error } = await supabase
      .from("room_hotspots")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Hotspotin poisto epäonnistui");
    } else {
      onUpdate();
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{room.name}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image uploads */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Original image */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs">
              <ImageIcon className="h-3.5 w-3.5" />
              Alkuperäinen 360°
            </Label>
            {room.original_image_url ? (
              <div className="relative aspect-video overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={room.original_image_url}
                  alt="Alkuperäinen"
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => originalInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/40"
                >
                  <span className="rounded bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition hover:opacity-100">
                    Vaihda
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => originalInputRef.current?.click()}
                disabled={uploading === "original"}
                className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border-2 border-dashed transition hover:border-primary hover:bg-muted/30"
              >
                {uploading === "original" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Lataa alkuperäinen
                    </span>
                  </>
                )}
              </button>
            )}
            <input
              ref={originalInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f, "original");
                e.target.value = "";
              }}
            />
          </div>

          {/* Visualized image */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5 text-xs">
              <Paintbrush className="h-3.5 w-3.5" />
              Remontoitu (Gemini)
            </Label>
            {room.visualized_image_url ? (
              <div className="relative aspect-video overflow-hidden rounded-lg border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={room.visualized_image_url}
                  alt="Visualisoitu"
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => visualizedInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/40"
                >
                  <span className="rounded bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition hover:opacity-100">
                    Vaihda
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => visualizedInputRef.current?.click()}
                disabled={uploading === "visualized"}
                className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border-2 border-dashed transition hover:border-primary hover:bg-muted/30"
              >
                {uploading === "visualized" ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="mb-1 h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Lataa visualisoitu
                    </span>
                  </>
                )}
              </button>
            )}
            <input
              ref={visualizedInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f, "visualized");
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {/* Hotspots */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-xs">
              <Target className="h-3.5 w-3.5" />
              Hotspotit ({roomHotspots.length})
            </Label>
            {otherRooms.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddingHotspot(!addingHotspot)}
                className="h-7 text-xs"
              >
                <Plus className="mr-1 h-3 w-3" />
                Lisää
              </Button>
            )}
          </div>

          {roomHotspots.map((hs) => {
            const target = allRooms.find((r) => r.id === hs.target_room_id);
            return (
              <div
                key={hs.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2"
              >
                <div className="text-sm">
                  <span className="font-medium">
                    → {target?.name || "Tuntematon"}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    pitch: {hs.pitch}°, yaw: {hs.yaw}°
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => deleteHotspot(hs.id)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            );
          })}

          {addingHotspot && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div>
                <Label className="text-xs">Kohdehuone</Label>
                <Select value={hotspotTarget} onValueChange={setHotspotTarget}>
                  <SelectTrigger>
                    <SelectValue placeholder="Valitse huone" />
                  </SelectTrigger>
                  <SelectContent>
                    {otherRooms.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">
                    Pitch (pystykulma, -90...90)
                  </Label>
                  <Input
                    type="number"
                    value={hotspotPitch}
                    onChange={(e) => setHotspotPitch(e.target.value)}
                    min="-90"
                    max="90"
                    step="5"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    Yaw (vaakakulma, -180...180)
                  </Label>
                  <Input
                    type="number"
                    value={hotspotYaw}
                    onChange={(e) => setHotspotYaw(e.target.value)}
                    min="-180"
                    max="180"
                    step="5"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Vinkki: Avaa esikatselu, katso mihin suuntaan hotspot pitäisi
                tulla, ja säädä pitch/yaw -arvot. Yaw 0° = eteenpäin, 90° =
                oikealle, -90° = vasemmalle. Pitch 0° = suoraan eteenpäin,
                negatiivinen = alas.
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={addHotspot}>
                  Lisää hotspot
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAddingHotspot(false)}
                >
                  Peruuta
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function TourEditor({
  projectId,
  rooms,
  hotspots,
  onUpdate,
}: TourEditorProps) {
  const supabase = createClient();
  const [newRoomName, setNewRoomName] = useState("");
  const [adding, setAdding] = useState(false);

  async function addRoom() {
    const name = newRoomName.trim();
    if (!name) {
      toast.error("Anna huoneen nimi");
      return;
    }
    setAdding(true);
    const { error } = await supabase.from("rooms").insert({
      project_id: projectId,
      name,
      sort_order: rooms.length,
    });
    if (error) {
      toast.error("Huoneen lisäys epäonnistui");
    } else {
      toast.success(`${name} lisätty`);
      setNewRoomName("");
      onUpdate();
    }
    setAdding(false);
  }

  async function deleteRoom(roomId: string) {
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);
    if (error) {
      toast.error("Huoneen poisto epäonnistui");
    } else {
      toast.success("Huone poistettu");
      onUpdate();
    }
  }

  return (
    <div className="space-y-4">
      {/* Add room */}
      <Card>
        <CardContent className="flex items-end gap-3 pt-6">
          <div className="flex-1">
            <Label htmlFor="newRoom">Lisää huone</Label>
            <Input
              id="newRoom"
              placeholder="esim. Olohuone, Keittiö, Makuuhuone..."
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addRoom()}
            />
          </div>
          <Button onClick={addRoom} disabled={adding}>
            {adding ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Lisää
          </Button>
        </CardContent>
      </Card>

      {/* Room list */}
      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          allRooms={rooms}
          hotspots={hotspots}
          onUpdate={onUpdate}
          onDelete={() => deleteRoom(room.id)}
        />
      ))}
    </div>
  );
}
