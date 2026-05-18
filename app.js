// app.js
(function () {
  "use strict";

  const CFG = {
    url: "%%SUPABASE_URL%%",
    key: "%%SUPABASE_ANON_KEY%%",
  };

  window.supabase = supabase.createClient(CFG.url, CFG.key);

  window.App = {
    user: null,
    profile: null,
    session: null,

    async init() {
      await this.initAuth();
      this.initToasts();
      this.initMobileMenu();
    },

    async initAuth() {
      const {
        data: { session },
      } = await window.supabase.auth.getSession();
      this.session = session;
      if (session) {
        this.user = session.user;
        await this.loadProfile();
      }
      window.supabase.auth.onAuthStateChange(async (event, session) => {
        this.session = session;
        this.user = session?.user || null;
        if (session) await this.loadProfile();
        else this.profile = null;
      });
    },

    async loadProfile() {
      if (!this.user) return;
      const { data, error } = await window.supabase
        .from("profiles")
        .select("*")
        .eq("id", this.user.id)
        .single();
      if (!error) this.profile = data;
    },

    async requireAuth() {
      if (!this.session) {
        const {
          data: { session },
        } = await window.supabase.auth.getSession();
        this.session = session;
        if (session) {
          this.user = session.user;
          await this.loadProfile();
        }
      }
      if (!this.session) {
        window.location.href = "login.html";
        return false;
      }
      return true;
    },

    async requireAdmin() {
      const ok = await this.requireAuth();
      if (!ok) return false;
      if (this.profile?.role !== "admin") {
        window.location.href = "dashboard.html";
        return false;
      }
      return true;
    },

    async login(email, password) {
      const { data, error } = await window.supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      this.session = data.session;
      this.user = data.user;
      await this.loadProfile();
      return data;
    },

    async register(email, password, fullName) {
      const { data, error } = await window.supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      if (data.user) {
        await window.supabase
          .from("profiles")
          .insert([
            { id: data.user.id, email, full_name: fullName, role: "staff" },
          ]);
      }
      return data;
    },

    async logout() {
      await window.supabase.auth.signOut();
      window.location.href = "login.html";
    },

    initToasts() {
      if (!document.getElementById("toast-container")) {
        const el = document.createElement("div");
        el.id = "toast-container";
        el.className = "fixed top-4 left-4 z-[60] flex flex-col gap-2";
        document.body.appendChild(el);
      }
    },

    toast(msg, type = "info") {
      const box = document.getElementById("toast-container");
      const map = {
        success: "bg-emerald-500",
        error: "bg-rose-500",
        info: "bg-indigo-500",
      };
      const el = document.createElement("div");
      el.className = `${map[type]} text-white px-4 py-3 rounded-xl shadow-xl transform transition-all duration-300 translate-x-10 opacity-0 flex items-center gap-3 min-w-[300px] backdrop-blur-sm bg-opacity-90`;
      el.innerHTML = `<span class="text-sm font-semibold">${msg}</span>`;
      box.appendChild(el);
      requestAnimationFrame(() => {
        el.classList.remove("translate-x-10", "opacity-0");
      });
      setTimeout(() => {
        el.classList.add("translate-x-10", "opacity-0");
        setTimeout(() => el.remove(), 300);
      }, 3500);
    },

    fmtDate(d) {
      if (!d) return "-";
      return new Date(d).toLocaleDateString("ar-SA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    statusStyle(s) {
      const m = {
        pending: "bg-amber-100 text-amber-700 border-amber-200",
        approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
        rejected: "bg-rose-100 text-rose-700 border-rose-200",
        in_progress: "bg-cyan-100 text-cyan-700 border-cyan-200",
      };
      return m[s] || "bg-slate-100 text-slate-700 border-slate-200";
    },

    statusLabel(s) {
      const m = {
        pending: "قيد الانتظار",
        approved: "تمت الموافقة",
        rejected: "مرفوض",
        in_progress: "قيد التنفيذ",
      };
      return m[s] || s;
    },

    setLoading(el, v) {
      if (!el) return;
      if (v) {
        el.disabled = true;
        if (!el.dataset.orig) el.dataset.orig = el.innerHTML;
        el.innerHTML = `<svg class="animate-spin h-5 w-5 mx-auto" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
      } else {
        el.disabled = false;
        el.innerHTML = el.dataset.orig || "";
      }
    },

    renderUserHeader() {
      const el = document.getElementById("header-user");
      if (!el || !this.profile) return;
      el.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shadow-md">
            ${(this.profile.full_name || this.user.email || "؟").charAt(0).toUpperCase()}
          </div>
          <div class="hidden sm:block text-right">
            <p class="text-sm font-bold text-slate-700 leading-tight">${this.profile.full_name || this.user.email}</p>
            <p class="text-[11px] text-slate-500 font-medium uppercase tracking-wide">${this.profile.role === "admin" ? "مدير النظام" : "موظف"}</p>
          </div>
          <button onclick="App.logout()" class="mr-2 p-2 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-all" title="تسجيل الخروج">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
          </button>
        </div>`;
    },

    initMobileMenu() {
      const t = document.getElementById("mobile-toggle");
      const s = document.getElementById("sidebar");
      const b = document.getElementById("sidebar-backdrop");
      if (!t || !s) return;
      t.addEventListener("click", () => {
        const hidden = s.classList.contains("translate-x-full");
        if (hidden) {
          s.classList.remove("translate-x-full");
          s.classList.add("translate-x-0");
          if (b) {
            b.classList.remove("hidden");
          }
        } else {
          s.classList.add("translate-x-full");
          s.classList.remove("translate-x-0");
          if (b) {
            b.classList.add("hidden");
          }
        }
      });
      if (b)
        b.addEventListener("click", () => {
          s.classList.add("translate-x-full");
          s.classList.remove("translate-x-0");
          b.classList.add("hidden");
        });
    },

    renderSidebar(active, role) {
      const nav = document.getElementById("sidebar-nav");
      if (!nav) return;
      const isAdmin = role === "admin";
      const items = isAdmin
        ? [
            {
              id: "admin",
              label: "لوحة المدير",
              href: "admin.html",
              icon: '<<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>',
            },
            {
              id: "requests",
              label: "الطلبات",
              href: "admin.html#requests",
              icon: '<<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>',
            },
            {
              id: "users",
              label: "المستخدمين",
              href: "admin.html#users",
              icon: '<<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm6 0h-6v-1a6 6 0 0112 0v1z"></path></svg>',
            },
          ]
        : [
            {
              id: "dashboard",
              label: "لوحة التحكم",
              href: "dashboard.html",
              icon: '<<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>',
            },
            {
              id: "myrequests",
              label: "طلباتي",
              href: "dashboard.html#requests",
              icon: '<<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>',
            },
          ];
      nav.innerHTML = items
        .map(
          (it) => `
        <a href="${it.href}" class="group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${active === it.id ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-white/70 hover:text-indigo-600"}">
          ${it.icon}
          <span class="font-medium text-sm">${it.label}</span>
        </a>`,
        )
        .join("");
    },
  };

  App.init();
})();

