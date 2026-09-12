// =====================================
// MUNKA PIGGERY SUPABASE CONNECTION
// =====================================

const SUPABASE_URL = "https://esbbplcndwkhkrkghayw.supabase.co";

const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzYmJwbGNuZHdraGtya2doYXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzkzOTQsImV4cCI6MjEwMTAxNTM5NH0.ndJwiLTIgyrLoitFtxmS_bQhrfb6CLrKmPxNbnJAMWc";


// Create Supabase client
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);





