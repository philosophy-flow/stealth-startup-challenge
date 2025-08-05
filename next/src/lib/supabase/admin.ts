import { createClient } from "@supabase/supabase-js";

// Admin client for server-side operations that bypass RLS
// Used in webhook handlers where we don't have user context
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            persistSession: false,
        },
    }
);
