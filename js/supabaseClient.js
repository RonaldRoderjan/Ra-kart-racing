// js/supabaseClient.js
const SUPABASE_URL = 'https://xzjdtrqyscdieroflrhu.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6amR0cnF5c2NkaWVyb2Zscmh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNjQzNDcsImV4cCI6MjA3Njg0MDM0N30._7KKrGFvK6cx83RsYyG_4_2a5vd3QG4hWOZbM-sQlU8';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);