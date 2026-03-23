"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/navbar";
import { ComparisonMatrix } from "@/components/comparison-matrix";
import { ImageCarousel } from "@/components/image-carousel";
import { Viewer360 } from "@/components/viewer-360";
import { ImageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  Check,
  MapPin,
  Ruler,
  Link2,
  ClipboardList,
  BarChart3,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  TASK_CATEGORIES,
  UNIT_LABELS,
  type Project,
  type Task,
  type BidWithItems,
  type ProjectImage,
  type Material,
} from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Luonnos",
  bidding: "Tarjouspyyntö",
  closed: "Suljettu",
};

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "secondary",
  bidding: "default",
  closed: "outline",
};

function getCategoryLabel(value: string): string {
  return TASK_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const supabase = createClient();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bids, setBids] = useState<BidWithItems[]>([]);
  const [images, setImages] = useState<ProjectImage[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    const { data: projectData, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError || !projectData) {
      toast.error("Projektia ei löytynyt");
      router.push("/");
      return;
    }

    const [taskResult, bidResult, imageResult, materialResult] = await Promise.all([
      supabase
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("bids")
        .select("*, bid_items(*)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      supabase
        .from("project_images")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true }),
      supabase.from("materials").select("*"),
    ]);

    setProject(projectData);
    setTasks(taskResult.data || []);
    setBids((bidResult.data as BidWithItems[]) || []);
    setImages(imageResult.data || []);
    setMaterials(materialResult.data || []);
    setLoading(false);
  }, [projectId, router, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function updateStatus(newStatus: string) {
    const { error } = await supabase
      .from("projects")
      .update({ status: newStatus })
      .eq("id", projectId);

    if (error) {
      toast.error("Statuksen päivitys epäonnistui");
      return;
    }

    setProject((prev) =>
      prev ? { ...prev, status: newStatus as Project["status"] } : null
    );
    toast.success(`Status päivitetty: ${STATUS_LABELS[newStatus]}`);
  }

  function copyInviteLink() {
    if (!project) return;
    const url = `${window.location.origin}/bid/${project.invite_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Kutsulinkkii kopioitu leikepöydälle!");
    setTimeout(() => setCopied(false), 2000);
  }

  function getMaterialName(materialId: string | null): string | null {
    if (!materialId) return null;
    const mat = materials.find((m) => m.id === materialId);
    return mat ? `${mat.name} (${mat.manufacturer || ""})` : null;
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-20">
            <p className="text-muted-foreground">Ladataan...</p>
          </div>
        </main>
      </>
    );
  }

  if (!project) return null;

  const submittedBids = bids.filter((b) => b.status === "submitted");
  const hasImages = images.length > 0;
  const has360 = images.some((img) => img.type === "360");

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{project.address}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{project.address}</span>
                </div>
                {project.total_sqm && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Ruler className="h-4 w-4" />
                    <span>{project.total_sqm} m²</span>
                  </div>
                )}
                <Badge variant={STATUS_VARIANTS[project.status]}>
                  {STATUS_LABELS[project.status]}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {project.status === "draft" && (
                <Button onClick={() => updateStatus("bidding")}>
                  Avaa tarjouspyyntö
                </Button>
              )}
              {project.status === "bidding" && (
                <Button
                  variant="outline"
                  onClick={() => updateStatus("closed")}
                >
                  Sulje tarjouspyyntö
                </Button>
              )}
              <Button variant="outline" onClick={copyInviteLink}>
                {copied ? (
                  <Check className="mr-2 h-4 w-4" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                Kopioi kutsulinkkii
              </Button>
            </div>
          </div>

          <Card className="bg-muted/30">
            <CardContent className="flex items-center gap-3 py-3">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              <code className="flex-1 truncate text-sm">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/bid/${project.invite_token}`
                  : `/bid/${project.invite_token}`}
              </code>
              <Button variant="ghost" size="sm" onClick={copyInviteLink}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={hasImages ? "images" : "comparison"} className="space-y-6">
          <TabsList>
            <TabsTrigger value="images" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              Kuvat ({images.length})
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Vertailu ({submittedBids.length})
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              Määräluettelo ({tasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="images">
            <div className="space-y-6">
              {hasImages && (
                <ImageCarousel images={images} />
              )}

              {has360 && (
                <Viewer360 images={images} />
              )}

              <ImageUploader
                projectId={projectId}
                onUploadComplete={loadData}
              />
            </div>
          </TabsContent>

          <TabsContent value="comparison">
            <ComparisonMatrix tasks={tasks} bids={bids} />
          </TabsContent>

          <TabsContent value="tasks">
            <Card>
              <CardHeader>
                <CardTitle>Määräluettelo</CardTitle>
                <CardDescription>
                  Projektin tehtävät, materiaalit ja niiden määrät
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategoria</TableHead>
                      <TableHead>Kuvaus</TableHead>
                      <TableHead>Materiaali</TableHead>
                      <TableHead className="text-right">Määrä</TableHead>
                      <TableHead>Yksikkö</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {getCategoryLabel(task.category)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {task.description}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {getMaterialName(task.material_id) || "–"}
                        </TableCell>
                        <TableCell className="text-right">
                          {task.quantity}
                        </TableCell>
                        <TableCell>{UNIT_LABELS[task.unit]}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
