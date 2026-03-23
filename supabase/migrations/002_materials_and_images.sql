-- Material library
CREATE TABLE materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  manufacturer TEXT,
  unit_price NUMERIC DEFAULT 0,
  unit TEXT NOT NULL CHECK (unit IN ('sqm','m','unit','h')),
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Project images (photos + 360)
CREATE TABLE project_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'photo' CHECK (type IN ('photo','360')),
  caption TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add material reference to tasks
ALTER TABLE tasks ADD COLUMN material_id UUID REFERENCES materials(id);

-- RLS for materials (public read, admin write)
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Materials are viewable by everyone"
  ON materials FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage materials"
  ON materials FOR ALL
  USING (auth.uid() IS NOT NULL);

-- RLS for project images
ALTER TABLE project_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project images viewable by everyone"
  ON project_images FOR SELECT USING (true);

CREATE POLICY "Owner can manage project images"
  ON project_images FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_images.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Seed material library with sample data
INSERT INTO materials (category, name, manufacturer, unit_price, unit, description) VALUES
  -- Lattia / Flooring
  ('flooring', 'Tammi parketti Classic', 'Kährs', 45.00, 'sqm', 'Tammi 3-sauva parketti, lakattu, 14mm'),
  ('flooring', 'Tammi parketti Premium', 'Kährs', 62.00, 'sqm', 'Tammi 1-sauva parketti, öljytty, 14mm'),
  ('flooring', 'Vinyylilankku Click', 'Tarkett', 28.00, 'sqm', 'Vedenkestävä vinyylilankku, 5mm, tammen sävy'),
  ('flooring', 'Vinyylilankku Premium', 'Tarkett', 38.00, 'sqm', 'LVT vinyylilankku, 6mm, tammi natural'),
  ('flooring', 'Laminaatti Standard', 'Pergo', 18.00, 'sqm', '8mm laminaatti, AC4 kulutusluokka'),
  ('flooring', 'Laminaatti Premium', 'Pergo', 32.00, 'sqm', '10mm laminaatti, AC5 kulutusluokka, tammi'),

  -- Maalaus / Painting
  ('painting', 'Sisämaali Harmony', 'Tikkurila', 8.50, 'sqm', 'Täyshimmeä sisämaali, valkoinen'),
  ('painting', 'Sisämaali Joker', 'Tikkurila', 11.00, 'sqm', 'Silkinhimmeä sisämaali, sävytettävä'),
  ('painting', 'Kattomaaali', 'Tikkurila', 6.50, 'sqm', 'Täyshimmeä kattomaali, valkoinen'),
  ('painting', 'Paneelilakka', 'Teknos', 14.00, 'sqm', 'Vesiohenteinen paneelilakka, kirkas'),

  -- Laatoitus / Tiling
  ('tiling', 'Keraaminen laatta 20x20 valkoinen', 'Pukkila', 25.00, 'sqm', 'Seinälaatta, kiiltävä valkoinen'),
  ('tiling', 'Keraaminen laatta 30x60 harmaa', 'Pukkila', 32.00, 'sqm', 'Seinälaatta, matta harmaa'),
  ('tiling', 'Lattialaatta 30x30 harmaa', 'Pukkila', 28.00, 'sqm', 'Lattialaatta, liukastumaton, harmaa'),
  ('tiling', 'Mosaiikkilaatta hexagon', 'Laattapiste', 55.00, 'sqm', 'Kuusikulmainen mosaiikki, marmori-ilme'),
  ('tiling', 'Iso lattialaatta 60x60', 'ABL', 42.00, 'sqm', 'Porcellanato, betoni-ilme, harmaa'),
  ('tiling', 'Metro-laatta 10x20', 'Pukkila', 22.00, 'sqm', 'Klassinen metro-seinälaatta, valkoinen'),

  -- Putkityöt / Plumbing
  ('plumbing', 'WC-istuin', 'IDO', 350.00, 'unit', 'IDO Seven D seinä-WC'),
  ('plumbing', 'Pesuallas', 'IDO', 180.00, 'unit', 'IDO Mosaik pesuallas, 56cm'),
  ('plumbing', 'Suihkusetti', 'Oras', 280.00, 'unit', 'Oras Optima termostaattisuihkusetti'),
  ('plumbing', 'Keittiöhana', 'Oras', 220.00, 'unit', 'Oras Signa keittiöhana, kromi'),
  ('plumbing', 'Ammeen poisto ja tulppaus', 'Muu', 0.00, 'unit', 'Vanhan ammeen poisto ja putkien tulppaus'),

  -- Sähkötyöt / Electrical
  ('electrical', 'Pistorasia', 'ABB', 25.00, 'unit', 'ABB Impressivo pistorasia, valkoinen'),
  ('electrical', 'Valokatkaisia', 'ABB', 20.00, 'unit', 'ABB Impressivo kytkin, valkoinen'),
  ('electrical', 'LED-paneeli', 'Airam', 85.00, 'unit', 'LED kattopaneeli 600x600, 40W, 4000K'),
  ('electrical', 'LED-spotti', 'Airam', 18.00, 'unit', 'Upotettava LED-spotti, 7W, 3000K'),

  -- Purku / Demolition
  ('demolition', 'Purkujätelava', 'Muu', 450.00, 'unit', 'Vaihtolavakuorma, sekajäte'),
  ('demolition', 'Suojamuovi', 'Muu', 2.50, 'sqm', 'Lattian suojamuovi, 0.1mm'),

  -- Keittiö / Kitchen
  ('kitchen', 'Taso laminaatti', 'Topi-Keittiöt', 120.00, 'm', 'Laminaattitaso, 30mm, tammi'),
  ('kitchen', 'Taso kivitaso', 'Topi-Keittiöt', 280.00, 'm', 'Komposiittikivitaso, 20mm, valkoinen'),
  ('kitchen', 'Alakaapit rungot', 'Topi-Keittiöt', 180.00, 'unit', 'Alakaapin runko, 60cm, valkoinen'),
  ('kitchen', 'Yläkaapit rungot', 'Topi-Keittiöt', 140.00, 'unit', 'Yläkaapin runko, 60cm, valkoinen'),

  -- Kylpyhuone / Bathroom
  ('bathroom', 'Vedeneristys', 'Kiilto', 15.00, 'sqm', 'Kiilto Kerafiber vedeneristysjärjestelmä'),
  ('bathroom', 'Suihkuseinä', 'INR', 450.00, 'unit', 'Karkaistu lasiovi, 80cm, kirkas'),
  ('bathroom', 'Peilikaappi', 'Svedbergs', 320.00, 'unit', 'Peilikaappi LED-valolla, 60cm'),

  -- Ovet & Ikkunat / Doors & Windows
  ('doors_windows', 'Sisäovi laakaovi', 'JELD-WEN', 120.00, 'unit', 'Valkoinen laakaovi, 9x21'),
  ('doors_windows', 'Sisäovi peilovi', 'JELD-WEN', 180.00, 'unit', 'Valkoinen peilovi, 9x21'),
  ('doors_windows', 'Ovenkahva', 'Abloy', 35.00, 'unit', 'Abloy Polar ovenkahvasetti, kromi'),
  ('doors_windows', 'Listoitus', 'Maler', 4.50, 'm', 'MDF jalka- ja kattolista, 12x42mm, valkoinen');
