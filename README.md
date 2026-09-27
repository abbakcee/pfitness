# P-Fitness Membership System

Responsive member and staff portal added around the existing P-Fitness marketing website.

## Local demo (no Supabase required)

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

- Member: `member@pfitness.test` / `Member123!`
- Staff: `staff@pfitness.test` / `Staff123!`
- Scanner test IDs: `PF-DEMO01`, `PF-PEND02`, `PF-EXP003`, `PF-DEAC04`

Demo data is stored only in the browser's local storage. It is clearly labelled “Local demo” and is never used when valid Supabase environment variables are present.

## Production-backed local testing

Follow [SETUP.md](./SETUP.md), then run `npm run dev`. The frontend uses only the Supabase public anon key. Never place a service-role key in a `VITE_` environment variable.

## Checks

```bash
npm run lint
npm run build
```

Main routes:

- Public: `/`, `/register`, `/login`
- Member: `/member`, `/member/membership`, `/member/history`, `/member/profile`
- Staff: `/admin/login`, `/admin/dashboard`, `/admin/members`, `/admin/scanner`, `/admin/checkins`
