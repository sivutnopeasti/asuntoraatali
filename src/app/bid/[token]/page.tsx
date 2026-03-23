"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { BidForm } from "@/components/bid-form";
import { ImageCarousel } from "@/components/image-carousel";
import { Viewer360 } from "@/components/viewer-360";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, MapPin, Ruler } from "lucide-react";
import type { Project, Task, ProjectImage } from "@/lib/types";

export default function BidPage() {
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("invite_token", token)
        .single();

      if (projectError || !projectData) {
        setError("Projektia ei löytynyt. Tarkista linkki.");
        setLoading(false);
        return;
      }

      if (projectData.status === "closed") {
        setError("Tarjouspyyntö on suljettu.");
        setLoading(false);
        return;
      }

      const [taskResult, imageResult] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("project_id", projectData.id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("project_images")
          .select("*")
          .eq("project_id", projectData.id)
          .order("sort_order", { ascending: true }),
      ]);

      setProject(projectData);
      setTasks(taskResult.data || []);
      setImages(imageResult.data || []);
      setLoading(false);
    }

    load();
  }, [token, supabase]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Ladataan projektin tietoja...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Building2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-bold">Virhe</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) return null;

  const hasImages = images.length > 0;
  const has360 = images.some((img) => img.type === "360");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="container mx-auto flex h-16 items-center px-4">
          <span className="text-lg font-bold">Asuntoräätäli</span>
          <Badge className="ml-3" variant="secondary">
            Tarjouspyyntö
          </Badge>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Tarjouspyyntö</CardTitle>
            <CardDescription>
              Täytä yksikköhinnat alla olevaan taulukkoon. Kokonaissumma
              lasketaan automaattisesti.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{project.address}</span>
              </div>
              {project.total_sqm && (
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  <span>{project.total_sqm} m²</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {hasImages && (
          <div className="mb-8 space-y-6">
            <ImageCarousel images={images} />
            {has360 && <Viewer360 images={images} />}
          </div>
        )}

        <BidForm
          projectId={project.id}
          projectAddress={project.address}
          tasks={tasks}
        />
      </main>
    </div>
  );
}
