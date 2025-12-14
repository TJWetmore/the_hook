# The Hook - Community App

## Setup Instructions

1.  **Environment Variables**:
    - Make a copy of `.example.env` and rename it to `.env`.
    - Update the variables with your own Supabase project credentials:
        - `VITE_SUPABASE_URL`: Your Supabase Project URL.
        - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key.

2. **Supabase Setup**:
   - You should be able to just run the supabase.sql, supabase_policies.sql, and supabase_triggers.sql (in that order) and that _should_ set the database up correctly.
   - You will have to create some image buckets as well
