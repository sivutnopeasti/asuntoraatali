"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/navbar";
import { TourEditor } from "@/components/tour-editor";
import { VirtualTour } from "@/components/virtual-tour";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Pencil, Eye, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import type { Project, Room, RoomHotspot, RoomWithHotspots } from "@/lib/types";

export default function TourEditPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hotspots, setHotspots] = useState<RoomHotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    const { data: projectData } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (!projectData) {
      toast.error("Projektia ei löytynyt");
      router.push("/tours");
      return;
    }

    const { data: roomData } = await supabase
      .from("rooms")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });

    const roomIds = (roomData || []).map((r) => r.id);
    let hotspotData: RoomHotspot[] = [];
    if (roomIds.length > 0) {
      const { data } = await supabase
        .from("room_hotspots")
        .select("*")
        .in("room_id", roomIds);
      hotspotData = (data as RoomHotspot[]) || [];
    }

    setProject(projectData);
    setRooms(roomData || []);
    setHotspots(hotspotData);
    setLoading(false);
  }, [projectId, router, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function copyShareLink() {
    const url = `${window.location.origin}/tours/${projectId}/view`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Linkki kopioitu!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading || !project) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Ladataan...</p>
        </main>
      </>
    );
  }

  const roomsWithHotspots: RoomWithHotspots[] = rooms.map((room) => ({
    ...room,
    room_hotspots: hotspots.filter((hs) => hs.room_id === room.id),
  }));

  const hasViewableContent = rooms.some(
    (r) => r.original_image_url || r.visualized_image_url
  );

  return (
    <>
      <Navbar />
      <main className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/tours")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{project.address}</h1>
              <p className="text-sm text-muted-foreground">
                Virtuaalikierroksen muokkaus
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {hasViewableContent && (
              <>
                <Button variant="outline" size="sm" onClick={copyShareLink}>
                  {copied ? (
                    <Check className="mr-1 h-3.5 w-3.5" />
                  ) : (
                    <Share2 className="mr-1 h-3.5 w-3.5" />
                  )}
                  Jaa linkki
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/tours/${projectId}/view`)}
                >
                  <Eye className="mr-1 h-3.5 w-3.5" />
                  Esikatselu
                </Button>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="edit" className="space-y-6">
          <TabsList>
            <TabsTrigger value="edit" className="gap-2">
              <Pencil className="h-4 w-4" />
              Muokkaa
            </TabsTrigger>
            {hasViewableContent && (
              <TabsTrigger value="preview" className="gap-2">
                <Eye className="h-4 w-4" />
                Esikatselu
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="edit">
            <TourEditor
              projectId={projectId}
              rooms={rooms}
              hotspots={hotspots}
              onUpdate={loadData}
            />
          </TabsContent>

          {hasViewableContent && (
            <TabsContent value="preview">
              <VirtualTour
                rooms={roomsWithHotspots}
                projectAddress={project.address}
              />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </>
  );
}
