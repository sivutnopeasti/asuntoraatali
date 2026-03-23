"use client";

import { useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { TASK_CATEGORIES, type TaskUnit } from "@/lib/types";

interface TaskRow {
  tempId: string;
  category: string;
  description: string;
  quantity: string;
  unit: TaskUnit;
}

function newTaskRow(): TaskRow {
  return {
    tempId: crypto.randomUUID(),
    category: "flooring",
    description: "",
    quantity: "",
    unit: "sqm",
  };
}

export function ProjectForm() {
  const router = useRouter();
  const supabase = createClient();
  const [address, setAddress] = useState("");
  const [totalSqm, setTotalSqm] = useState("");
  const [tasks, setTasks] = useState<TaskRow[]>([newTaskRow()]);
  const [saving, setSaving] = useState(false);

  function addTask() {
    setTasks([...tasks, newTaskRow()]);
  }

  function removeTask(tempId: string) {
    if (tasks.length === 1) return;
    setTasks(tasks.filter((t) => t.tempId !== tempId));
  }

  function updateTask(tempId: string, field: keyof TaskRow, value: string) {
    setTasks(
      tasks.map((t) =>
        t.tempId === tempId ? { ...t, [field]: value } : t
      )
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Määräluettelo (BoQ)</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addTask}>
              <Plus className="mr-2 h-4 w-4" />
              Lisää tehtävä
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Kategoria</TableHead>
                  <TableHead>Kuvaus</TableHead>
                  <TableHead className="w-[100px]">Määrä</TableHead>
                  <TableHead className="w-[100px]">Yksikkö</TableHead>
                  <TableHead className="w-[60px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.tempId}>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="esim. Asenna parketti"
                        value={task.description}
                        onChange={(e) =>
                          updateTask(task.tempId, "description", e.target.value)
                        }
                        required
                      />
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTask(task.tempId)}
                        disabled={tasks.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} size="lg">
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Tallennetaan..." : "Luo projekti"}
        </Button>
      </div>
    </form>
  );
}
