"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/navbar";
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
import { Plus, FolderOpen, ClipboardList } from "lucide-react";
import type { Project } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Luonnos",
  bidding: "Tarjouspyyntö",
  closed: "Suljettu",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  bidding: "default",
  closed: "outline",
};

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", userData.user.id)
        .order("created_at", { ascending: false });

      setProjects(data || []);
      setLoading(false);
    }

    load();
  }, [router, supabase]);

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

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projektit</h1>
            <p className="text-muted-foreground">
              Hallinnoi remonttiprojektejasi ja vertaile tarjouksia
            </p>
          </div>
          <Link href="/projects/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Uusi projekti
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <CardTitle className="mb-2">Ei vielä projekteja</CardTitle>
              <CardDescription className="mb-4">
                Luo ensimmäinen remonttiprojektisi aloittaaksesi tarjousten
                keräämisen.
              </CardDescription>
              <Link href="/projects/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Luo projekti
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Projektilista
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Osoite</TableHead>
                    <TableHead>Neliöt</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Luotu</TableHead>
                    <TableHead className="text-right">Toiminnot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">
                        {project.address}
                      </TableCell>
                      <TableCell>
                        {project.total_sqm ? `${project.total_sqm} m²` : "–"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[project.status]}>
                          {STATUS_LABELS[project.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(project.created_at).toLocaleDateString(
                          "fi-FI"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/projects/${project.id}`}>
                          <Button variant="outline" size="sm">
                            Avaa
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
