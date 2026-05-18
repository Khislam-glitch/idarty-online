// ─── Supabase config (injected at build time by build.sh) ────────
const SUPABASE_URL      = "%%SUPABASE_URL%%";
const SUPABASE_ANON_KEY = "%%SUPABASE_ANON_KEY%%";
// ─────────────────────────────────────────────────────────────────

// Safety guard: catch missing env vars or CDN load failure
if (!SUPABASE_URL || SUPABASE_URL.includes("%%") ||
    !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("%%")) {
  console.error("Supabase env vars not injected. Run: source .env && bash build.sh");
}

if (typeof window.supabase === "undefined") {
  console.error("Supabase CDN failed to load. Check your internet connection.");
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth helpers ──────────────────────────────────────────────────

async function requireAuth() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "login.html"; return null; }
    return user;
  } catch (err) {
    console.error("requireAuth error:", err);
    window.location.href = "login.html";
    return null;
  }
}

async function getProfile(userId) {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("getProfile error:", err);
    return null;
  }
}

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "login.html";
}

// ── Requests helpers ──────────────────────────────────────────────

async function submitRequest(payload) {
  const { data, error } = await supabase
    .from("requests")
    .insert([{ ...payload, status: "pending" }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function fetchAllRequests(statusFilter) {
  let query = supabase
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (statusFilter) query = query.eq("status", statusFilter);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

async function fetchUserRequests(userId) {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function updateRequestStatus(requestId, newStatus) {
  const { error } = await supabase
    .from("requests")
    .update({ status: newStatus })
    .eq("id", requestId);
  if (error) throw error;
}

function subscribeToRequests(callback) {
  return supabase
    .channel("requests-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "requests" },
      (payload) => callback(payload)
    )
    .subscribe();
}
