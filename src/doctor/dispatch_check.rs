//! `yana doctor dispatch` — cross-checks src/main.rs's `Commands` enum
//! against bin/yana's dispatch table.
//!
//! This exists because of a bug pattern that has hit this repo twice in one
//! day: a command gets ported from Python to Rust, main.rs gets updated,
//! but bin/yana's dispatch table is never touched — so the command looks
//! ported but is either unreachable (no route exists) or routes to a name
//! that doesn't exist in Rust at all. Static text parsing, not a full Rust
//! parser — good enough for this codebase's consistent one-variant-per-line
//! style, and avoids pulling in a syn/proc-macro2 dependency for a doctor
//! check.

use std::fs;
use std::path::Path;

pub struct DispatchFinding {
    pub rust_unreachable: bool,
    pub name: String,
    pub detail: String,
}

pub struct DispatchReport {
    pub rust_subcommands: Vec<String>,
    pub findings: Vec<DispatchFinding>,
}

/// PascalCase -> kebab-case, matching clap's derive default (via heck):
/// insert '-' before an uppercase letter that follows a lowercase letter
/// or digit, then lowercase the whole thing.
fn pascal_to_kebab(name: &str) -> String {
    let mut out = String::with_capacity(name.len() + 4);
    let mut prev_lower_or_digit = false;
    for c in name.chars() {
        if c.is_uppercase() && prev_lower_or_digit {
            out.push('-');
        }
        out.push(c.to_ascii_lowercase());
        prev_lower_or_digit = c.is_lowercase() || c.is_ascii_digit();
    }
    out
}

/// Extracts top-level variant names from `enum Commands { ... }` in main.rs.
/// Tracks brace depth so nested struct-variant fields (`{ target: String }`)
/// aren't mistaken for new variants; skips doc-comment lines before counting
/// braces so a `///` line mentioning `{` can't desync the depth counter.
fn extract_rust_commands(main_rs: &str) -> Vec<String> {
    let mut names = Vec::new();
    let mut in_enum = false;
    let mut depth: i32 = 0;

    for raw_line in main_rs.lines() {
        let line = raw_line.trim();
        if line.starts_with("///") || line.starts_with("//") {
            continue;
        }

        if !in_enum {
            if line.contains("enum Commands") && line.contains('{') {
                in_enum = true;
                depth = 1;
            }
            continue;
        }

        // At depth 1 we're directly inside the enum body — a line starting
        // with an identifier followed by '{' or ',' is a variant.
        if depth == 1 {
            if let Some(first_word) = line.split(|c: char| c == '{' || c == ',' || c.is_whitespace())
                .find(|s| !s.is_empty())
            {
                let is_variant_start = first_word.chars().next().is_some_and(|c| c.is_ascii_uppercase())
                    && first_word.chars().all(|c| c.is_ascii_alphanumeric())
                    && (line[first_word.len()..].trim_start().starts_with('{')
                        || line[first_word.len()..].trim_start().starts_with(','));
                if is_variant_start {
                    names.push(first_word.to_string());
                }
            }
        }

        for c in line.chars() {
            match c {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth <= 0 {
                        in_enum = false;
                    }
                }
                _ => {}
            }
        }
        if !in_enum {
            break;
        }
    }
    names
}

/// Extracts every subcommand name bin/yana actually invokes via `rt <name>`
/// inside its `case "$COMMAND" in ... esac` dispatch table — both the
/// literal form (`rt scan "$@"`) and the passthrough form
/// (`a|b|c) rt "$COMMAND" "$@" ;;`, where each of a/b/c is reachable).
/// Matches a literal `rt <word>` invocation on a trimmed source line — used
/// both inside case arm bodies directly and inside the `cmd_xxx()` helper
/// functions that most case arms delegate to (e.g. `cmd_audit() { rt scan
/// "$@"; }`). Returns the literal subcommand word, or None if the call uses
/// `rt "$COMMAND"` (passthrough — handled separately, see
/// [`find_passthrough_labels`]) or isn't a bare-word `rt` call at all.
fn literal_rt_word(line: &str) -> Option<String> {
    let idx = line.find("rt ")?;
    let prefix = line[..idx].trim_end();
    if !(prefix.is_empty() || prefix.ends_with('{') || prefix.ends_with(';') || prefix.ends_with(')')) {
        return None;
    }
    let rest = &line[idx + 3..];
    let word = rest.split_whitespace().next()?;
    if word.starts_with('"') || word.starts_with('$') {
        return None;
    }
    Some(word.trim_matches('"').to_string())
}

/// Finds every `rt "$COMMAND"` passthrough arm — only valid inside the
/// outer dispatch `case "$COMMAND" in ... esac`, since `$COMMAND` is that
/// case's scrutinee. Tracks nesting depth so the nested `case ... esac`
/// blocks inside the policy/rule/report arms (whose labels like "check",
/// "html", "import" are sub-subcommands, not top-level CLI commands) don't
/// get misread as more dispatch arms or prematurely end the scan.
fn find_passthrough_labels(bin_yana: &str) -> Vec<String> {
    let mut routed = Vec::new();
    let mut current_labels: Vec<String> = Vec::new();
    let mut depth: u32 = 0;

    for raw_line in bin_yana.lines() {
        let line = raw_line.trim();
        if line.starts_with('#') {
            continue;
        }

        if depth == 0 {
            if line.starts_with("case \"$COMMAND\"") {
                depth = 1;
            }
            continue;
        }

        if line.starts_with("case ") && line.ends_with(" in") {
            depth += 1;
            continue;
        }
        if line == "esac" {
            depth -= 1;
            if depth == 0 {
                break;
            }
            continue;
        }
        if depth != 1 {
            continue;
        }

        // Case label line, e.g. `task|eval|bus|memory|plugin|cost|vault|spec|provenance)`
        if line.ends_with(')') && !line.contains('(') {
            let label_part = line.trim_end_matches(')');
            current_labels = label_part.split('|').map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty() && *s != "*" && !s.starts_with('"'))
                .collect();
            continue;
        }

        if line.contains("rt \"$COMMAND\"") {
            routed.extend(current_labels.iter().cloned());
        }
    }
    routed
}

fn extract_bin_yana_routes(bin_yana: &str) -> Vec<String> {
    let mut routed: Vec<String> = bin_yana.lines()
        .map(str::trim)
        .filter(|l| !l.starts_with('#'))
        .filter_map(literal_rt_word)
        .collect();
    routed.extend(find_passthrough_labels(bin_yana));
    routed
}

pub fn check(repo_root: &Path) -> DispatchReport {
    let main_rs_path = repo_root.join("src/main.rs");
    let bin_yana_path = repo_root.join("bin/yana");

    let main_rs = fs::read_to_string(&main_rs_path).unwrap_or_default();
    let bin_yana = fs::read_to_string(&bin_yana_path).unwrap_or_default();

    let rust_variants = extract_rust_commands(&main_rs);
    let rust_subcommands: Vec<String> = rust_variants.iter().map(|v| pascal_to_kebab(v)).collect();
    let routed = extract_bin_yana_routes(&bin_yana);

    let mut findings = Vec::new();

    for name in &rust_subcommands {
        if !routed.iter().any(|r| r == name) {
            findings.push(DispatchFinding {
                rust_unreachable: true,
                name: name.clone(),
                detail: "Rust subcommand exists in src/main.rs but bin/yana never calls `rt ".to_string()
                    + name + " ...` — unreachable from the CLI.",
            });
        }
    }
    for name in &routed {
        if !rust_subcommands.iter().any(|r| r == name) {
            findings.push(DispatchFinding {
                rust_unreachable: false,
                name: name.clone(),
                detail: format!("bin/yana routes to `rt {name} ...` but no such top-level subcommand exists in src/main.rs's Commands enum."),
            });
        }
    }

    DispatchReport { rust_subcommands, findings }
}

pub fn cmd_doctor_dispatch(target: &str, as_json: bool) {
    let repo_root = Path::new(target);
    let report = check(repo_root);

    if as_json {
        let out = serde_json::json!({
            "rust_subcommands": report.rust_subcommands,
            "findings": report.findings.iter().map(|f| serde_json::json!({
                "kind": if f.rust_unreachable { "unreachable" } else { "routes_to_missing" },
                "name": f.name,
                "detail": f.detail,
            })).collect::<Vec<_>>(),
        });
        println!("{}", serde_json::to_string_pretty(&out).unwrap());
        std::process::exit(if report.findings.is_empty() { 0 } else { 1 });
    }

    println!("\n  yana doctor dispatch\n");
    println!("  {} Rust subcommand(s) in src/main.rs\n", report.rust_subcommands.len());

    if report.findings.is_empty() {
        println!("  \x1b[32m✓ bin/yana dispatch table matches src/main.rs — no drift\x1b[0m\n");
        return;
    }

    for f in &report.findings {
        let icon = "\x1b[31m✗\x1b[0m";
        println!("  {icon} {}", f.name);
        println!("        {}", f.detail);
    }
    println!();
    println!("  \x1b[31m{} finding(s)\x1b[0m\n", report.findings.len());
    std::process::exit(1);
}
