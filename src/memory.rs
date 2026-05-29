use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use uuid::Uuid;

pub fn now() -> String { Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string() }

// ── Data model ────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct L3Fact {
    pub id: String, pub key: String, pub value: String,
    pub tags: Vec<String>, pub agent: Option<String>,
    pub confidence: String, pub scope: String,
    pub created_at: String, pub updated_at: String,
    pub promoted: bool,
}

// ── Storage ───────────────────────────────────────────────────────────────────

pub fn l3_path() -> PathBuf {
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
        .join(".yamtam").join("l3.jsonl")
}

pub fn l3_read_all() -> Vec<L3Fact> {
    let path = l3_path();
    if !path.exists() { return vec![]; }
    fs::read_to_string(&path).unwrap_or_default()
        .lines().filter(|l| !l.trim().is_empty())
        .filter_map(|l| serde_json::from_str(l).ok())
        .collect()
}

pub fn l3_write_all(facts: &[L3Fact]) {
    let path = l3_path();
    if let Some(p) = path.parent() { fs::create_dir_all(p).ok(); }
    let content = facts.iter()
        .map(|f| serde_json::to_string(f).unwrap())
        .collect::<Vec<_>>().join("\n");
    fs::write(&path, format!("{content}\n")).expect("write l3.jsonl failed");
}

pub fn l3_append(fact: &L3Fact) {
    let path = l3_path();
    if let Some(p) = path.parent() { fs::create_dir_all(p).ok(); }
    let line = serde_json::to_string(fact).expect("serialize failed");
    let mut file = fs::OpenOptions::new().create(true).append(true).open(&path)
        .expect("open l3.jsonl failed");
    writeln!(file, "{line}").expect("write failed");
}

pub fn parse_frontmatter_field(content: &str, field: &str) -> Option<String> {
    let prefix = format!("{field}:");
    content.lines()
        .find(|l| l.trim_start().starts_with(&prefix))
        .map(|l| l.trim_start().trim_start_matches(&prefix).trim().trim_matches('"').to_string())
        .filter(|s| !s.is_empty())
}

// ── Handlers ──────────────────────────────────────────────────────────────────

pub fn cmd_memory_store(key: String, value: String, tags: Vec<String>, agent: Option<String>, confidence: String, scope: String) {
    let mut facts = l3_read_all();
    if let Some(pos) = facts.iter().position(|f| f.key == key) {
        facts[pos].value = value; facts[pos].tags = tags; facts[pos].agent = agent;
        facts[pos].confidence = confidence; facts[pos].scope = scope;
        facts[pos].updated_at = now(); facts[pos].promoted = false;
        let fid = facts[pos].id[..8].to_string();
        l3_write_all(&facts);
        println!("✓ updated  L3:{fid}\n  key: {key}");
    } else {
        let fact = L3Fact {
            id: Uuid::new_v4().to_string(), key: key.clone(), value,
            tags, agent, confidence, scope,
            created_at: now(), updated_at: now(), promoted: false,
        };
        l3_append(&fact);
        println!("✓ stored   L3:{}\n  key: {key}", &fact.id[..8]);
    }
}

pub fn cmd_memory_get(key: String) {
    let facts = l3_read_all();
    let found: Vec<&L3Fact> = facts.iter()
        .filter(|f| f.key == key || f.key.starts_with(&key)).collect();
    if found.is_empty() { println!("Not found: '{key}'"); return; }
    for f in found {
        let p = if f.promoted { " [→L1]" } else { "" };
        println!("L3:{}{}\n  key:        {}\n  value:      {}\n  confidence: {}  scope: {}",
            &f.id[..8], p, f.key, f.value, f.confidence, f.scope);
        if !f.tags.is_empty() { println!("  tags:       {}", f.tags.join(", ")); }
        if let Some(ref a) = f.agent { println!("  agent:      {a}"); }
        println!("  updated:    {}", f.updated_at);
    }
}

pub fn cmd_memory_list(tag: Option<String>, agent: Option<String>, last: usize) {
    let facts = l3_read_all();
    let filtered: Vec<&L3Fact> = facts.iter()
        .filter(|f| tag.as_ref().map(|t| f.tags.iter().any(|ft| ft == t)).unwrap_or(true))
        .filter(|f| agent.as_ref().map(|a| f.agent.as_deref() == Some(a)).unwrap_or(true))
        .collect();
    let shown = &filtered[filtered.len().saturating_sub(last)..];
    if shown.is_empty() { println!("No facts in L3."); return; }
    println!("{:<10} {:<3} {:<28} {}", "ID", "P", "KEY", "VALUE");
    println!("{}", "─".repeat(72));
    for f in shown {
        let p = if f.promoted { "✓" } else { " " };
        let k = if f.key.len() > 26 { format!("{}…", &f.key[..25]) } else { f.key.clone() };
        let v = if f.value.len() > 28 { format!("{}…", &f.value[..27]) } else { f.value.clone() };
        println!("{:<10} {p}   {:<28} {}", &f.id[..8], k, v);
    }
    println!("\n{}/{} facts shown", shown.len(), facts.len());
}

pub fn cmd_memory_promote(key: String, l1_dir: String) {
    let mut facts = l3_read_all();
    let pos = match facts.iter().position(|f| f.key == key) {
        Some(i) => i,
        None => { eprintln!("error: key '{key}' not in L3"); std::process::exit(1); }
    };
    let fid      = facts[pos].id.clone();
    let fvalue   = facts[pos].value.clone();
    let fagent   = facts[pos].agent.clone();
    let fconf    = facts[pos].confidence.clone();
    let fscope   = facts[pos].scope.clone();
    let ftags    = facts[pos].tags.clone();
    let fupdated = facts[pos].updated_at.clone();

    let l1_path = PathBuf::from(&l1_dir);
    fs::create_dir_all(&l1_path).ok();
    let slug: String = key.chars().map(|c| if c.is_alphanumeric() { c } else { '-' }).collect();
    let filepath = l1_path.join(format!("{slug}.md"));
    let tags_yaml = if ftags.is_empty() { String::new() }
        else { format!("\ntags:       [{}]", ftags.join(", ")) };
    let content = format!(
        "---\nid:         {fid}\ntype:       fact\nstatement:  {fvalue}\nsource:     l3-promote:{}\nconfidence: {fconf}\nscope:      {fscope}{tags_yaml}\n---\n\n{fvalue}\n",
        fagent.as_deref().unwrap_or("unknown"),
    );
    fs::write(&filepath, content).expect("write L1 file failed");
    let mut idx = fs::OpenOptions::new().create(true).append(true)
        .open(l1_path.join("INDEX.md")).expect("open INDEX.md failed");
    writeln!(idx, "| {} | {key} | {fconf} | {fupdated} |", &fid[..8]).expect("write INDEX.md failed");
    facts[pos].promoted = true;
    facts[pos].updated_at = now();
    l3_write_all(&facts);
    println!("✓ promoted L3:{} → L1\n  file: {}", &fid[..8], filepath.display());
}

pub fn cmd_memory_import(l2_dir: String) {
    let dir = PathBuf::from(&l2_dir);
    if !dir.exists() { eprintln!("error: L2 dir not found: {l2_dir}"); std::process::exit(1); }
    let existing_keys: Vec<String> = l3_read_all().into_iter().map(|f| f.key).collect();
    let mut imported = 0;
    for entry in fs::read_dir(&dir).expect("read L2 dir").filter_map(|e| e.ok()) {
        let path = entry.path();
        let stem = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
        if !path.extension().map(|x| x == "md").unwrap_or(false) { continue; }
        if matches!(stem.as_str(), "SCHEMA" | "INDEX") { continue; }
        if existing_keys.contains(&stem) { continue; }
        let content = fs::read_to_string(&path).unwrap_or_default();
        let statement = match parse_frontmatter_field(&content, "statement") { Some(s) => s, None => continue };
        let confidence = parse_frontmatter_field(&content, "confidence").unwrap_or_else(|| "low".into());
        let source = parse_frontmatter_field(&content, "source").unwrap_or_else(|| "l2-import".into());
        l3_append(&L3Fact {
            id: Uuid::new_v4().to_string(), key: stem, value: statement,
            tags: vec!["l2-import".into()], agent: Some(source),
            confidence, scope: "both".into(),
            created_at: now(), updated_at: now(), promoted: false,
        });
        imported += 1;
    }
    println!("✓ imported {imported} facts L2 → L3");
}
