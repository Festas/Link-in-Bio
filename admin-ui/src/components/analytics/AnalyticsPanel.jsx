import { useState, useEffect } from 'react';
import { BarChart3, Eye, MousePointer, Users, TrendingUp, Globe } from 'lucide-react';
import * as api from '../../utils/api.js';

export default function AnalyticsPanel() {
  const [data, setData] = useState(null);
  const [pageviews, setPageviews] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [analytics, pv] = await Promise.all([
        api.getAnalytics().catch(() => null),
        api.getPageviewCount().catch(() => ({ count: 0 })),
      ]);
      setData(analytics);
      setPageviews(pv.count || 0);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const totalClicks = data?.total_clicks || 0;
  const topLinks = data?.top_links || [];
  const topReferrers = data?.top_referrers || [];
  const clicksByDay = data?.clicks_per_day || [];

  return (
    <div className="p-3 space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard icon={Eye} label="Page Views" value={pageviews} color="#6366f1" />
        <StatCard icon={MousePointer} label="Total Clicks" value={totalClicks} color="#22c55e" />
        <StatCard
          icon={TrendingUp}
          label="CTR"
          value={pageviews > 0 ? `${((totalClicks / pageviews) * 100).toFixed(1)}%` : '0%'}
          color="#f59e0b"
        />
        <StatCard
          icon={BarChart3}
          label="Today"
          value={clicksByDay.length > 0 ? clicksByDay[clicksByDay.length - 1]?.clicks || 0 : 0}
          color="#ef4444"
        />
      </div>

      {/* Sparkline (simple bar chart) */}
      {clicksByDay.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-[var(--editor-text-muted)] uppercase tracking-wider mb-2">
            Last 30 Days
          </h3>
          <div className="flex items-end gap-0.5 h-16 bg-[var(--editor-bg)] rounded-xl p-2">
            {clicksByDay.slice(-30).map((day, i) => {
              const max = Math.max(...clicksByDay.slice(-30).map(d => d.clicks || 0), 1);
              const h = Math.max(((day.clicks || 0) / max) * 100, 2);
              return (
                <div
                  key={i}
                  className="flex-1 bg-indigo-500/60 hover:bg-indigo-400 rounded-t-sm transition-colors"
                  style={{ height: `${h}%` }}
                  title={`${day.date}: ${day.clicks} clicks`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Top Links */}
      {topLinks.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-[var(--editor-text-muted)] uppercase tracking-wider mb-2">
            Top Links
          </h3>
          <div className="space-y-1">
            {topLinks.slice(0, 8).map((link, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--editor-bg)]">
                <span className="text-xs text-[var(--editor-text-muted)] w-4">{i + 1}</span>
                <span className="flex-1 text-xs truncate">{link.title || `Item #${link.item_id}`}</span>
                <span className="text-xs font-medium text-indigo-400">{link.clicks}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Referrers */}
      {topReferrers.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-[var(--editor-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
            <Globe size={12} />
            Top Referrers
          </h3>
          <div className="space-y-1">
            {topReferrers.slice(0, 5).map((ref, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--editor-bg)]">
                <span className="flex-1 text-xs truncate">{ref.referer || 'Direct'}</span>
                <span className="text-xs font-medium text-emerald-400">{ref.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh */}
      <button
        onClick={loadAnalytics}
        className="w-full py-2 text-xs text-[var(--editor-text-muted)] hover:text-[var(--editor-text)] border border-[var(--editor-border)] rounded-xl hover:bg-[var(--editor-surface-hover)] transition-colors"
      >
        Refresh Analytics
      </button>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="p-3 rounded-xl bg-[var(--editor-bg)] border border-[var(--editor-border)]">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} style={{ color }} />
        <span className="text-[10px] text-[var(--editor-text-muted)] uppercase">{label}</span>
      </div>
      <div className="text-lg font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
    </div>
  );
}
