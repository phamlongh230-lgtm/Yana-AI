// Yana Mobile — Agents + Providers + Settings
/* ---------- Agents ---------- */
function MAgentCard({ a }) {
  return (
    <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "15px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 12, flex: "none", display: "grid", placeItems: "center",
          fontSize: 14.5, fontWeight: 500, color: "var(--primary)",
          background: "var(--primary-soft)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)",
        }}>{a.name[0]}</div>
        <div style={{ lineHeight: 1.25, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 500, display: "flex", alignItems: "center", gap: 7 }}>
            {a.name}
            {a.core && <span className="chip gold" style={{ fontSize: 10, padding: "1px 7px" }}>Core</span>}
          </div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{a.role}</div>
        </div>
        <span className={"dot " + (a.status === "active" ? "on" : "idle")}></span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{a.specialty}</div>
      <div style={{
        fontSize: 12, color: a.status === "active" ? "var(--primary)" : "var(--ink-3)",
        display: "flex", alignItems: "center", gap: 7, paddingTop: 9, borderTop: "1px solid var(--border)",
      }}>
        {a.status === "active" ? Icons.spark(13) : Icons.clock(13)} {a.load}
      </div>
    </div>
  );
}

function MAgents() {
  const D = window.YANA;
  const [filter, setFilter] = React.useState("all");
  const filters = [["all", L("All", "Tất cả", "전체", "全部")], ["active", L("Active", "Đang chạy", "진행 중", "进行中")], ["idle", L("Idle", "Nghỉ", "대기", "空闲")]];
  const list = filter === "all" ? D.agents : D.agents.filter((a) => a.status === filter);
  const rest = Math.max(0, D.stats.agents - D.agents.length);
  return (
    <div data-screen-label="Agent Space" style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
      <MHead title={L("Agents", "Tác nhân", "에이전트", "智能体")} sub={D.stats.agentsActive + L(" of ", " / ", " / ", " / ") + D.stats.agents + L(" active · Navigator orchestrates, Sentinel reviews", " hoạt động · Navigator điều phối, Sentinel giám sát", " 활성 · Navigator가 조율, Sentinel이 검토", " 活跃 · Navigator 编排，Sentinel 审查")}>
        <button className="pill-primary" style={{ padding: "8px 13px" }}>{Icons.plus(15)} {L("New", "Mới", "새로 만들기", "新建")}</button>
      </MHead>
      <div className="hscroll">
        {filters.map(([id, lbl]) => (
          <button key={id} className="fchip" data-on={filter === id ? "1" : "0"} onClick={() => setFilter(id)}>{lbl}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {list.map((a) => <MAgentCard key={a.id} a={a} />)}
        {rest > 0 && <div style={{
          borderRadius: "var(--r-lg)", border: "1.5px dashed var(--border-strong)",
          display: "grid", placeItems: "center", minHeight: 64, color: "var(--ink-3)", fontSize: 12.5, textAlign: "center", padding: 14,
        }}>+ {rest} {L("more specialist agents", "tác nhân chuyên môn khác", "개 전문 에이전트 더보기", "个更多专业智能体")}</div>}
      </div>
    </div>
  );
}

/* ---------- Providers ---------- */
function MProviderCard({ p }) {
  const keyless = p.id === "ollama" || p.id === "lmstudio" || p.id === "9router";
  const vault = typeof YanaVault !== "undefined" ? YanaVault : null;
  const [hasKey, setHasKey] = React.useState(() => keyless || !!(vault && vault.getKey(p.id)));
  const connected = hasKey;

  async function promptKey() {
    if (!vault) { window.alert(L("Vault not available.", "Vault chưa sẵn sàng.", "Vault를 사용할 수 없습니다.", "Vault 尚不可用。")); return; }
    const current = vault.getKey(p.id) || "";
    const raw = window.prompt(
      L("API key for ", "API key cho ", "API 키 대상: ", "API 密钥用于：") + p.name + L(" (leave blank to clear):", " (để trống để xóa):", " (지우려면 비워두세요):", "（留空以清除）："),
      current
    );
    if (raw === null) return;
    const trimmed = raw.trim();
    if (trimmed) { await vault.setKey(p.id, trimmed); setHasKey(true); }
    else         { vault.removeKey(p.id); setHasKey(false); }
  }

  const keyDisplay = keyless
    ? L("Keyless", "Không cần key", "키 불필요", "无需密钥")
    : hasKey
      ? (vault && vault.getKey(p.id) || "").slice(0, 8) + "····"
      : L("Not set", "Chưa đặt", "미설정", "未设置");

  return (
    <div className="glass" style={{ borderRadius: "var(--r-lg)", padding: "15px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 12, flex: "none", display: "grid", placeItems: "center",
          fontSize: 14.5, fontWeight: 500, color: "var(--primary)",
          background: "var(--primary-soft)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.5)",
        }}>{p.name[0]}</div>
        <div style={{ lineHeight: 1.25, minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14.5, fontWeight: 500 }}>{p.name}</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{p.company}</div>
        </div>
        <span className={"chip " + (connected ? "" : "gold")} style={{ fontSize: 11, flex: "none" }}>
          <span className={"dot " + (connected ? "on" : "idle")} style={{ width: 6, height: 6, boxShadow: "none" }}></span>
          {connected ? L("Connected", "Đã nối", "연결됨", "已连接") : L("Standby", "Chờ", "대기", "待机")}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{p.role}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {p.models.map((m) => <span key={m} className="chip neutral" style={{ fontSize: 11 }}>{m}</span>)}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
        <div style={{ lineHeight: 1.35, minWidth: 0 }}>
          <div style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{L("Key", "Khoá", "키", "密钥")}</div>
          <div style={{ fontSize: 11.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>{keyDisplay}</div>
        </div>
        {!keyless && (
          <button onClick={promptKey} className={"pill-" + (hasKey ? "neutral" : "primary")} style={{ padding: "6px 13px", fontSize: 12 }}>
            {hasKey ? L("Change", "Đổi", "변경", "更改") : L("Set key", "Thêm key", "키 설정", "设置密钥")}
          </button>
        )}
      </div>
    </div>
  );
}

function MProviders() {
  const D = window.YANA;
  const vault = typeof YanaVault !== "undefined" ? YanaVault : null;
  const connected = vault ? D.providers.filter((p) => p.id === "ollama" || p.id === "lmstudio" || p.id === "9router" || vault.getKey(p.id)).length : 0;
  return (
    <div data-screen-label="Providers" style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
      <MHead title={L("Providers", "Nhà cung cấp", "프로바이더", "提供商")} sub={connected + " / " + D.providers.length + L(" connected", " đã nối", " 연결됨", " 已连接")} />
      <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
        {D.providers.map((p) => <MProviderCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}

/* ---------- Settings ---------- */
const M_THEME_PREVIEWS = [
  { label: "Lotus Dawn 🌸",   accent: "#b96b80", sky: "linear-gradient(160deg, #faf5f3 30%, #f2dfdc 100%)", wash: "rgba(236,196,134,.45)" },
  { label: "Jade Lake 🌿",    accent: "#2f7e6e", sky: "linear-gradient(160deg, #f6faf7 30%, #ddeee7 100%)", wash: "rgba(122,184,168,.40)" },
  { label: "Morning Mist ☁️", accent: "#4a7a6a", sky: "linear-gradient(160deg, #f8f7f4 30%, #ecebe5 100%)", wash: "rgba(214,222,214,.55)" },
  { label: "Glass Silver ✨",  accent: "#3a7ca5", sky: "linear-gradient(160deg, #f3f6fa 30%, #dde6ef 100%)", wash: "rgba(168,199,224,.45)" },
  { label: "iOS Rose 🌷",     accent: "#e879a0", sky: "linear-gradient(160deg, #fdf0f6 30%, #f5d0e8 100%)", wash: "rgba(232,121,160,.40)" },
  { label: "iOS Night 🌙",    accent: "#e879a0", sky: "linear-gradient(160deg, #2a0818 30%, #14020a 100%)", wash: "rgba(232,121,160,.22)", dark: true },
  { label: "Prism Glass 🔮",  accent: "#6060ff", sky: "linear-gradient(160deg, #f5f5fc 30%, #e0e0f8 100%)", wash: "rgba(96,96,255,.35)" },
  { label: "Obsidian 🌑",     accent: "#8080ff", sky: "linear-gradient(160deg, #1a1a2e 30%, #0c0c1a 100%)", wash: "rgba(128,128,255,.22)", dark: true },
];

const M_DARK_THEMES = new Set(["iOS Night 🌙", "Obsidian 🌑"]);

function MThemeCard({ p, active, onPick }) {
  const glass = p.dark ? "rgba(255,255,255,.12)" : "rgba(255,255,255,.65)";
  const glass2 = p.dark ? "rgba(255,255,255,.09)" : "rgba(255,255,255,.5)";
  return (
    <button onClick={onPick} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "center", color: "inherit", flex: "none" }}>
      <div style={{
        width: 96, height: 60, borderRadius: 12, background: p.sky, position: "relative", overflow: "hidden",
        boxShadow: active ? `0 0 0 2px var(--bg-base), 0 0 0 4px ${p.accent}` : "inset 0 0 0 1px var(--border)",
        transition: "box-shadow .15s",
      }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(70px 36px at 80% 100%, ${p.wash}, transparent 70%)` }}></div>
        <div style={{ position: "absolute", left: 7, top: 7, bottom: 7, width: 22, borderRadius: 5, background: glass }}></div>
        <div style={{ position: "absolute", left: 34, top: 7, right: 7, height: 18, borderRadius: 5, background: glass2 }}></div>
        <div style={{ position: "absolute", left: 34, top: 29, right: 7, bottom: 7, borderRadius: 5, background: glass2 }}></div>
        <div style={{ position: "absolute", left: 11, top: 11, width: 9, height: 9, borderRadius: 3, background: p.accent, opacity: .9 }}></div>
      </div>
      <div style={{ fontSize: 11.5, marginTop: 7, fontWeight: active ? 500 : 400, color: active ? "var(--ink)" : "var(--ink-2)" }}>{p.label}</div>
    </button>
  );
}

function MSwitch({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} aria-pressed={value} style={{
      width: 42, height: 25, borderRadius: 99, border: "none", cursor: "pointer", flex: "none",
      background: value ? "var(--primary)" : "rgba(var(--shadow-rgb), .15)",
      position: "relative", transition: "background .18s",
    }}>
      <span style={{
        position: "absolute", top: 2, left: value ? 19 : 2, width: 21, height: 21, borderRadius: "50%",
        background: "white", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "left .18s",
      }}></span>
    </button>
  );
}

function MSeg({ options, value, onChange }) {
  return (
    <div style={{ display: "inline-flex", gap: 2, padding: 3, borderRadius: 10, background: "rgba(var(--shadow-rgb), .07)" }}>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} style={{
          padding: "6px 13px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5,
          fontWeight: value === o ? 500 : 400,
          background: value === o ? "rgba(var(--surface-rgb), .95)" : "transparent",
          boxShadow: value === o ? "0 1px 3px rgba(var(--shadow-rgb), .15)" : "none",
          color: "var(--ink)", transition: "background .15s",
        }}>{o}</button>
      ))}
    </div>
  );
}

function MSliderRow({ label, value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "92px 1fr 38px", alignItems: "center", gap: 12, padding: "8px 0" }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      <input type="range" min="0" max="100" value={value} onChange={(e) => onChange(+e.target.value)}
        style={{ width: "100%", accentColor: "var(--primary)", height: 4 }} />
      <span style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "right" }}>{value}%</span>
    </div>
  );
}

const M_ACCENTS = ["#2f7e6e", "#56949f", "#3a7ca5", "#7d6aa8", "#b96b80", "#b07a4f", "#b78f3d", "#6f8f5a", "#5b7282"];

function MAboutField({ id, label, hint, placeholder }) {
  const key = "yana.about." + id;
  const [v, setV] = React.useState(() => localStorage.getItem(key) || "");
  const [saved, setSaved] = React.useState(false);
  const timer = React.useRef(null);
  function onChange(e) {
    const val = e.target.value;
    setV(val);
    localStorage.setItem(key, val);
    setSaved(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(true), 800);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <label style={{ fontSize: 13, fontWeight: 500 }}>{label}</label>
        <span style={{ fontSize: 10.5, color: "var(--good)", opacity: saved ? 1 : 0, transition: "opacity .3s", display: "inline-flex", alignItems: "center", gap: 4, flex: "none" }}>
          {Icons.check(11)} {L("Planted", "Đã trồng", "저장됨", "已存入")}
        </span>
      </div>
      {hint && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: -3 }}>{hint}</div>}
      <textarea value={v} onChange={onChange} rows={3} placeholder={placeholder}
        style={{
          width: "100%", resize: "vertical", padding: "10px 13px", borderRadius: "var(--r-sm)",
          border: "1px solid var(--border)", background: "rgba(var(--surface-rgb), .6)", color: "var(--ink)",
          fontFamily: "inherit", fontSize: 13.5, lineHeight: 1.55, outline: "none",
        }}
        onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
        onBlur={(e) => e.target.style.borderColor = "var(--border)"} />
    </div>
  );
}

function MSettingRow({ label, desc, value }) {
  return (
    <div className="mrow" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
      <div style={{ lineHeight: 1.35, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{label}</div>
        {desc && <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{desc}</div>}
      </div>
      <span className="chip neutral" style={{ flex: "none", fontSize: 11 }}>{value}</span>
    </div>
  );
}

function _mDetectTz() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const offMin = -new Date().getTimezoneOffset();
    const sign = offMin >= 0 ? "+" : "−";
    const h = Math.floor(Math.abs(offMin) / 60);
    const m = Math.abs(offMin) % 60;
    return "GMT" + sign + h + (m ? ":" + String(m).padStart(2, "0") : "") + " · " + tz.split("/").pop().replace(/_/g, " ");
  } catch (_) { return "UTC"; }
}

const M_PROVIDER_NAMES = { claude: "Claude", openai: "OpenAI", gemini: "Gemini", groq: "Groq", deepseek: "DeepSeek", openrouter: "OpenRouter", "9router": "9Router", ollama: "Ollama", lmstudio: "LM Studio" };

function MProfileHero({ t, setTweak }) {
  const D = window.YANA;
  const account = D.account || "";
  const initial = account.trim().charAt(0).toUpperCase() || "Y";
  const [dispName, setDispName] = React.useState(() =>
    localStorage.getItem("yana.display-name") || account || "Yana AI"
  );
  const memberSince = React.useMemo(() => {
    const key = "yana.member-since";
    let s = localStorage.getItem(key);
    if (!s) { s = new Date().toLocaleDateString("vi-VN", { year: "numeric", month: "long" }); localStorage.setItem(key, s); }
    return s;
  }, []);

  const [colorMode, setColorMode] = React.useState(() => {
    const stored = localStorage.getItem("yana.color-mode");
    if (stored === "auto") return "auto";
    return M_DARK_THEMES.has(t.theme) ? "dark" : "light";
  });
  React.useEffect(() => {
    if (localStorage.getItem("yana.color-mode") !== "auto")
      setColorMode(M_DARK_THEMES.has(t.theme) ? "dark" : "light");
  }, [t.theme]);

  function applyMode(mode) {
    localStorage.setItem("yana.color-mode", mode);
    setColorMode(mode);
    if (mode === "dark") {
      if (!M_DARK_THEMES.has(t.theme)) localStorage.setItem("yana.last-light-theme", t.theme);
      setTweak("theme", localStorage.getItem("yana.last-dark-theme") || "iOS Night 🌙");
    } else if (mode === "light") {
      if (M_DARK_THEMES.has(t.theme)) localStorage.setItem("yana.last-dark-theme", t.theme);
      setTweak("theme", localStorage.getItem("yana.last-light-theme") || "Jade Lake 🌿");
    } else {
      if (M_DARK_THEMES.has(t.theme)) localStorage.setItem("yana.last-dark-theme", t.theme);
      else localStorage.setItem("yana.last-light-theme", t.theme);
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTweak("theme", prefersDark
        ? (localStorage.getItem("yana.last-dark-theme") || "iOS Night 🌙")
        : (localStorage.getItem("yana.last-light-theme") || "Jade Lake 🌿")
      );
    }
  }

  const MODES = [
    { key: "light", icon: "☀️", label: L("Light", "Sáng", "라이트", "浅色") },
    { key: "dark",  icon: "🌙", label: L("Dark", "Tối", "다크", "深色") },
    { key: "auto",  icon: "✦",  label: L("Auto", "Tự", "자동", "自动") },
  ];

  const D2 = window.YANA || {};
  const stats = D2.stats || {};
  const statsRow = [
    { v: stats.agents || "—",   l: L("Agents", "Tác nhân", "에이전트", "智能体") },
    { v: stats.memories || "—", l: L("Memories", "Ký ức", "메모리", "记忆") },
    { v: stats.providers || "—", l: L("Providers", "Providers", "프로바이더", "提供商") },
    { v: stats.gateMode || "Strict", l: L("Gate", "Cổng", "게이트", "门控") },
  ];

  return (
    <MCard>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "2px 0 16px" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 17, flex: "none", display: "grid", placeItems: "center",
          fontSize: 20, fontWeight: 700, color: "white",
          background: "linear-gradient(150deg, var(--primary), color-mix(in oklab, var(--primary) 72%, #1d3530))",
          boxShadow: "0 4px 14px color-mix(in oklab, var(--primary) 30%, transparent)",
        }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 600, lineHeight: 1.25 }}>{dispName}</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{account || L("Yana AI", "Yana AI", "Yana AI", "Yana AI")}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 2 }}>{L("Since", "Từ", "가입일", "加入于")} {memberSince}</div>
        </div>
        <span className="chip gold" style={{ fontSize: 10.5, flex: "none" }}>Sovereign</span>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "12px 0", borderTop: "1px solid var(--border)" }}>
        {MODES.map((m) => (
          <button key={m.key} onClick={() => applyMode(m.key)} style={{
            flex: 1, padding: "7px 6px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12,
            fontWeight: colorMode === m.key ? 600 : 400,
            background: colorMode === m.key ? "var(--primary-soft)" : "transparent",
            color: colorMode === m.key ? "var(--primary)" : "var(--ink-3)",
            boxShadow: colorMode === m.key ? "inset 0 0 0 1px var(--primary)" : "none",
            transition: "all .15s",
          }}>{m.icon} {m.label}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        {statsRow.map((s) => (
          <div key={s.l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{s.v}</div>
            <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 1 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </MCard>
  );
}

function MSettings({ t, setTweak }) {
  const _p = mGetProviderConfig().provider;
  const _orchModel = M_CHAT_MODELS[_p] || _p;
  const _wname = localStorage.getItem("yana.workspace.name") ||
    ((window.YANA.username ? window.YANA.username + "'s Lake" : L("Yana's Lake", "Mặt hồ của Yana", "Yana의 호수", "Yana 的湖")));
  const _chain = (() => {
    const order = ["claude", "openai", "gemini", "groq", "deepseek", "openrouter", "9router"];
    if (typeof YanaVault === "undefined") return "—";
    const found = order.filter((id) => YanaVault.getKey(id));
    return found.map((id) => M_PROVIDER_NAMES[id] || id).join(" → ") || L("None — add key in Providers", "Chưa có — thêm key ở Providers", "없음 — Providers에서 키 추가", "无 — 请在提供商中添加密钥");
  })();
  return (
    <div data-screen-label="Settings" style={{ display: "flex", flexDirection: "column", gap: "var(--gap)" }}>
      <MHead title={L("Settings", "Cài đặt", "설정", "设置")} sub={L("Quiet defaults. Everything supervised by Yana AI Core.", "Mặc định tĩnh lặng. Mọi thứ do Yana AI Core giám sát.", "조용한 기본값. 모든 것이 Yana AI Core의 감독 아래 있습니다.", "低调的默认设置。一切均由 Yana AI Core 监督。")} />

      <MProfileHero t={t} setTweak={setTweak} />

      <MCard title={L("Appearance", "Giao diện", "외관", "外观")}>
        <div className="hscroll" style={{ marginBottom: 6 }}>
          {M_THEME_PREVIEWS.map((p) => (
            <MThemeCard key={p.label} p={p} active={t.theme === p.label} onPick={() => setTweak("theme", p.label)} />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{L("Accent", "Màu nhấn", "강조 색상", "强调色")}</span>
          <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => setTweak("accent", "")} title="Theme default" style={{
              width: 24, height: 24, borderRadius: "50%", cursor: "pointer", padding: 0, border: "none",
              background: "conic-gradient(#2f7e6e, #3a7ca5, #b96b80, #b78f3d, #2f7e6e)",
              boxShadow: !t.accent ? "0 0 0 2px var(--bg-base), 0 0 0 4px var(--ink-3)" : "inset 0 0 0 1px rgba(0,0,0,.08)",
            }}></button>
            {M_ACCENTS.map((c) => (
              <button key={c} onClick={() => setTweak("accent", c)} style={{
                width: 24, height: 24, borderRadius: "50%", cursor: "pointer", padding: 0, border: "none", background: c,
                boxShadow: t.accent === c ? `0 0 0 2px var(--bg-base), 0 0 0 4px ${c}` : "inset 0 0 0 1px rgba(0,0,0,.08)",
              }}></button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 0", borderTop: "1px solid var(--border)" }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{L("Density", "Mật độ", "밀도", "密度")}</span>
          <MSeg options={["Compact", "Regular", "Spacious"]} value={t.layout} onChange={(v) => setTweak("layout", v)} />
        </div>

        <div style={{ padding: "8px 0 4px", borderTop: "1px solid var(--border)" }}>
          <MSliderRow label={L("Blur", "Mờ", "블러", "模糊")} value={t.blur} onChange={(v) => setTweak("blur", v)} />
          <MSliderRow label={L("Transparency", "Trong suốt", "투명도", "透明度")} value={t.transparency} onChange={(v) => setTweak("transparency", v)} />
          <MSliderRow label={L("Reflection", "Phản chiếu", "반사", "反光")} value={t.reflection} onChange={(v) => setTweak("reflection", v)} />
          <MSliderRow label={L("Depth", "Chiều sâu", "깊이", "深度")} value={t.depth} onChange={(v) => setTweak("depth", v)} />
        </div>

        <div style={{ paddingTop: 8, borderTop: "1px solid var(--border)" }}>
          {[[L("Show agents on Lake", "Tác nhân trên Mặt hồ", "호수에 에이전트 표시", "在湖面显示智能体"), "showAgents"], [L("Show missions on Lake", "Nhiệm vụ trên Mặt hồ", "호수에 미션 표시", "在湖面显示任务"), "showMissions"], [L("Show Memory Garden", "Vườn ký ức", "메모리 가든 표시", "显示记忆花园"), "showMemory"], [L("Show system status", "Trạng thái hệ thống", "시스템 상태 표시", "显示系统状态"), "showSystem"]].map(([label, key]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "9px 0" }}>
              <span style={{ fontSize: 13 }}>{label}</span>
              <MSwitch value={t[key]} onChange={(v) => setTweak(key, v)} />
            </div>
          ))}
        </div>
      </MCard>

      <MCard title={L("About you", "Về bạn", "당신에 대하여", "关于你")} aside={<span className="chip pink" style={{ fontSize: 10.5 }}>{Icons.memory(12)} {L("Pinned", "Đã ghim", "고정됨", "已固定")}</span>}>
        <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.55 }}>
          {L("Yana reads this before every mission. The more honestly you describe yourself, the better she routes and plans for you.", "Yana đọc phần này trước mỗi nhiệm vụ. Bạn mô tả càng thật, Yana càng định tuyến và lập kế hoạch tốt hơn.", "Yana는 모든 미션 전에 이 내용을 읽습니다. 자신을 솔직하게 설명할수록 라우팅과 계획이 더 잘 맞춰집니다.", "Yana 会在每次任务前阅读这些内容。你的描述越真实，她的路由和规划就越贴合你。")}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <MAboutField id="who" label={L("Who you are", "Bạn là ai", "당신은 누구인가요", "你是谁")} hint={L("Role, what you're building, how you work", "Vai trò, đang xây gì, cách làm việc", "역할, 만들고 있는 것, 일하는 방식", "角色、你在构建什么、你的工作方式")} placeholder={L("e.g. I'm a system builder. I think in workflows, not code.", "vd: Tôi là người dựng hệ thống. Tôi nghĩ theo quy trình, không phải code.", "예: 저는 시스템을 만듭니다. 코드보다 워크플로우로 생각해요.", "例：我是系统构建者，习惯以工作流而非代码来思考。")} />
          <MAboutField id="strengths" label={L("Strengths", "Điểm mạnh", "강점", "优势")} hint={L("What Yana should lean on", "Điều Yana nên dựa vào", "Yana가 의지해야 할 부분", "Yana 应该依靠的方面")} placeholder={L("e.g. Big-picture architecture, fast decisions.", "vd: Kiến trúc tổng thể, quyết định nhanh.", "예: 큰 그림의 아키텍처, 빠른 의사결정.", "例：把握整体架构，决策迅速。")} />
          <MAboutField id="style" label={L("How Yana should respond", "Cách Yana trả lời", "Yana가 응답하는 방식", "Yana 应如何回应")} hint={L("Tone, length, language", "Giọng, độ dài, ngôn ngữ", "어조, 길이, 언어", "语气、长度、语言")} placeholder={L("e.g. Calm and brief. No hype.", "vd: Bình tĩnh, ngắn gọn. Không hô hào.", "예: 차분하고 간결하게. 과장 없이.", "例：冷静简短，不夸张。")} />
        </div>
      </MCard>

      <MCard title={L("Workspace", "Không gian", "워크스페이스", "工作区")}>
        <MSettingRow label={L("Workspace name", "Tên không gian", "워크스페이스 이름", "工作区名称")} value={_wname} />
        <MSettingRow label={L("Timezone", "Múi giờ", "시간대", "时区")} desc={L("Detected from device", "Phát hiện từ thiết bị", "기기에서 감지됨", "从设备检测")} value={_mDetectTz()} />
      </MCard>
      <MCard title={L("Orchestration", "Điều phối", "오케스트레이션", "编排")}>
        <MSettingRow label={L("Default orchestrator", "Điều phối mặc định", "기본 오케스트레이터", "默认编排器")} desc={L("Plans and delegates missions", "Lập kế hoạch & giao việc", "미션을 계획하고 위임", "规划并分派任务")} value={"Navigator · " + _orchModel} />
        <MSettingRow label={L("Active provider", "Nhà cung cấp hiện dùng", "활성 프로바이더", "当前提供商")} desc={L("First key you have set", "Key đầu tiên đã cài", "설정한 첫 번째 키", "你设置的第一个密钥")} value={M_PROVIDER_NAMES[_p] || _p} />
        <MSettingRow label={L("Fallback chain", "Chuỗi dự phòng", "폴백 체인", "回退链")} value={_chain} />
      </MCard>
      <MCard title={L("Safety", "An toàn", "안전", "安全")}>
        <MSettingRow label={L("Gate mode", "Chế độ cổng", "게이트 모드", "门控模式")} desc={L("Every action is reviewed", "Mọi hành động được duyệt", "모든 작업이 검토됨", "所有操作均经过审查")} value={L("Strict", "Nghiêm ngặt", "엄격", "严格")} />
        <MSettingRow label={L("Merge protection", "Bảo vệ merge", "머지 보호", "合并保护")} desc={L("Sentinel sign-off before main", "Sentinel duyệt trước main", "main 반영 전 Sentinel 승인", "合并到 main 前需 Sentinel 批准")} value={L("On", "Bật", "켜짐", "已启用")} />
        <MSettingRow label={L("Incident retention", "Lưu sự cố", "사건 보관 기간", "事件保留期")} value={L("90 days", "90 ngày", "90일", "90 天")} />
      </MCard>
    </div>
  );
}

Object.assign(window, { MAgents, MProviders, MSettings });
