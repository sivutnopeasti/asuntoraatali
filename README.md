# Asuntoräätäli – Remonttitarjousten vertailualusta

Standardoitu remonttitarjousten vertailualusta, joka tekee tarjouksista 100% vertailukelpoisia.

## Ominaisuudet

- **Admin Dashboard** – Hallinnoi remonttiprojekteja, luo määräluetteloja (BoQ)
- **Tarjouslomake** – Urakoitsijat täyttävät yksikköhinnat kutsulinkillä (ei kirjautumista)
- **Vertailumatriisi** – Tarjousten rinnakkaisvertailu, edullisin hinta korostettu vihreällä
- **Automaattinen laskenta** – Kokonaissummat lasketaan reaaliaikaisesti
- **Mobiilioptimoitu** – Toimii urakoitsijan puhelimella työmaalla

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Kieli:** TypeScript
- **Tyyli:** Tailwind CSS + Shadcn UI
- **Tietokanta & Auth:** Supabase
- **Ikonit:** Lucide React
- **Deploy:** Vercel

## Käyttöönotto

### 1. Supabase-projekti

1. Luo projekti osoitteessa [supabase.com](https://supabase.com)
2. Suorita SQL-migraatio: `supabase/migrations/001_initial_schema.sql`
   - Avaa Supabase Dashboard → SQL Editor → Liitä ja suorita
3. Kopioi **Project URL** ja **anon/public key** projektin API-asetuksista

### 2. Ympäristömuuttujat

Kopioi `.env.local.example` → `.env.local` ja täytä arvot:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Kehitys

```bash
npm install
npm run dev
```

### 4. Vercel-deployment

1. Mene [vercel.com](https://vercel.com) ja yhdistä GitHub-repo
2. Lisää ympäristömuuttujat Vercelin asetuksissa
3. Deploy tapahtuu automaattisesti jokaisesta pushista

## Sivurakenne

| Sivu | Polku | Kuvaus |
|------|-------|--------|
| Dashboard | `/` | Projektien listaus (admin) |
| Kirjautuminen | `/login` | Supabase Auth |
| Uusi projekti | `/projects/new` | Luo projekti + määräluettelo |
| Projektin tiedot | `/projects/[id]` | Vertailumatriisi + BoQ |
| Tarjouslomake | `/bid/[token]` | Urakoitsijan lomake (julkinen) |
