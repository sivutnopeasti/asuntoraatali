export type ProjectStatus = "draft" | "bidding" | "closed";
export type BidStatus = "draft" | "submitted";
export type TaskUnit = "sqm" | "m" | "unit" | "h";

export interface Project {
  id: string;
  address: string;
  owner_id: string;
  total_sqm: number | null;
  status: ProjectStatus;
  invite_token: string;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  category: string;
  description: string;
  quantity: number;
  unit: TaskUnit;
  sort_order: number;
}

export interface Bid {
  id: string;
  project_id: string;
  contractor_name: string;
  contractor_email: string | null;
  labor_total: number;
  material_total: number;
  total_price: number;
  status: BidStatus;
  created_at: string;
}

export interface BidItem {
  id: string;
  bid_id: string;
  task_id: string;
  unit_labor_cost: number;
  unit_material_cost: number;
}

export interface BidWithItems extends Bid {
  bid_items: BidItem[];
}

export interface ProjectWithTasks extends Project {
  tasks: Task[];
}

export const TASK_CATEGORIES = [
  { value: "flooring", label: "Lattia" },
  { value: "painting", label: "Maalaus" },
  { value: "tiling", label: "Laatoitus" },
  { value: "plumbing", label: "Putkityöt" },
  { value: "electrical", label: "Sähkötyöt" },
  { value: "demolition", label: "Purku" },
  { value: "carpentry", label: "Kirvesmiehen työt" },
  { value: "doors_windows", label: "Ovet & Ikkunat" },
  { value: "kitchen", label: "Keittiö" },
  { value: "bathroom", label: "Kylpyhuone" },
  { value: "other", label: "Muu" },
] as const;

export const UNIT_LABELS: Record<TaskUnit, string> = {
  sqm: "m²",
  m: "m",
  unit: "kpl",
  h: "h",
};
