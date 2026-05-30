use serde::{Deserialize, Serialize};

pub const SCHEMA_VERSION: &str = "1.0";
pub const GRAPH_DIR: &str = ".yamtam/graph";
pub const GRAPH_FILE: &str = "knowledge-graph.json";

pub const IGNORE_DIRS: &[&str] = &[
    "node_modules", ".git", ".yamtam", "dist", "build", "__pycache__",
    ".cache", "coverage", ".next", "target", "venv", ".venv",
    "vendor", "tmp", ".tmp", "releases", ".claude-plugin",
];

pub const IGNORE_EXTS: &[&str] = &[
    ".pyc", ".class", ".o", ".so", ".dylib", ".dll", ".exe",
    ".zip", ".tar", ".gz", ".png", ".jpg", ".jpeg", ".gif",
    ".woff", ".woff2", ".ttf", ".pdf", ".lock",
];

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Node {
    pub id:         String,
    #[serde(rename = "type")]
    pub node_type:  String,
    pub name:       String,
    pub file_path:  String,
    pub language:   String,
    #[serde(default)]
    pub summary:    String,
    #[serde(default)]
    pub complexity: String,
    #[serde(default)]
    pub tags:       Vec<String>,
    #[serde(default)]
    pub line_range: Option<[usize; 2]>,
    #[serde(default)]
    pub category:   String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Edge {
    pub source:    String,
    pub target:    String,
    #[serde(rename = "type")]
    pub edge_type: String,
    #[serde(default = "default_weight")]
    pub weight:    f32,
}

fn default_weight() -> f32 { 1.0 }

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphMeta {
    pub project:        String,
    pub root:           String,
    pub languages:      Vec<String>,
    pub frameworks:     Vec<String>,
    pub total_files:    usize,
    pub analysed_at:    String,
    pub schema_version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GraphData {
    pub meta:  GraphMeta,
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
    #[serde(default)]
    pub tour:  Vec<TourStep>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TourStep {
    pub order:       usize,
    pub node_id:     String,
    pub name:        String,
    pub file_path:   String,
    pub language:    String,
    pub reason:      String,
    pub layer:       String,
}

pub fn lang_from_ext(ext: &str) -> &'static str {
    match ext {
        "py"                  => "Python",
        "ts" | "tsx"          => "TypeScript",
        "js" | "jsx" | "mjs"  => "JavaScript",
        "rs"                  => "Rust",
        "go"                  => "Go",
        "java"                => "Java",
        "kt"                  => "Kotlin",
        "cs"                  => "C#",
        "rb"                  => "Ruby",
        "sh" | "bash"         => "Shell",
        "yml" | "yaml"        => "YAML",
        "json"                => "JSON",
        "toml"                => "TOML",
        "md" | "mdx"          => "Markdown",
        "html"                => "HTML",
        "css" | "scss"        => "CSS",
        _                     => "Other",
    }
}

pub fn layer_from_path(path: &str) -> &'static str {
    if path.contains("/test") || path.contains("_test.") || path.contains(".test.") || path.contains("spec.") {
        "Test Layer"
    } else if path.contains("docs/") || path.ends_with(".md") {
        "Documentation"
    } else if path.contains("utils/") || path.contains("helpers/") || path.contains("lib/") {
        "Utilities"
    } else if path.contains("src/") || path.contains("core/") || path.contains("app/") {
        "Service Layer"
    } else {
        "Uncategorized"
    }
}

pub fn category_from_path(path: &str, lang: &str) -> &'static str {
    if path.contains("test") || path.contains("spec") { return "test"; }
    if path.ends_with(".md") { return "docs"; }
    if matches!(lang, "YAML" | "JSON" | "TOML") { return "config"; }
    if path.contains("script") || matches!(lang, "Shell") { return "scripts"; }
    "source"
}
