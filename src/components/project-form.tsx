"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { TASK_CATEGORIES, UNIT_LABELS, type TaskUnit, type Material } from "@/lib/types";

interface TaskRow {
  tempId: string;
  category: string;
  description: string;
  quantity: string;
  unit: TaskUnit;
  materialId: string;
}

function newTaskRow(): TaskRow {
  return {
    tempId: crypto.randomUUID(),
    category: "flooring",
    description: "",
    quantity: "",
    unit: "sqm",
    materialId: "",
  };
}

export function ProjectForm() {
  const router = useRouter();
  const supabase = createClient();
  const [address, setAddress] = useState("");
  const [totalSqm, setTotalSqm] = useState("");
  const [tasks, setTasks] = useState<TaskRow[]>([newTaskRow()]);
  const [saving, setSaving] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);

  const loadMaterials = useCallback(async () => {
    const { data } = await supabase
      .from("materials")
      .select("*")
      .order("category")
      .order("name");
    setMaterials(data || []);
  }, [supabase]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  function getMaterialsForCategory(category: string): Material[] {
    return materials.filter((m) => m.category === category);
  }

  function addTask() {
    setTasks([...tasks, newTaskRow()]);
  }

  function removeTask(tempId: string) {
    if (tasks.length === 1) return;
    setTasks(tasks.filter((t) => t.tempId !== tempId));
  }

  function updateTask(tempId: string, field: keyof TaskRow, value: string) {
    setTasks(
      tasks.map((t) => {
        if (t.tempId !== tempId) return t;
        const updated = { ...t, [field]: value };
        // When category changes, reset material selection
        if (field === "category") {
          updated.materialId = "";
        }
        return updated;
      })
    );
  }

  function selectMaterial(tempId: string, materialId: string) {
    const mat = materials.find((m) => m.id === materialId);
    setTasks(
      tasks.map((t) => {
        if (t.tempId !== tempId) return t;
        return {
          ...t,
          materialId,
          unit: mat ? (mat.unit as TaskUnit) : t.unit,
        };
      })
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!address.trim()) {
      toast.error("Osoite on pakollinen");
      return;
    }

    const invalidTasks = tasks.filter(
      (t) => !t.description.trim() || !t.quantity || parseFloat(t.quantity) <= 0
    );
    if (invalidTasks.length > 0) {
      toast.error("Täytä kaikkien tehtävien kuvaus ja määrä");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Kirjaudu sisään ensin");
        return;
      }

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
          address: address.trim(),
          total_sqm: totalSqm ? parseFloat(totalSqm) : null,
          owner_id: user.id,
          status: "draft",
        })
        .select()
        .single();

      if (projectError) throw projectError;

      const taskInserts = tasks.map((t, index) => ({
        project_id: project.id,
        category: t.category,
        description: t.description.trim(),
        quantity: parseFloat(t.quantity),
        unit: t.unit,
        sort_order: index,
        material_id: t.materialId || null,
      }));

      const { error: tasksError } = await supabase
        .from("tasks")
        .insert(taskInserts);

      if (tasksError) throw tasksError;

      toast.success("Projekti luotu onnistuneesti!");
      router.push(`/projects/${project.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Projektin luonti epäonnistui";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Projektin tiedot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address">Osoite *</Label>
              <Input
                id="address"
                placeholder="Esimerkkikatu 1, Helsinki"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sqm">Kokonaisneliöt (m²)</Label>
              <Input
                id="sqm"
                type="number"
                step="0.1"
                min="0"
                placeholder="65"
                value={totalSqm}
                onChange={(e) => setTotalSqm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="sticky top-16 z-10 flex items-center justify-between rounded-t-lg border-b bg-card px-6 py-4">
          <CardTitle>Määräluettelo (BoQ) – {tasks.length} tehtävää</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addTask}>
            <Plus className="mr-2 h-4 w-4" />
            Lisää tehtävä
          </Button>
        </div>
        <div className="divide-y">
          {tasks.map((task, index) => {
            const categoryMaterials = getMaterialsForCategory(task.category);
            const selectedMat = materials.find((m) => m.id === task.materialId);

            return (
              <div key={task.tempId} className="px-6 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Tehtävä {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTask(task.tempId)}
                    disabled={tasks.length === 1}
                    className="h-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Poista
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Kategoria</Label>
                    <Select
                      value={task.category}
                      onValueChange={(v) =>
                        updateTask(task.tempId, "category", v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TASK_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-1 lg:col-span-3">
                    <Label className="text-xs">Tehtävän kuvaus</Label>
                    <Input
                      placeholder="esim. Asenna parketti olohuoneeseen"
                      value={task.description}
                      onChange={(e) =>
                        updateTask(task.tempId, "description", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Materiaali</Label>
                    <Select
                      value={task.materialId || "__none__"}
                      onValueChange={(v) =>
                        selectMaterial(task.tempId, v === "__none__" ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Valitse materiaali..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          <span className="text-muted-foreground">Ei materiaalia</span>
                        </SelectItem>
                        {categoryMaterials.map((mat) => (
                          <SelectItem key={mat.id} value={mat.id}>
                            {mat.name}
                            {mat.unit_price > 0 && (
                              <span className="ml-1 text-muted-foreground">
                                ({mat.unit_price}€/{UNIT_LABELS[mat.unit as TaskUnit]})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                        {categoryMaterials.length === 0 && (
                          <SelectItem value="__empty__">
                            <span className="text-muted-foreground">Ei materiaaleja tälle kategorialle</span>
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedMat && (
                      <p className="text-xs text-muted-foreground">
                        {selectedMat.manufacturer} – {selectedMat.unit_price}€/{UNIT_LABELS[selectedMat.unit as TaskUnit]}
                        {selectedMat.description && ` – ${selectedMat.description}`}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Määrä</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="0"
                      value={task.quantity}
                      onChange={(e) =>
                        updateTask(task.tempId, "quantity", e.target.value)
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Yksikkö</Label>
                    <Select
                      value={task.unit}
                      onValueChange={(v) =>
                        updateTask(task.tempId, "unit", v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sqm">m²</SelectItem>
                        <SelectItem value="m">m</SelectItem>
                        <SelectItem value="unit">kpl</SelectItem>
                        <SelectItem value="h">h</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-t px-6 py-4">
          <Button type="button" variant="outline" className="w-full" onClick={addTask}>
            <Plus className="mr-2 h-4 w-4" />
            Lisää tehtävä
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Tallennetaan..." : "Luo projekti"}
        </Button>
      </div>
    </form>
  );
}
