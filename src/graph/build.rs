use crate::graph::types::*;
use anyhow::Result;
use chrono::Utc;
use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::path::Path;
use walkdir::WalkDir;

pub fn build_graph(target: &str, quiet: bool) -> Result<GraphData> {
    let root = std::fs::canonicalize(target)
        .unwrap_or_else(|_| Path::new(target).to_path_buf());
    let root_str = root.to_string_lossy().to_string();

    if !quiet { eprintln!("[graph] scanning {}…", root.display()); }

    // Stage 1 — discover files
    let files = discover_files(&root_str);
    if !quiet { eprintln!("[graph] {} files found", files.len()); }

    // Stage 2 — build nodes + import edges
    let (nodes, edges) = analyze_files(&root_str, &files, quiet);

    // Stage 3 — tour (dependency-ordered top files)
    let tour = build_tour(&nodes, &edges);

    // Collect metadata
    let mut langs: HashSet<String> = HashSet::new();
    let mut frameworks: HashSet<String> = HashSet::new();
    for n in &nodes {
        if n.language != "Other" { langs.insert(n.language.clone()); }
    }
    detect_frameworks(&root_str, &mut frameworks);

    let project = root.file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_string();

    let mut lang_list: Vec<_> = langs.into_iter().collect();
    lang_list.sort();

    let data = GraphData {
        meta: GraphMeta {
            project,
            root: root_str,
            languages: lang_list,
            frameworks: frameworks.into_iter().collect(),
            total_files: files.len(),
            analysed_at: Utc::now().to_rfc3339(),
            schema_version: SCHEMA_VERSION.to_string(),
        },
        nodes,
        edges,
        tour,
    };

    // Write to disk
    let graph_dir = Path::new(target).join(GRAPH_DIR);
    std::fs::create_dir_all(&graph_dir)?;
    let out = graph_dir.join(GRAPH_FILE);
    std::fs::write(&out, serde_json::to_string_pretty(&data)?)?;

    if !quiet { eprintln!("[graph] written → {}", out.display()); }
    Ok(data)
}

fn discover_files(root: &str) -> Vec<(String, String)> {
    let mut files = Vec::new();
    for entry in WalkDir::new(root).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if !path.is_file() { continue; }

        // Skip ignored dirs
        if path.components().any(|c| {
            IGNORE_DIRS.contains(&c.as_os_str().to_string_lossy().as_ref())
        }) { continue; }

        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        let ext_dot = format!(".{ext}");
        if IGNORE_EXTS.contains(&ext_dot.as_str()) { continue; }

        let rel = path.strip_prefix(root)
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        let lang = lang_from_ext(ext).to_string();
        files.push((rel, lang));
    }
    files.sort_by(|a, b| a.0.cmp(&b.0));
    files
}

fn analyze_files(root: &str, files: &[(String, String)], quiet: bool) -> (Vec<Node>, Vec<Edge>) {
    let mut nodes: Vec<Node> = Vec::new();
    let mut edges: Vec<Edge> = Vec::new();
    let mut file_id_map: HashMap<String, String> = HashMap::new();

    // First pass: create file nodes
    for (rel_path, lang) in files {
        let id = format!("file:{}", rel_path);
        let name = Path::new(rel_path)
            .file_name().and_then(|s| s.to_str())
            .unwrap_or(rel_path).to_string();
        let category = category_from_path(rel_path, lang);
        let layer = layer_from_path(rel_path);

        nodes.push(Node {
            id: id.clone(),
            node_type: "file".to_string(),
            name: name.clone(),
            file_path: rel_path.clone(),
            language: lang.clone(),
            summary: String::new(),
            complexity: "low".to_string(),
            tags: tags_for_file(rel_path, lang, category),
            line_range: None,
            category: category.to_string(),
        });
        file_id_map.insert(rel_path.clone(), id);
        let _ = layer; // used in tour
    }

    // Second pass: extract imports → edges
    let total = files.len();
    let log_every = (total / 10).max(1);
    for (i, (rel_path, lang)) in files.iter().enumerate() {
        if !quiet && i % log_every == 0 {
            eprint!("\r[graph] analyzing {}/{}", i + 1, total);
        }
        let full = format!("{}/{}", root, rel_path);
        let content = match std::fs::read_to_string(&full) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let imports = extract_imports(&content, lang);
        let from_id = format!("file:{}", rel_path);

        for imp in &imports {
            // Try to resolve import to a known file
            if let Some(to_id) = resolve_import(imp, rel_path, &file_id_map) {
                if to_id != from_id {
                    edges.push(Edge {
                        source: from_id.clone(),
                        target: to_id,
                        edge_type: "imports".to_string(),
                        weight: 1.0,
                    });
                }
            }
        }

        // Estimate complexity from line count
        let lines = content.lines().count();
        if let Some(n) = nodes.iter_mut().find(|n| n.id == from_id) {
            n.complexity = if lines > 300 { "high" }
                else if lines > 100 { "moderate" }
                else { "low" }.to_string();
        }
    }
    if !quiet { eprintln!("\r[graph] analyzed {} files", total); }

    edges.dedup_by(|a, b| a.source == b.source && a.target == b.target);
    (nodes, edges)
}

fn extract_imports(content: &str, lang: &str) -> Vec<String> {
    let mut imports = Vec::new();
    match lang {
        "Rust" => {
            let re = Regex::new(r"use\s+(?:crate::)?([a-zA-Z_][a-zA-Z0-9_:]*)")
                .unwrap();
            for cap in re.captures_iter(content) {
                imports.push(cap[1].replace("::", "/"));
            }
        }
        "TypeScript" | "JavaScript" => {
            let re = Regex::new(r#"(?:import|from)\s+['"]([^'"]+)['"]"#).unwrap();
            for cap in re.captures_iter(content) {
                imports.push(cap[1].to_string());
            }
        }
        "Python" => {
            let re = Regex::new(r"(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))")
                .unwrap();
            for cap in re.captures_iter(content) {
                let m = cap.get(1).or(cap.get(2))
                    .map(|m| m.as_str().replace('.', "/"))
                    .unwrap_or_default();
                if !m.is_empty() { imports.push(m); }
            }
        }
        "Go" => {
            let re = Regex::new(r#""([^"]+)""#).unwrap();
            let in_import = content.contains("import (") || content.contains("import\t\"");
            if in_import {
                for cap in re.captures_iter(content) {
                    imports.push(cap[1].to_string());
                }
            }
        }
        _ => {}
    }
    imports
}

fn resolve_import(imp: &str, from_file: &str, id_map: &HashMap<String, String>) -> Option<String> {
    // Relative import: ./foo, ../bar
    if imp.starts_with("./") || imp.starts_with("../") {
        let base = Path::new(from_file).parent().unwrap_or(Path::new(""));
        let resolved = base.join(imp);
        let clean = resolved.to_string_lossy();
        // Try with extensions
        for ext in &["rs", "ts", "tsx", "js", "py", "go"] {
            let candidate = format!("{}.{}", clean, ext);
            if id_map.contains_key(&candidate) {
                return id_map.get(&candidate).cloned();
            }
        }
        if id_map.contains_key(clean.as_ref()) {
            return id_map.get(clean.as_ref()).cloned();
        }
    }
    // Internal module path (e.g., "crate/vault/mod")
    for (k, v) in id_map {
        if k.contains(imp) || k.ends_with(&format!("{}.rs", imp)) {
            return Some(v.clone());
        }
    }
    None
}

fn build_tour(nodes: &[Node], edges: &[Edge]) -> Vec<TourStep> {
    // Count how many files import each node (in-degree)
    let mut in_degree: HashMap<&str, usize> = HashMap::new();
    for e in edges {
        *in_degree.entry(e.target.as_str()).or_default() += 1;
    }

    // Prioritize: docs/config first, then high in-degree, then by path
    let mut sorted: Vec<&Node> = nodes.iter()
        .filter(|n| n.node_type == "file")
        .collect();
    sorted.sort_by_key(|n| {
        let priority = match n.category.as_str() {
            "docs"   => 0usize,
            "config" => 1,
            _        => 2 + (100usize.saturating_sub(*in_degree.get(n.id.as_str()).unwrap_or(&0))),
        };
        priority
    });

    sorted.iter().take(30).enumerate().map(|(i, n)| {
        let layer = layer_from_path(&n.file_path);
        let reason = if i < 3 { "project entry point".to_string() }
            else if n.category == "config" { "configuration".to_string() }
            else { format!("in-degree {}", in_degree.get(n.id.as_str()).unwrap_or(&0)) };
        TourStep {
            order: i + 1,
            node_id: n.id.clone(),
            name: n.name.clone(),
            file_path: n.file_path.clone(),
            language: n.language.clone(),
            reason,
            layer: layer.to_string(),
        }
    }).collect()
}

fn tags_for_file(path: &str, lang: &str, category: &str) -> Vec<String> {
    let mut tags = vec![lang.to_lowercase(), category.to_string()];
    if path.contains("test") { tags.push("test".to_string()); }
    if path.contains("auth") { tags.push("auth".to_string()); }
    if path.contains("api")  { tags.push("api".to_string()); }
    tags.dedup();
    tags
}

fn detect_frameworks(root: &str, out: &mut HashSet<String>) {
    let cargo = Path::new(root).join("Cargo.toml");
    if cargo.exists() { out.insert("Rust/Cargo".to_string()); }
    let pkg = Path::new(root).join("package.json");
    if pkg.exists() {
        if let Ok(s) = std::fs::read_to_string(&pkg) {
            if s.contains("\"next\"")    { out.insert("Next.js".to_string()); }
            if s.contains("\"react\"")   { out.insert("React".to_string()); }
            if s.contains("\"vue\"")     { out.insert("Vue".to_string()); }
            if s.contains("\"express\"") { out.insert("Express".to_string()); }
        }
    }
    let req = Path::new(root).join("requirements.txt");
    if req.exists() {
        if let Ok(s) = std::fs::read_to_string(&req) {
            if s.contains("django")  { out.insert("Django".to_string()); }
            if s.contains("fastapi") { out.insert("FastAPI".to_string()); }
            if s.contains("flask")   { out.insert("Flask".to_string()); }
        }
    }
}

pub fn load_graph(target: &str) -> Result<GraphData> {
    let path = Path::new(target).join(GRAPH_DIR).join(GRAPH_FILE);
    let s = std::fs::read_to_string(&path)
        .map_err(|_| anyhow::anyhow!("No graph found. Run: yamtam-rt graph build {}", target))?;
    Ok(serde_json::from_str(&s)?)
}
