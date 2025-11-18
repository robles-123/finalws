import { createClient } from '@supabase/supabase-js';

// This script must be run in Node (not browser) and requires the SERVICE ROLE key.
// Usage (PowerShell):
// $env:SUPABASE_URL="https://..."; $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"; node .\scripts\seedAdmin.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function seed() {
  try {
    console.log('Creating admin user (admin@example.com / admin123) ...');
    const adminRes = await supabase.auth.admin.createUser({
      email: 'admin@example.com',
      password: 'admin123',
      email_confirm: true,
    });

    if (adminRes.error) {
      console.error('Admin creation error:', adminRes.error.message || adminRes.error);
    } else {
      console.log('Admin created:', adminRes.data?.user?.id || adminRes.data);
    }

    console.log('Creating participant user (participant@example.com / part123) ...');
    const partRes = await supabase.auth.admin.createUser({
      email: 'participant@example.com',
      password: 'part123',
      email_confirm: true,
    });

    if (partRes.error) {
      console.error('Participant creation error:', partRes.error.message || partRes.error);
    } else {
      console.log('Participant created:', partRes.data?.user?.id || partRes.data);
    }

    console.log('Done. You can now sign in via the app using username "admin" (maps to admin@example.com) and password "admin123".');
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

seed();
