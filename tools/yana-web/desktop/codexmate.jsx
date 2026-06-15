// Yana AI — Codexmate launcher (X-Frame-Options blocks iframe embed; use tab instead)
const { useState, useEffect, useRef } = React;

function CodemateTool() {
  const [port, setPort]     = useState(() => localStorage.getItem("yana.codexmate.port") || "8080");
  const [status, setStatus] = useState(null); // null | "checking" | "up" | "down"
  const inputRef = useRef(null);

  function check(p) {
    setStatus("checking");
    fetch("/api/codexmate/status?port=" + encodeURIComponent(p || port))
      .then(r => r.ok ? r.json() : null)
      .then(d => setStatus(d && d.up ? "up" : "down"))
      .catch(() => setStatus("down"));
  }

  useEffect(() => { check(port); }, []);

  function savePort(v) {
    const safe = v.trim();
    if (!safe) return;
    localStorage.setItem("yana.codexmate.port", safe);
    setPort(safe);
    check(safe);
  }

  // In Cloud Shell / remote proxy, hostname looks like "8081-abc.cloudshell.dev"
  // — replace the leading port number to reach a different port through the proxy.
  // Locally, fall back to direct 127.0.0.1:port.
  function buildUrl(p) {
    const m = window.location.hostname.match(/^(\d+)-(.+)$/);
    if (m) return window.location.protocol + "//" + p + "-" + m[2];
    return "http://127.0.0.1:" + p;
  }
  const url = buildUrl(port);

  return (
    <div data-screen-label="Codexmate" style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
      <PageHeader
        title="Codexmate"
        sub={L(
          "Claude Code session manager · agent tasks · config health",
          "Quản lý phiên Claude Code · nhiệm vụ agent · kiểm tra cấu hình",
        )} />

      <div className="glass" style={{
        borderRadius: "var(--r-lg)", padding: "var(--pad-card)",
        display: "flex", flexDirection: "column", gap: 20, maxWidth: 560,
      }}>
        {/* Status row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className={"dot " + (status === "up" ? "on" : "off")} style={{ flex: "none" }} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>
            {status === "checking"
              ? L("Checking…", "Đang kiểm tra…")
              : status === "up"
                ? L("Codexmate is running", "Codexmate đang chạy")
                : L("Codexmate is not running", "Codexmate chưa chạy")}
          </span>
        </div>

        {/* Port config */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--ink-2)" }}>{L("Port", "Cổng")}</span>
          <input
            ref={inputRef}
            defaultValue={port}
            onBlur={e => savePort(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") savePort(e.target.value); }}
            placeholder="8080"
            style={{
              width: 72, padding: "5px 10px", borderRadius: 8,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--ink)", fontSize: 13, fontFamily: "inherit",
            }}
          />
          <button
            onClick={() => check(inputRef.current ? inputRef.current.value : port)}
            style={{
              padding: "5px 13px", borderRadius: 8,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--ink-2)", cursor: "pointer",
              fontSize: 13, fontFamily: "inherit",
            }}>
            {L("Check", "Kiểm tra")}
          </button>
        </div>

        {/* Open button — primary CTA */}
        {status === "up" ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, alignSelf: "flex-start",
              padding: "10px 22px", borderRadius: "var(--r-sm)",
              background: "var(--primary)", color: "white",
              fontSize: 14, fontWeight: 500, textDecoration: "none",
              transition: "opacity .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
            {Icons.code(15)}
            {L("Open Codexmate ↗", "Mở Codexmate ↗")}
          </a>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
              {L(
                "Start Codexmate first, then click Check above.",
                "Khởi động Codexmate trước rồi bấm Kiểm tra.",
              )}
            </div>
            <pre style={{
              margin: 0, padding: "11px 14px", borderRadius: "var(--r-sm)",
              background: "rgba(var(--shadow-rgb), .08)",
              fontSize: 12.5,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
              color: "var(--ink-2)",
            }}>{"CODEXMATE_PORT=" + port + " codexmate run"}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

window.CodemateTool = CodemateTool;
