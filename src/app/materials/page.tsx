"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Trash2,
  BookOpen,
  Search,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  TASK_CATEGORIES,
  UNIT_LABELS,
  type Material,
  type TaskUnit,
} from "@/lib/types";

function getCategoryLabel(value: string): string {
  return TASK_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export default function MaterialsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  // Form state
  const [formCategory, setFormCategory] = useState("flooring");
  const [formName, setFormName] = useState("");
  const [formManufacturer, setFormManufacturer] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formUnit, setFormUnit] = useState<TaskUnit>("sqm");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMaterials = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      router.push("/login");
      return;
    }

    const { data } = await supabase
      .from("materials")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    setMaterials(data || []);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  function resetForm() {
    setFormCategory("flooring");
    setFormName("");
    setFormManufacturer("");
    setFormPrice("");
    setFormUnit("sqm");
    setFormDescription("");
    setEditingMaterial(null);
  }

  function openEdit(material: Material) {
    setEditingMaterial(material);
    setFormCategory(material.category);
    setFormName(material.name);
    setFormManufacturer(material.manufacturer || "");
    setFormPrice(material.unit_price.toString());
    setFormUnit(material.unit as TaskUnit);
    setFormDescription(material.description || "");
    setDialogOpen(true);
  }

  function openNew() {
    resetForm();
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Nimi on pakollinen");
      return;
    }
    setSaving(true);

    try {
      const payload = {
        category: formCategory,
        name: formName.trim(),
        manufacturer: formManufacturer.trim() || null,
        unit_price: parseFloat(formPrice) || 0,
        unit: formUnit,
        description: formDescription.trim() || null,
      };

      if (editingMaterial) {
        const { error } = await supabase
          .from("materials")
          .update(payload)
          .eq("id", editingMaterial.id);
        if (error) throw error;
        toast.success("Materiaali päivitetty!");
      } else {
        const { error } = await supabase.from("materials").insert(payload);
        if (error) throw error;
        toast.success("Materiaali lisätty!");
      }

      setDialogOpen(false);
      resetForm();
      loadMaterials();
    } catch {
      toast.error("Tallennus epäonnistui");
    } finally {
      setSaving(false);
    }
  }

  async function deleteMaterial(id: string) {
    if (!confirm("Haluatko varmasti poistaa tämän materiaalin?")) return;
    const { error } = await supabase.from("materials").delete().eq("id", id);
    if (error) {
      toast.error("Poisto epäonnistui");
      return;
    }
    toast.success("Materiaali poistettu");
    loadMaterials();
  }

  const filteredMaterials = materials.filter((m) => {
    const matchesCategory =
      filterCategory === "all" || m.category === filterCategory;
    const matchesSearch =
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.manufacturer || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const grouped = filteredMaterials.reduce(
    (acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m);
      return acc;
    },
    {} as Record<string, Material[]>
  );

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Ladataan...</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold">
              <BookOpen className="h-8 w-8" />
              Materiaalikirjasto
            </h1>
            <p className="text-muted-foreground">
              Hallinnoi materiaalivalikoimaa projekteillesi ({materials.length}{" "}
              materiaalia)
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Lisää materiaali
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMaterial
                    ? "Muokkaa materiaalia"
                    : "Lisää uusi materiaali"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Kategoria</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
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
                <div className="space-y-2">
                  <Label>Nimi *</Label>
                  <Input
                    placeholder="esim. Tammi parketti Classic"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Valmistaja</Label>
                    <Input
                      placeholder="esim. Kährs"
                      value={formManufacturer}
                      onChange={(e) => setFormManufacturer(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hinta (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Yksikkö</Label>
                  <Select
                    value={formUnit}
                    onValueChange={(v) => setFormUnit(v as TaskUnit)}
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
                <div className="space-y-2">
                  <Label>Kuvaus</Label>
                  <Input
                    placeholder="Lyhyt kuvaus materiaalista"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full"
                >
                  {saving
                    ? "Tallennetaan..."
                    : editingMaterial
                    ? "Päivitä"
                    : "Lisää"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-6">
          <CardContent className="flex flex-wrap items-center gap-4 py-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Hae materiaalia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Kaikki kategoriat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Kaikki kategoriat</SelectItem>
                {TASK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {Object.keys(grouped).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
              <CardTitle className="mb-2">Ei materiaaleja</CardTitle>
              <CardDescription>
                {searchQuery || filterCategory !== "all"
                  ? "Muuta hakuehtoja"
                  : "Lisää ensimmäinen materiaali kirjastoon"}
              </CardDescription>
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([category, categoryMaterials]) => (
            <Card key={category} className="mb-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {getCategoryLabel(category)}
                  <Badge variant="secondary" className="ml-2">
                    {categoryMaterials.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nimi</TableHead>
                      <TableHead>Valmistaja</TableHead>
                      <TableHead>Kuvaus</TableHead>
                      <TableHead className="text-right">Hinta</TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryMaterials.map((mat) => (
                      <TableRow key={mat.id}>
                        <TableCell className="font-medium">
                          {mat.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {mat.manufacturer || "–"}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                          {mat.description || "–"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {mat.unit_price > 0
                            ? `${mat.unit_price.toFixed(2)} €/${UNIT_LABELS[mat.unit as TaskUnit]}`
                            : "–"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(mat)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMaterial(mat.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </>
  );
}
