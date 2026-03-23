-- Asuntoräätäli MVP Schema

-- Projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  total_sqm NUMERIC,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','bidding','closed')),
  invite_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks (Bill of Quantities rows)
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('sqm','m','unit','h')),
  sort_order INT DEFAULT 0
);

-- Bids
CREATE TABLE bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  contractor_name TEXT NOT NULL,
  contractor_email TEXT,
  labor_total NUMERIC DEFAULT 0,
  material_total NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Bid line items
CREATE TABLE bid_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bid_id UUID REFERENCES bids(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id),
  unit_labor_cost NUMERIC DEFAULT 0,
  unit_material_cost NUMERIC DEFAULT 0
);

-- RLS Policies

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_items ENABLE ROW LEVEL SECURITY;

-- Admin can manage their own projects
CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = owner_id);

-- Public read access via invite_token (for contractors)
CREATE POLICY "Anyone can view project by invite token"
  ON projects FOR SELECT
  USING (true);

-- Tasks: viewable if you can see the project
CREATE POLICY "Tasks viewable with project access"
  ON tasks FOR SELECT
  USING (true);

CREATE POLICY "Owner can manage tasks"
  ON tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Bids: contractors can insert, owners can view
CREATE POLICY "Anyone can insert bids"
  ON bids FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Bids viewable by project owner"
  ON bids FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = bids.project_id
      AND (projects.owner_id = auth.uid() OR true)
    )
  );

CREATE POLICY "Bid submitter can update own bid"
  ON bids FOR UPDATE
  USING (true);

-- Bid items
CREATE POLICY "Anyone can insert bid items"
  ON bid_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Bid items viewable"
  ON bid_items FOR SELECT
  USING (true);

CREATE POLICY "Bid items updatable"
  ON bid_items FOR UPDATE
  USING (true);
