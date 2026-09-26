import { useEffect, useState } from "react";
import { Bell, ExternalLink, RefreshCw } from "lucide-react";

// App.jsx: {page === "notifications" && <Notifications api={api} goal={profile.goal} />}
export default function Notifications({ api, goal }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api("/notifications"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal]);

  const grouped = {};
  (data?.sources || []).forEach((s) => {
    grouped[s.category] = grouped[s.category] || [];
    grouped[s.category].push(s);
  });

  return (
    <div className="stack">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h3>Where to look for openings</h3>
            <p className="dim">
              {data?.note || "Official portal links for your goal. Always check the site itself for current openings and deadlines."}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>

        {error && <div className="notice" role="alert"><Bell size={18} /><div><strong>Could not load</strong><p>{error}</p></div></div>}
        {loading && !data && <p className="dim">Loading...</p>}
      </section>

      {Object.entries(grouped).map(([category, items]) => (
        <section className="panel" key={category}>
          <h3 style={{ marginBottom: 12 }}>{category}</h3>
          <div className="notif-list">
            {items.map((item) => (
              <a
                className="notif-row"
                key={item.name}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{item.name}</span>
                <ExternalLink size={15} />
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}