# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Supabase integration

1. Add environment variables (create a `.env` file based on `.env.example`):

```powershell
$env:VITE_SUPABASE_URL="https://your-project.supabase.co"; \
$env:VITE_SUPABASE_ANON_KEY="your-anon-key";
```

2. Install dependencies (if you haven't already):

```powershell
npm install
```

3. Start the dev server:

```powershell
npm run dev
```

4. Create the admin & participant users (local seed script). This requires the Supabase "service role" key — keep it secret. Run from PowerShell like:

```powershell
$env:SUPABASE_URL="https://your-project.supabase.co"; \
$env:SUPABASE_SERVICE_ROLE_KEY="<your-service-role-key>"; \
node .\scripts\seedAdmin.js
```

Notes:
- The app maps simple usernames (e.g. `admin`) to `admin@example.com` when signing in. So the demo admin credentials are:
	- Username: `admin` (app maps to `admin@example.com`)
	- Password: `admin123`
- If your Supabase project requires email confirmation or policies, adjust settings in the Supabase dashboard.
- Never commit the service role key to source control.

## Database schema & client helpers

I added SQL you can run in the Supabase SQL editor to create the necessary tables: `scripts/create_tables.sql`.

Tables created:
- `seminars` — seminar definitions (title, speaker, capacity, date, questions JSONB)
- `joined_participants` — who joined a seminar
- `evaluations` — stored evaluation answers per seminar/participant

To create the tables, open the Supabase dashboard -> SQL Editor -> New query, paste the contents of `scripts/create_tables.sql`, and run it.

Client helpers
- `src/lib/db.js` contains helper functions that use the existing Supabase client (`src/lib/supabaseClient.js`) to:
	- `fetchSeminars()`, `createSeminar()`, `upsertSeminar()`, `deleteSeminar()`
	- `saveJoinedParticipant()`, `fetchJoinedParticipants()`
	- `saveEvaluation()`
	- `saveAllSeminars()` (bulk upsert)

Example usage from your components (pseudo-code):

```js
import db from './lib/db';

// Fetch all seminars
const { data: seminars, error } = await db.fetchSeminars();

// Create a seminar
const { data, error } = await db.createSeminar({ title: 'New', duration: 2, speaker: 'Alice', participants: 50, date: '2025-11-20' });

// Bulk save from localStorage
const localSeminars = JSON.parse(localStorage.getItem('seminars') || '[]');
await db.saveAllSeminars(localSeminars);
```

Security note
- Use the client `anon` key in the browser for normal reads/writes, and configure Row Level Security (RLS) policies in Supabase dashboard to restrict operations as needed.
- For server-side admin operations (like creating users), continue to use the Service Role key and run scripts on a trusted machine.

