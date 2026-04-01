/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Search,
  User,
  Hash,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Loader2,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

/* ─── Types ─────────────────────────────────────────────── */
interface SearchUser {
  id: number;
  name: string;
  image?: string;
  nativelang?: string;
  learninglang?: string;
  country?: string;
  level?: string;
  bio?: string;
}
interface SearchRoom {
  id: number;
  name: string;
  language?: string;
  members_count?: number;
  description?: string;
}
interface SearchMessage {
  id: number;
  content: string;
  room_id: number;
  room_name?: string;
  author?: string;
  created_at?: string;
}
interface SearchResults {
  users?: SearchUser[];
  rooms?: SearchRoom[];
  messages?: SearchMessage[];
  total?: number;
  page?: number;
  per_page?: number;
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
const PER_PAGE = 10;

type TabType = "all" | "users" | "rooms" | "messages";
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const LANGUAGES = ["es", "en", "pt"] as const;

function resolveAvatar(src?: string) {
  if (!src) return "";
  const t = src.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^data:image\//i.test(t)) return t;
  if (!API_URL) return "";
  return `${API_URL}/${t.replace(/^\/+/, "")}`;
}

/* ─── Page ───────────────────────────────────────────────── */
export default function SearchClient() {
  const t = useTranslations("Search");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") || "";
  const initialTab = (searchParams.get("type") as TabType) || "all";

  const [query, setQuery] = useState(initialQ);
  const [inputVal, setInputVal] = useState(initialQ);
  const [tab, setTab] = useState<TabType>(initialTab);
  const [page, setPage] = useState(1);

  // Filters
  const [filterLanguage, setFilterLanguage] = useState(searchParams.get("language") || "");
  const [filterCountry, setFilterCountry] = useState(searchParams.get("country") || "");
  const [filterLevel, setFilterLevel] = useState(searchParams.get("level") || "");
  const [showFilters, setShowFilters] = useState(false);

  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Fetch ─────────────────────────────────────────────── */
  const doSearch = useCallback(
    async (q: string, activeTab: TabType, pg: number) => {
      if (!q.trim() || q.trim().length < 2) {
        setResults(null);
        return;
      }
      setLoading(true);
      setError("");
      try {
        let endpoint = "";
        const base = `/api/search`;
        const params = new URLSearchParams({ q, page: String(pg), per_page: String(PER_PAGE) });

        if (activeTab === "users") {
          endpoint = `${base}/users?${params}`;
          if (filterLanguage) params.set("language", filterLanguage);
          if (filterCountry) params.set("country", filterCountry);
          if (filterLevel) params.set("level", filterLevel);
          endpoint = `${base}/users?${params}`;
        } else if (activeTab === "messages") {
          if (filterLanguage) params.set("language", filterLanguage);
          endpoint = `${base}/messages?${params}`;
        } else {
          params.set("type", activeTab === "all" ? "all" : activeTab);
          endpoint = `${base}?${params}`;
        }

        const res = await apiFetch(endpoint);
        if (!res.ok) throw new Error("fetch error");
        const data = await res.json();
        setResults(data);
      } catch {
        setError("Error fetching results.");
      } finally {
        setLoading(false);
      }
    },
    [filterLanguage, filterCountry, filterLevel]
  );

  /* Trigger search on query/tab/page/filter change */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch(query, tab, page);
      // Sync URL
      const p = new URLSearchParams();
      if (query) p.set("q", query);
      if (tab !== "all") p.set("type", tab);
      if (filterLanguage) p.set("language", filterLanguage);
      if (filterCountry) p.set("country", filterCountry);
      if (filterLevel) p.set("level", filterLevel);
      if (page > 1) p.set("page", String(page));
      router.replace(`/${locale}/search?${p.toString()}`, { scroll: false });
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tab, page, filterLanguage, filterCountry, filterLevel]);

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      setQuery(inputVal);
      setPage(1);
    }
  }

  function clearFilters() {
    setFilterLanguage("");
    setFilterCountry("");
    setFilterLevel("");
    setPage(1);
  }

  /* ── Derived totals ──────────────────────────────────────── */
  const usersTotal = results?.users?.length ?? 0;
  const roomsTotal = results?.rooms?.length ?? 0;
  const msgsTotal = results?.messages?.length ?? 0;
  const totalItems =
    results?.total ?? (tab === "users" ? usersTotal : tab === "rooms" ? roomsTotal : tab === "messages" ? msgsTotal : usersTotal + roomsTotal + msgsTotal);
  const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE));

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "all", label: t("all"), icon: <Search size={14} /> },
    { id: "users", label: t("users"), icon: <User size={14} /> },
    { id: "rooms", label: t("rooms"), icon: <Hash size={14} /> },
    { id: "messages", label: t("messages"), icon: <MessageCircle size={14} /> },
  ];

  const hasFilters = !!(filterLanguage || filterCountry || filterLevel);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4" style={{ color: "var(--text)" }}>
            {t("searchGlobal")}
          </h1>

          {/* Search bar */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "0 2px 8px var(--shadow)",
            }}
          >
            <Search size={18} style={{ color: "var(--text3)" }} />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={() => { if (inputVal !== query) { setQuery(inputVal); setPage(1); } }}
              placeholder={t("typeToSearch")}
              className="flex-1 bg-transparent text-base outline-none"
              style={{ color: "var(--text)" }}
              autoFocus
            />
            {inputVal && (
              <button onClick={() => { setInputVal(""); setQuery(""); setResults(null); }}>
                <X size={16} style={{ color: "var(--text3)" }} />
              </button>
            )}
            <button
              onClick={() => setShowFilters((s) => !s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={{
                background: showFilters || hasFilters ? "var(--primary-light)" : "var(--surface2)",
                color: showFilters || hasFilters ? "var(--primary)" : "var(--text2)",
              }}
            >
              <SlidersHorizontal size={14} />
              {t("advancedFilters")}
              {hasFilters && (
                <span
                  className="w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold"
                  style={{ background: "var(--primary)", color: "#fff" }}
                >
                  {[filterLanguage, filterCountry, filterLevel].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div
              className="mt-3 p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-3 gap-3"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              {/* Language */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text3)" }}>
                  {t("filterLanguage")}
                </label>
                <select
                  value={filterLanguage}
                  onChange={(e) => { setFilterLanguage(e.target.value); setPage(1); }}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <option value="">{t("filterAny")}</option>
                  {LANGUAGES.map((l) => (
                    <option key={l} value={l}>{l.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Country */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text3)" }}>
                  {t("filterCountry")}
                </label>
                <input
                  type="text"
                  value={filterCountry}
                  onChange={(e) => { setFilterCountry(e.target.value); setPage(1); }}
                  placeholder={t("filterAny")}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
                />
              </div>

              {/* Level */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text3)" }}>
                  {t("filterLevel")}
                </label>
                <select
                  value={filterLevel}
                  onChange={(e) => { setFilterLevel(e.target.value); setPage(1); }}
                  className="w-full text-sm px-3 py-2 rounded-lg border outline-none"
                  style={{ background: "var(--surface2)", borderColor: "var(--border)", color: "var(--text)" }}
                >
                  <option value="">{t("filterAny")}</option>
                  {LEVELS.map((lv) => (
                    <option key={lv} value={lv}>{lv}</option>
                  ))}
                </select>
              </div>

              {hasFilters && (
                <div className="sm:col-span-3 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors duration-150"
                    style={{ color: "var(--text2)", background: "var(--surface2)" }}
                  >
                    <X size={13} />
                    {t("clearFilters")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Tabs ─────────────────────────────────────────── */}
        <div
          className="flex gap-1 mb-5 p-1 rounded-xl w-fit"
          style={{ background: "var(--surface2)" }}
        >
          {tabs.map((tb) => (
            <button
              key={tb.id}
              onClick={() => { setTab(tb.id); setPage(1); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150"
              style={
                tab === tb.id
                  ? { background: "var(--surface)", color: "var(--primary)", boxShadow: "0 1px 4px var(--shadow)" }
                  : { color: "var(--text2)" }
              }
            >
              {tb.icon}
              {tb.label}
            </button>
          ))}
        </div>

        {/* ── Results heading ───────────────────────────────── */}
        {query && (
          <p className="text-sm mb-4" style={{ color: "var(--text3)" }}>
            {t("resultsFor")} &ldquo;<span style={{ color: "var(--text)", fontWeight: 600 }}>{query}</span>&rdquo;
          </p>
        )}

        {/* ── Loading ───────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: "var(--text3)" }}>
            <Loader2 size={20} className="animate-spin" />
            {t("searching")}
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────── */}
        {error && !loading && (
          <div className="py-10 text-center text-sm" style={{ color: "#ef4444" }}>{error}</div>
        )}

        {/* ── No results ───────────────────────────────────── */}
        {!loading && !error && results && !loading &&
          usersTotal === 0 && roomsTotal === 0 && msgsTotal === 0 && (
            <div className="py-16 text-center" style={{ color: "var(--text3)" }}>
              <Search size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">{t("noResults")} &ldquo;{query}&rdquo;</p>
            </div>
          )}

        {/* ── Results ──────────────────────────────────────── */}
        {!loading && !error && results && (
          <div className="space-y-6">
            {/* Users */}
            {(tab === "all" || tab === "users") && usersTotal > 0 && (
              <Section label={t("users")} icon={<User size={15} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.users!.map((u) => (
                    <UserCard key={u.id} user={u} locale={locale} router={router} t={t} />
                  ))}
                </div>
              </Section>
            )}

            {/* Rooms */}
            {(tab === "all" || tab === "rooms") && roomsTotal > 0 && (
              <Section label={t("rooms")} icon={<Hash size={15} />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {results.rooms!.map((r) => (
                    <RoomCard key={r.id} room={r} locale={locale} router={router} t={t} />
                  ))}
                </div>
              </Section>
            )}

            {/* Messages */}
            {(tab === "all" || tab === "messages") && msgsTotal > 0 && (
              <Section label={t("messages")} icon={<MessageCircle size={15} />}>
                <div className="space-y-2">
                  {results.messages!.map((m) => (
                    <MessageCard key={m.id} msg={m} locale={locale} router={router} t={t} />
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-40"
              style={{ background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
            >
              <ChevronLeft size={15} />
              {t("prev")}
            </button>

            <span className="text-sm px-2" style={{ color: "var(--text3)" }}>
              {t("page")} <strong style={{ color: "var(--text)" }}>{page}</strong> {t("of")}{" "}
              <strong style={{ color: "var(--text)" }}>{totalPages}</strong>
            </span>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 disabled:opacity-40"
              style={{ background: "var(--surface)", color: "var(--text2)", border: "1px solid var(--border)" }}
            >
              {t("next")}
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Section wrapper ──────────────────────────────────────── */
function Section({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="flex items-center gap-2 mb-3 pb-2 border-b"
        style={{ borderColor: "var(--border)" }}
      >
        <span style={{ color: "var(--primary)" }}>{icon}</span>
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text2)" }}>
          {label}
        </h2>
      </div>
      {children}
    </div>
  );
}

/* ─── User Card ─────────────────────────────────────────────── */
function UserCard({ user, locale, router, t }: { user: SearchUser; locale: string; router: any; t: any }) {
  const avatar = resolveAvatar(user.image);
  return (
    <button
      onClick={() => router.push(`/${locale}/profile/${user.id}`)}
      className="flex items-center gap-3 p-3 rounded-xl border text-left w-full transition-all duration-150 hover:border-[var(--primary)] hover:shadow-sm"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "0 1px 3px var(--shadow)",
      }}
    >
      {avatar ? (
        <img src={avatar} alt={user.name} className="w-11 h-11 rounded-full object-cover shrink-0" />
      ) : (
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-base font-bold"
          style={{ background: "var(--primary-light)", color: "var(--primary)" }}
        >
          {user.name?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{user.name}</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {user.country && (
            <Tag>{user.country}</Tag>
          )}
          {user.level && (
            <Tag accent>{user.level}</Tag>
          )}
          {user.nativelang && (
            <Tag>{user.nativelang.toUpperCase()}</Tag>
          )}
        </div>
      </div>
    </button>
  );
}

/* ─── Room Card ─────────────────────────────────────────────── */
function RoomCard({ room, locale, router, t }: { room: SearchRoom; locale: string; router: any; t: any }) {
  return (
    <button
      onClick={() => router.push(`/${locale}/chat?room=${room.id}`)}
      className="flex items-center gap-3 p-3 rounded-xl border text-left w-full transition-all duration-150 hover:border-[var(--primary)] hover:shadow-sm"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "0 1px 3px var(--shadow)",
      }}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: "var(--primary-light)" }}
      >
        <Hash size={20} style={{ color: "var(--primary)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>{room.name}</p>
        <div className="flex gap-1.5 mt-1">
          {room.language && <Tag>{room.language.toUpperCase()}</Tag>}
          {room.members_count != null && <Tag>{room.members_count} 👥</Tag>}
        </div>
      </div>
    </button>
  );
}

/* ─── Message Card ──────────────────────────────────────────── */
function MessageCard({ msg, locale, router, t }: { msg: SearchMessage; locale: string; router: any; t: any }) {
  return (
    <button
      onClick={() => router.push(`/${locale}/chat?room=${msg.room_id}&msg=${msg.id}`)}
      className="flex items-start gap-3 p-3 rounded-xl border text-left w-full transition-all duration-150 hover:border-[var(--primary)] hover:shadow-sm"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "0 1px 3px var(--shadow)",
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: "var(--surface2)" }}
      >
        <MessageCircle size={15} style={{ color: "var(--text2)" }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate" style={{ color: "var(--text)" }}>{msg.content}</p>
        <div className="flex gap-2 mt-1">
          {msg.room_name && <Tag>#{msg.room_name}</Tag>}
          {msg.author && <Tag>{msg.author}</Tag>}
        </div>
      </div>
    </button>
  );
}

/* ─── Tag ────────────────────────────────────────────────────── */
function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium"
      style={{
        background: accent ? "var(--primary-light)" : "var(--surface2)",
        color: accent ? "var(--primary)" : "var(--text3)",
      }}
    >
      {children}
    </span>
  );
}
