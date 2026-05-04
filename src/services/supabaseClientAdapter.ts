// Single import adapter for the project Supabase client.
// Keep frontend services importing from this file, so the client location can be changed in one place.

import { supabase } from "@/lib/supabase/client";

export { supabase };
