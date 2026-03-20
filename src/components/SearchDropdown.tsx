"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Search, X, User, Hash, MessageCircle, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";

/* ─── Types ──────────────────────────────────────────────── */
interface SearchUser {
  id: number;
  name: string;
  image?: string;
  nativelang?: string;
  learninglang?: string;
  country?: string;
  level?: string;
}

interface SearchRoom {
  id: number;
  name: string;
  language?: string;
  members_count?: number;
}

interface SearchMessage {
  id: number;
  content: string;
  room_id: number;
  room_name?: string;
  author?: string;
}

interface SearchResults {
  users?: SearchUser[];
  rooms?: SearchRoom[];
  messages?: SearchMessage[];
}

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

function resolveAvatar(src?: string) {
  if (!src) return "";
  const t = src.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^data:image\//i.test(t)) return t;
  if (!API_URL) return "";
  return `${API_URL}/${t.replace(/^\/+/, "")}`;
}

/* ─── Main component ─────────────────────────────────────── */
export default function SearchDropdown() {
  const t = useTranslations("Search");
  const ht = useTranslations("Header");
  const locale = useLocale();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Close on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Debounced search */
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(`/api/search?q=${encodeURIComponent(q)}&type=all`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  function handleClear() {
    setQuery("");
    setResults(null);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && query.trim()) {
      setOpen(false);
      router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function goToAll() {
    if (!query.trim()) return;
    setOpen(false);
    router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
  }

  const hasResults =
    (results?.users?.length ?? 0) > 0 ||
    (results?.rooms?.length ?? 0) > 0 ||
    (results?.messages?.length ?? 0) > 0;

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-[260px] md:max-w-[320px]">
      {/* Input */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-150"
        style={{
          background: "var(--surface2)",
          borderColor: open ? "var(--primary)" : "var(--border)",
          boxShadow: open ? "0 0 0 2px var(--primary-light)" : "none",
        }}
      >
        <Search size={15} className="shrink-0" style={{ color: "var(--text3)" }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder={t("placeholder")}
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
          style={{ color: "var(--text)" }}
          aria-label={ht("search")}
          autoComplete="off"
        />
        {loading && <Loader2 size={14} className="shrink-0 animate-spin" style={{ color: "var(--text3)" }} />}
        {!loading && query && (
          <button onClick={handleClear} className="shrink-0" aria-label="Clear">
            <X size={14} style={{ color: "var(--text3)" }} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute top-full mt-2 w-full min-w-[300px] rounded-xl border overflow-hidden z-[200]"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "0 8px 30px var(--shadow)",
          }}
        >
          {loading && !results && (
            <div className="flex items-center justify-center gap-2 py-5 text-sm" style={{ color: "var(--text3)" }}>
              <Loader2 size={16} className="animate-spin" />
              {t("searching")}
            </div>
          )}

          {!loading && results && !hasResults && (
            <div className="py-5 text-center text-sm" style={{ color: "var(--text3)" }}>
              {t("noResults")} &ldquo;{query}&rdquo;
            </div>
          )}

          {results && hasResults && (
            <div className="max-h-[420px] overflow-y-auto">
              {/* Users */}
              {(results.users?.length ?? 0) > 0 && (
                <Section label={t("users")} icon={<User size={13} />}>
                  {results.users!.slice(0, 4).map((u) => (
                    <ResultItem
                      key={`u-${u.id}`}
                      onClick={() => {
                        setOpen(false);
                        router.push(`/${locale}/profile/${u.id}`);
                      }}
                    >
                      <Avatar src={resolveAvatar(u.image)} name={u.name} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{u.name}</p>
                        {(u.country || u.level) && (
                          <p className="text-xs truncate" style={{ color: "var(--text3)" }}>
                            {[u.country, u.level].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </ResultItem>
                  ))}
                </Section>
              )}

              {/* Rooms */}
              {(results.rooms?.length ?? 0) > 0 && (
                <Section label={t("rooms")} icon={<Hash size={13} />}>
                  {results.rooms!.slice(0, 3).map((r) => (
                    <ResultItem
                      key={`r-${r.id}`}
                      onClick={() => {
                        setOpen(false);
                        router.push(`/${locale}/chat?room=${r.id}`);
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "var(--primary-light)" }}
                      >
                        <Hash size={15} style={{ color: "var(--primary)" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{r.name}</p>
                        {r.language && (
                          <p className="text-xs" style={{ color: "var(--text3)" }}>{r.language}</p>
                        )}
                      </div>
                    </ResultItem>
                  ))}
                </Section>
              )}

              {/* Messages */}
              {(results.messages?.length ?? 0) > 0 && (
                <Section label={t("messages")} icon={<MessageCircle size={13} />}>
                  {results.messages!.slice(0, 3).map((m) => (
                    <ResultItem
                      key={`m-${m.id}`}
                      onClick={() => {
                        setOpen(false);
                        router.push(`/${locale}/chat?room=${m.room_id}&msg=${m.id}`);
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "var(--surface2)" }}
                      >
                        <MessageCircle size={15} style={{ color: "var(--text2)" }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm truncate" style={{ color: "var(--text)" }}>{m.content}</p>
                        {m.room_name && (
                          <p className="text-xs" style={{ color: "var(--text3)" }}>#{m.room_name}</p>
                        )}
                      </div>
                    </ResultItem>
                  ))}
                </Section>
              )}
            </div>
          )}

          {/* View all */}
          {results && hasResults && (
            <button
              onClick={goToAll}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-t transition-colors duration-150"
              style={{
                borderColor: "var(--border)",
                color: "var(--primary)",
                background: "var(--surface2)",
              }}
            >
              <Search size={14} />
              {t("viewAll")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */
function Section({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--text3)", background: "var(--surface2)" }}
      >
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function ResultItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors duration-100 hover:bg-[var(--surface2)]"
    >
      {children}
    </button>
  );
}

function Avatar({ src, name }: { src: string; name: string }) {
  const initials = name ? name[0].toUpperCase() : "?";
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-8 h-8 rounded-full object-cover shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
      style={{ background: "var(--primary-light)", color: "var(--primary)" }}
    >
      {initials}
    </div>
  );
}
