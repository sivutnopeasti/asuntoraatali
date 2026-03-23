"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { TASK_CATEGORIES, UNIT_LABELS, type Task } from "@/lib/types";

interface BidFormProps {
  projectId: string;
  projectAddress: string;
  tasks: Task[];
}

interface BidItemState {
  taskId: string;
  laborCost: string;
  materialCost: string;
}

function getCategoryLabel(value: string): string {
  return TASK_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function BidForm({ projectId, projectAddress, tasks }: BidFormProps) {
  const supabase = createClient();
  const [contractorName, setContractorName] = useState("");
  const [contractorEmail, setContractorEmail] = useState("");
  const [bidItems, setBidItems] = useState<BidItemState[]>(
    tasks.map((t) => ({
      taskId: t.id,
      laborCost: "",
      materialCost: "",
    }))
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function updateBidItem(
    taskId: string,
    field: "laborCost" | "materialCost",
    value: string
  ) {
    setBidItems(
      bidItems.map((item) =>
        item.taskId === taskId ? { ...item, [field]: value } : item
      )
    );
  }

  const calculations = useMemo(() => {
    return bidItems.map((item) => {
      const task = tasks.find((t) => t.id === item.taskId)!;
      const labor = (parseFloat(item.laborCost) || 0) * task.quantity;
      const material = (parseFloat(item.materialCost) || 0) * task.quantity;
      return { taskId: item.taskId, labor, material, total: labor + material };
    });
  }, [bidItems, tasks]);

  const totals = useMemo(() => {
    return calculations.reduce(
      (acc, c) => ({
        labor: acc.labor + c.labor,
        material: acc.material + c.material,
        total: acc.total + c.total,
      }),
      { labor: 0, material: 0, total: 0 }
    );
  }, [calculations]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!contractorName.trim()) {
      toast.error("Yrityksen nimi on pakollinen");
      return;
    }

    const emptyItems = bidItems.filter(
      (item) => !item.laborCost || parseFloat(item.laborCost) <= 0
    );
    if (emptyItems.length > 0) {
      toast.error("Täytä työn yksikköhinta kaikille tehtäville");
      return;
    }

    setSubmitting(true);

    try {
      const { data: bid, error: bidError } = await supabase
        .from("bids")
        .insert({
          project_id: projectId,
          contractor_name: contractorName.trim(),
          contractor_email: contractorEmail.trim() || null,
          labor_total: totals.labor,
          material_total: totals.material,
          total_price: totals.total,
          status: "submitted",
        })
        .select()
        .single();

      if (bidError) throw bidError;

      const bidItemInserts = bidItems.map((item) => ({
        bid_id: bid.id,
        task_id: item.taskId,
        unit_labor_cost: parseFloat(item.laborCost) || 0,
        unit_material_cost: parseFloat(item.materialCost) || 0,
      }));

      const { error: itemsError } = await supabase
        .from("bid_items")
        .insert(bidItemInserts);

      if (itemsError) throw itemsError;

      setSubmitted(true);
      toast.success("Tarjous lähetetty onnistuneesti!");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Tarjouksen lähetys epäonnistui";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <CheckCircle className="mb-4 h-16 w-16 text-green-500" />
          <h2 className="mb-2 text-2xl font-bold">Kiitos tarjouksestasi!</h2>
          <p className="text-muted-foreground">
            Tarjouksesi kohteeseen {projectAddress} on vastaanotettu.
          </p>
          <p className="mt-2 text-lg font-semibold">
            Kokonaishinta: {totals.total.toFixed(2)} €
          </p>
        </CardContent>
      </Card>
    );
  }

  const groupedTasks = tasks.reduce(
    (acc, task) => {
      if (!acc[task.category]) acc[task.category] = [];
      acc[task.category].push(task);
      return acc;
    },
    {} as Record<string, Task[]>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Urakoitsijan tiedot</CardTitle>
          <CardDescription>
            Täytä yrityksesi tiedot tarjousta varten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Yrityksen nimi *</Label>
              <Input
                id="name"
                placeholder="Remontti Oy"
                value={contractorName}
                onChange={(e) => setContractorName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Sähköposti</Label>
              <Input
                id="email"
                type="email"
                placeholder="info@yritys.fi"
                value={contractorEmail}
                onChange={(e) => setContractorEmail(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {Object.entries(groupedTasks).map(([category, categoryTasks]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="text-lg">
              {getCategoryLabel(category)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tehtävä</TableHead>
                    <TableHead className="w-[80px] text-right">Määrä</TableHead>
                    <TableHead className="w-[70px]">Yksikkö</TableHead>
                    <TableHead className="w-[140px]">
                      Työ (€/yksikkö)
                    </TableHead>
                    <TableHead className="w-[140px]">
                      Materiaali (€/yksikkö)
                    </TableHead>
                    <TableHead className="w-[120px] text-right">
                      Yhteensä €
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryTasks.map((task) => {
                    const item = bidItems.find((i) => i.taskId === task.id)!;
                    const calc = calculations.find(
                      (c) => c.taskId === task.id
                    )!;
                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">
                          {task.description}
                        </TableCell>
                        <TableCell className="text-right">
                          {task.quantity}
                        </TableCell>
                        <TableCell>{UNIT_LABELS[task.unit]}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.laborCost}
                            onChange={(e) =>
                              updateBidItem(
                                task.id,
                                "laborCost",
                                e.target.value
                              )
                            }
                            className="text-right"
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.materialCost}
                            onChange={(e) =>
                              updateBidItem(
                                task.id,
                                "materialCost",
                                e.target.value
                              )
                            }
                            className="text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {calc.total > 0 ? `${calc.total.toFixed(2)} €` : "–"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <Table>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">Yhteenveto</TableCell>
                <TableCell className="text-right">
                  Työ: {totals.labor.toFixed(2)} €
                </TableCell>
                <TableCell className="text-right">
                  Materiaali: {totals.material.toFixed(2)} €
                </TableCell>
                <TableCell className="text-right text-lg font-bold">
                  Yhteensä: {totals.total.toFixed(2)} €
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting} size="lg">
          <Send className="mr-2 h-4 w-4" />
          {submitting ? "Lähetetään..." : "Lähetä tarjous"}
        </Button>
      </div>
    </form>
  );
}
