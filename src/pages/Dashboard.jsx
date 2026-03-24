import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar.jsx';
import { fetchLectures } from '../services/api.js';

function Dashboard() {
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const data = await fetchLectures();
        if (mounted) setLectures(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) setError(err.message || 'Failed to load dashboard data.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = lectures.length;
    const now = new Date();
    const isSameDay = (a, b) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();

    const todayCount = lectures.filter((l) => {
      if (!l?.createdAt) return false;
      const d = new Date(l.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      return isSameDay(d, now);
    }).length;

    const plan = 'Free';
    const dailyLimit = 5;
    const remaining = Math.max(0, dailyLimit - todayCount);
    const usedPct = Math.min(100, Math.round((todayCount / dailyLimit) * 100));

    return { total, todayCount, plan, dailyLimit, remaining, usedPct };
  }, [lectures]);

  const recentLectures = useMemo(() => lectures.slice(0, 3), [lectures]);

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const shortLink = (link) => {
    if (!link) return 'YouTube Lecture';
    try {
      const url = new URL(link);
      const id =
        url.hostname === 'youtu.be'
          ? url.pathname.replace('/', '')
          : url.searchParams.get('v') || url.pathname.split('/').pop();
      return id ? `Lecture • ${id.slice(0, 10)}` : 'YouTube Lecture';
    } catch {
      return 'YouTube Lecture';
    }
  };

  return (
    <div className="cognix-workspace">
      <div className="background-decorations">
        <div className="glow-orb top-left" />
        <div className="glow-orb bottom-right" />
      </div>

      <div className="dashboard-shell">
        <Navbar />
        <div className="dashboard-body">
          <Sidebar />
          <main className="dashboard-main">
            <section className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] p-6 md:p-8">
              <h2 className="text-2xl md:text-3xl font-semibold text-white">Welcome to Cognix</h2>
              <p className="mt-2 text-sm md:text-base text-slate-300/80 max-w-3xl">
                Generate structured notes from YouTube lectures, visualize concepts, and build your own
                knowledge base.
              </p>
            </section>

            {error && <div className="error-alert">{error}</div>}

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/lectures"
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/6 to-white/2 backdrop-blur-xl p-5 shadow-[0_18px_50px_rgba(0,0,0,0.4)] hover:bg-white/10 transition cursor-pointer"
                title="View all saved lectures"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-400/20 flex items-center justify-center">
                    📚
                  </div>
                  <div className="text-slate-300 text-sm">Total Lectures</div>
                </div>
                <div className="mt-3 text-3xl font-semibold text-white">{loading ? '—' : stats.total}</div>
                <div className="mt-1 text-xs text-slate-400">lectures summarized</div>
              </Link>

              <Link
                to="/lectures?filter=today"
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/6 to-white/2 backdrop-blur-xl p-5 shadow-[0_18px_50px_rgba(0,0,0,0.4)] hover:bg-white/10 transition cursor-pointer"
                title="View lectures generated today"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center">
                    ✅
                  </div>
                  <div className="text-slate-300 text-sm">Lectures Today</div>
                </div>
                <div className="mt-3 text-3xl font-semibold text-white">{loading ? '—' : stats.todayCount}</div>
                <div className="mt-1 text-xs text-slate-400">lectures generated today</div>
              </Link>

              <button
                type="button"
                onClick={() => setShowUpgrade(true)}
                className="text-left rounded-2xl border border-white/10 bg-gradient-to-br from-white/6 to-white/2 backdrop-blur-xl p-5 shadow-[0_18px_50px_rgba(0,0,0,0.4)] hover:bg-white/10 transition cursor-pointer"
                title="View plan details"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-sky-500/15 border border-sky-400/20 flex items-center justify-center">
                    👑
                  </div>
                  <div className="text-slate-300 text-sm">Plan</div>
                </div>
                <div className="mt-3 text-3xl font-semibold text-white">{stats.plan}</div>
                <div className="mt-1 text-xs text-slate-400">Cognix Pro available</div>
              </button>

              <Link
                to="/new"
                className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/15 to-white/2 backdrop-blur-xl p-5 shadow-[0_18px_50px_rgba(0,0,0,0.4)] hover:bg-white/10 transition cursor-pointer"
                title="Generate a new lecture"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/15 border border-orange-400/20 flex items-center justify-center">
                    🕒
                  </div>
                  <div className="text-slate-300 text-sm">Remaining Limit</div>
                </div>
                <div className="mt-3 text-3xl font-semibold text-white">
                  {loading ? '—' : `${stats.remaining} / ${stats.dailyLimit}`}
                </div>
                <div className="mt-1 text-xs text-slate-400">lectures remaining today</div>
              </Link>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                  <div className="text-white font-semibold">Recent Lectures</div>
                  <Link to="/lectures" className="text-sm text-slate-300 hover:text-white transition">
                    View All ❯
                  </Link>
                </div>

                <div className="divide-y divide-white/10">
                  {loading ? (
                    <div className="px-6 py-6 text-slate-300/80">Loading...</div>
                  ) : recentLectures.length === 0 ? (
                    <div className="px-6 py-6 text-slate-300/80">
                      No lectures yet. Generate your first one from{' '}
                      <Link className="text-purple-300 hover:text-white" to="/new">
                        New Lecture
                      </Link>
                      .
                    </div>
                  ) : (
                    recentLectures.map((l, idx) => (
                      <div key={l._id || idx} className="px-6 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-red-500/15 border border-red-400/20 flex items-center justify-center">
                            ▶
                          </div>
                          <div className="min-w-0">
                            <div className="text-white font-medium truncate">{shortLink(l.youtubeLink)}</div>
                            <div className="text-xs text-slate-400">{formatDate(l.createdAt)}</div>
                          </div>
                        </div>
                        <Link
                          to={`/lectures?open=${encodeURIComponent(l._id || '')}`}
                          className="rounded-lg bg-white/5 border border-white/10 px-4 py-2 text-sm text-slate-200 hover:bg-white/10 transition"
                        >
                          View
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] p-5 flex flex-col gap-4">
                <div>
                  <div className="text-white font-semibold">Usage This Day</div>
                  <div className="mt-2 text-slate-300 text-sm">
                    <span className="text-white font-semibold">{loading ? '—' : stats.todayCount}</span>
                    <span className="text-slate-400"> / {stats.dailyLimit}</span> lectures used today
                  </div>
                  <div className="mt-3 h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-purple-500"
                      style={{ width: `${loading ? 0 : stats.usedPct}%` }}
                    />
                  </div>
                  <div className="mt-3 text-xs text-slate-400">
                    Upgrade to Cognix Pro for unlimited access
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="text-white font-semibold mb-3">Quick Actions</div>
                  <div className="flex flex-col gap-3">
                    <Link
                      to="/new"
                      className="w-full rounded-xl px-4 py-3 bg-gradient-to-r from-emerald-500/80 to-cyan-500/80 hover:opacity-95 transition text-white font-medium flex items-center justify-center gap-2"
                    >
                      <span className="text-lg">＋</span> Generate New Lecture
                    </Link>
                    <Link
                      to="/lectures"
                      className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 transition text-slate-100 font-medium flex items-center justify-center gap-2"
                    >
                      📚 View My Lectures
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            {showUpgrade && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
                role="dialog"
                aria-modal="true"
                onClick={() => setShowUpgrade(false)}
              >
                <div
                  className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/70 backdrop-blur-xl shadow-[0_30px_90px_rgba(0,0,0,0.65)] p-6"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-white text-xl font-semibold">Upgrade to Cognix Pro</div>
                      <div className="mt-1 text-sm text-slate-300/80">
                        Pro unlocks unlimited lecture generation and a growing set of premium features.
                      </div>
                    </div>
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-slate-200 hover:bg-white/10 transition"
                      onClick={() => setShowUpgrade(false)}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-white font-semibold">Free</div>
                      <div className="mt-1 text-sm text-slate-300/80">Up to 5 lectures/day</div>
                    </div>
                    <div className="rounded-xl border border-purple-400/20 bg-purple-500/10 p-4">
                      <div className="text-white font-semibold">Pro</div>
                      <div className="mt-1 text-sm text-slate-300/80">Unlimited lectures</div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3 justify-end">
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-slate-200 hover:bg-white/10 transition"
                      onClick={() => setShowUpgrade(false)}
                    >
                      Not now
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2 text-white font-medium hover:opacity-95 transition"
                      onClick={() => {
                        // UI-only for now (no billing endpoint yet)
                        window.open('https://render.com/', '_blank', 'noopener,noreferrer');
                      }}
                    >
                      Upgrade
                    </button>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

