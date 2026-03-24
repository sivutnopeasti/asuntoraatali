-- Virtual tour rooms
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  original_image_url TEXT,
  visualized_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hotspots between rooms
CREATE TABLE room_hotspots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  target_room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  pitch NUMERIC NOT NULL DEFAULT 0,
  yaw NUMERIC NOT NULL DEFAULT 0,
  label TEXT
);

-- RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_hotspots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms viewable by everyone"
  ON rooms FOR SELECT USING (true);

CREATE POLICY "Owner can manage rooms"
  ON rooms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = rooms.project_id
      AND projects.owner_id = auth.uid()
    )
  );

CREATE POLICY "Hotspots viewable by everyone"
  ON room_hotspots FOR SELECT USING (true);

CREATE POLICY "Owner can manage hotspots"
  ON room_hotspots FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rooms
      JOIN projects ON projects.id = rooms.project_id
      WHERE rooms.id = room_hotspots.room_id
      AND projects.owner_id = auth.uid()
    )
  );
