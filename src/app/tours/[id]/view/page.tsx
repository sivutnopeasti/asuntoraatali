"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { VirtualTour } from "@/components/virtual-tour";
import { Home } from "lucide-react";
import type { Project, Room, RoomHotspot, RoomWithHotspots } from "@/lib/types";

export default function TourViewPage() {
  const params = useParams();
  const projectId = params.id as string;
  const supabase = createClient();

  const [project, setProject] = useState<Project | null>(null);
  const [roomsWithHotspots, setRoomsWithHotspots] = useState<
    RoomWithHotspots[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (!projectData) {
        setError("Kierrosta ei löytynyt");
        setLoading(false);
        return;
      }

      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true });

      const rooms = (roomData || []) as Room[];
      const roomIds = rooms.map((r) => r.id);

      let hotspotData: RoomHotspot[] = [];
      if (roomIds.length > 0) {
        const { data } = await supabase
          .from("room_hotspots")
          .select("*")
          .in("room_id", roomIds);
        hotspotData = (data as RoomHotspot[]) || [];
      }

      const withHotspots: RoomWithHotspots[] = rooms.map((room) => ({
        ...room,
        room_hotspots: hotspotData.filter((hs) => hs.room_id === room.id),
      }));

      setProject(projectData);
      setRoomsWithHotspots(withHotspots);
      setLoading(false);
    }

    load();
  }, [projectId, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-white/60">Ladataan kierrosta...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <Home className="mx-auto mb-4 h-12 w-12 text-white/40" />
          <p className="text-lg text-white/60">{error || "Virhe"}</p>
        </div>
      </div>
    );
  }

  const validRooms = roomsWithHotspots.filter(
    (r) => r.original_image_url || r.visualized_image_url
  );

  if (validRooms.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center">
          <Home className="mx-auto mb-4 h-12 w-12 text-white/40" />
          <p className="text-lg text-white/60">
            Tähän kierrokseen ei ole vielä lisätty kuvia
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <VirtualTour
        rooms={roomsWithHotspots}
        projectAddress={project.address}
      />
    </div>
  );
}
