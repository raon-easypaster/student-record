import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

// Read .env.local or .env for Supabase credentials
const envFile = fs.existsSync('.env.local') ? '.env.local' : (fs.existsSync('.env') ? '.env' : null);
if (envFile) {
  dotenv.config({ path: envFile });
} else {
  // If no env file, try to extract from vite.config.ts or just read it from Vercel config if possible
  // For now, let's just grep the supabase url and anon key from the project if it's hardcoded, but it's usually in env.
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://rlezrlhohcaaaxiltopb.supabase.co'; // Based on the URL from the walkthrough
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.log("No Supabase Anon Key found in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: profile } = await supabase.from('student_profile').select('*').eq('name', '최고 관리자').single();
  if (!profile) {
    console.log("No profile found for '최고 관리자'");
    return;
  }
  
  const { data: academic } = await supabase.from('academic_records').select('*').eq('student_id', profile.id);
  const { data: activities } = await supabase.from('activities').select('*').eq('student_id', profile.id);
  
  console.log("--- Academic Records ---");
  console.log(academic);
  
  console.log("--- Activities ---");
  console.log(activities);
}

checkData();
