import { mockSupabaseClient } from "./supabase-js";

export const createServerClient = jest.fn(() => mockSupabaseClient);
export const createBrowserClient = jest.fn(() => mockSupabaseClient);
