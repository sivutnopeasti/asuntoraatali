"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Home, Eye, Pencil, Loader2 } from "lucide-react";
import type { Project, Room } from "@/lib/types";

interface ProjectWithRooms extends Project {
  rooms: Room[];
}

export default function ToursPage() {
  const supabase = createClient();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithRooms[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      router.push("/login");
      return;
    }

    const { data: projectData } = await supabase
      .from("projects")
      .select("*")
      .eq("owner_id", user.user.id)
      .order("created_at", { ascending: false });

    if (!projectData) {
      setLoading(false);
      return;
    }

    const projectIds = projectData.map((p) => p.id);
    const { data: roomData } = await supabase
      .from("rooms")
      .select("*")
      .in("project_id", projectIds)
      .order("sort_order", { ascending: true });

    const projectsWithRooms: ProjectWithRooms[] = projectData.map((p) => ({
      ...p,
      rooms: (roomData || []).filter((r) => r.project_id === p.id),
    }));

    setProjects(projectsWithRooms);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Virtuaalikierrokset</h1>
            <p className="mt-1 text-muted-foreground">
              Hallinnoi projektien 360° virtuaalikierroksia
            </p>
          </div>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Home className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">
                Ei projekteja
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Luo ensin projekti, jonka jälkeen voit lisätä siihen
                virtuaalikierroksen
              </p>
              <Button onClick={() => router.push("/projects/new")}>
                <Plus className="mr-2 h-4 w-4" />
                Luo projekti
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const roomCount = project.rooms.length;
              const hasImages = project.rooms.some(
                (r) => r.original_image_url || r.visualized_image_url
              );
              const thumbRoom = project.rooms.find(
                (r) => r.visualized_image_url || r.original_image_url
              );
              const thumbUrl =
                thumbRoom?.visualized_image_url ||
                thumbRoom?.original_image_url;

              return (
                <Card key={project.id} className="overflow-hidden">
                  {thumbUrl ? (
                    <div className="aspect-video overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumbUrl}
                        alt={project.address}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-muted">
                      <Home className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">
                      {project.address}
                    </CardTitle>
                    <CardDescription>
                      {roomCount} {roomCount === 1 ? "huone" : "huonetta"}
                      {hasImages ? " — kuvia ladattu" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() =>
                          router.push(`/tours/${project.id}`)
                        }
                      >
                        <Pencil className="mr-1 h-3.5 w-3.5" />
                        Muokkaa
                      </Button>
                      {hasImages && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            router.push(`/tours/${project.id}/view`)
                          }
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Katso
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
