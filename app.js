// Initialize Supabase client globally
const supabaseUrl = '%%SUPABASE_URL%%';
const supabaseAnonKey = '%%SUPABASE_ANON_KEY%%';

// Create the client using the global 'supabase' from the CDN and attach it to window
window.supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

/**
 * Fetches the user's profile from the 'profiles' table.
 * @param {string} userId - The UUID of the authenticated user.
 * @returns {Promise<Object|null>} The user profile object or null if not found.
 */
async function getProfile(userId) {
  const { data, error } = await window.supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}