"use client";

import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3 } from "lucide-react";
import {
  TASK_CATEGORIES,
  UNIT_LABELS,
  type Task,
  type BidWithItems,
} from "@/lib/types";

interface ComparisonMatrixProps {
  tasks: Task[];
  bids: BidWithItems[];
}

function getCategoryLabel(value: string): string {
  return TASK_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function ComparisonMatrix({ tasks, bids }: ComparisonMatrixProps) {
  const submittedBids = bids.filter((b) => b.status === "submitted");

  const matrix = useMemo(() => {
    return tasks.map((task) => {
      const bidValues = submittedBids.map((bid) => {
        const item = bid.bid_items.find((bi) => bi.task_id === task.id);
        if (!item) return { bidId: bid.id, labor: 0, material: 0, total: 0 };
        const labor = item.unit_labor_cost * task.quantity;
        const material = item.unit_material_cost * task.quantity;
        return { bidId: bid.id, labor, material, total: labor + material };
      });

      const totals = bidValues.map((v) => v.total).filter((t) => t > 0);
      const minTotal = totals.length > 0 ? Math.min(...totals) : 0;

      return {
        task,
        bidValues,
        minTotal,
      };
    });
  }, [tasks, submittedBids]);

  const bidTotals = useMemo(() => {
    return submittedBids.map((bid) => {
      const total = matrix.reduce((sum, row) => {
        const val = row.bidValues.find((v) => v.bidId === bid.id);
        return sum + (val?.total || 0);
      }, 0);
      return { bidId: bid.id, total };
    });
  }, [submittedBids, matrix]);

  const minBidTotal = useMemo(() => {
    const totals = bidTotals.map((t) => t.total).filter((t) => t > 0);
    return totals.length > 0 ? Math.min(...totals) : 0;
  }, [bidTotals]);

  if (submittedBids.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center py-12 text-center">
          <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">Ei tarjouksia vielä</h3>
          <p className="text-muted-foreground">
            Jaa kutsulinkkiä urakoitsijoille vastaanottaaksesi tarjouksia.
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Tarjousvertailu
        </CardTitle>
        <CardDescription>
          {submittedBids.length} tarjoust
          {submittedBids.length === 1 ? "a" : "a"} vastaanotettu. Edullisin
          hinta korostettu vihreällä.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Tehtävä</TableHead>
                <TableHead className="w-[80px] text-right">Määrä</TableHead>
                {submittedBids.map((bid) => (
                  <TableHead key={bid.id} className="min-w-[150px] text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-semibold">
                        {bid.contractor_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(bid.created_at).toLocaleDateString("fi-FI")}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedTasks).map(
                ([category, categoryTasks]) => (
                  <>
                    <TableRow key={`cat-${category}`} className="bg-muted/50">
                      <TableCell
                        colSpan={2 + submittedBids.length}
                        className="font-semibold"
                      >
                        {getCategoryLabel(category)}
                      </TableCell>
                    </TableRow>
                    {categoryTasks.map((task) => {
                      const row = matrix.find((r) => r.task.id === task.id)!;
                      return (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">
                                {task.description}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {task.quantity} {UNIT_LABELS[task.unit]}
                          </TableCell>
                          {row.bidValues.map((val) => {
                            const isMin =
                              val.total > 0 && val.total === row.minTotal;
                            return (
                              <TableCell
                                key={val.bidId}
                                className={`text-right ${
                                  isMin
                                    ? "bg-green-50 font-semibold text-green-700 dark:bg-green-950/30 dark:text-green-400"
                                    : ""
                                }`}
                              >
                                {val.total > 0 ? (
                                  <div>
                                    <div className="font-medium">
                                      {val.total.toFixed(2)} €
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Työ: {val.labor.toFixed(0)} € | Mat:{" "}
                                      {val.material.toFixed(0)} €
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    –
                                  </span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                  </>
                )
              )}

              {/* Totals row */}
              <TableRow className="border-t-2 bg-muted/30 font-bold">
                <TableCell colSpan={2} className="text-lg">
                  YHTEENSÄ
                </TableCell>
                {submittedBids.map((bid) => {
                  const bidTotal = bidTotals.find(
                    (t) => t.bidId === bid.id
                  )!;
                  const isMin =
                    bidTotal.total > 0 && bidTotal.total === minBidTotal;
                  return (
                    <TableCell
                      key={bid.id}
                      className={`text-right text-lg ${
                        isMin
                          ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                          : ""
                      }`}
                    >
                      {bidTotal.total.toFixed(2)} €
                      {isMin && (
                        <Badge
                          variant="secondary"
                          className="ml-2 bg-green-100 text-green-700"
                        >
                          Edullisin
                        </Badge>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
