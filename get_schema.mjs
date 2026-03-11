import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
console.log(supabaseUrl, supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {

    // Instead we can just try to SELECT the whole row with limit 1
    const { data: row, error: rowError } = await supabase.from('weapon_stats_records').select('*').limit(1);
    console.log("weapon_stats_records:", row, rowError);
}
main();
