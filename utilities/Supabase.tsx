import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://hznmgicetppbdljxrfkr.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6bm1naWNldHBwYmRsanhyZmtyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDIyNDk5MzMsImV4cCI6MjAxNzgyNTkzM30.jYSdxCfQ3L4luWikIwvbIvWKjqFeaJ4kOoB12zre1sY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
