export type ProjectStatus = "draft" | "bidding" | "closed";
export type BidStatus = "draft" | "submitted";
export type TaskUnit = "sqm" | "m" | "unit" | "h";
export type ImageType = "photo" | "360";

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
  material_id: string | null;
}

export interface Material {
  id: string;
  category: string;
  name: string;
  manufacturer: string | null;
  unit_price: number;
  unit: TaskUnit;
  description: string | null;
  image_url: string | null;
  created_at: string;
}

export interface ProjectImage {
  id: string;
  project_id: string;
  url: string;
  type: ImageType;
  caption: string | null;
  sort_order: number;
  created_at: string;
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

export interface TaskWithMaterial extends Task {
  materials?: Material;
}

export interface Room {
  id: string;
  project_id: string;
  name: string;
  sort_order: number;
  original_image_url: string | null;
  visualized_image_url: string | null;
  created_at: string;
}

export interface RoomHotspot {
  id: string;
  room_id: string;
  target_room_id: string;
  pitch: number;
  yaw: number;
  label: string | null;
}

export interface RoomWithHotspots extends Room {
  room_hotspots: RoomHotspot[];
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
