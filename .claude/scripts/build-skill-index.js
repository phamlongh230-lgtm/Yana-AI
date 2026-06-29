#!/usr/bin/env node
'use strict';

/**
 * build-skill-index.js
 * Reads all SKILL.md frontmatter, extracts trigger phrases,
 * outputs core/config/skill-trigger-index.json
 *
 * Usage: node core/scripts/build-skill-index.js
 */

const fs   = require('fs');
const path = require('path');

const ROOT       = path.resolve(__dirname, '..', '..');
const SKILLS_DIR = path.join(ROOT, 'core', 'skills');
const OUT_FILE   = path.join(ROOT, 'core', 'config', 'skill-trigger-index.json');

// ── Frontmatter parser ────────────────────────────────────────────────────────
function parseFrontmatter(text) {
  // Accept both ---\n...\n--- and ---\r\n...\r\n---
  const match = text.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
  if (!match) return {};

  const lines = match[1].split('\n');
  const result = {};
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // name: value
    const nameM = line.match(/^name:\s*(.+)$/);
    if (nameM) {
      result.name = nameM[1].trim().replace(/^["']|["']$/g, '');
      i++; continue;
    }

    // description: can be inline or multiline block (>-, |-)
    const descM = line.match(/^description:\s*(.*)/);
    if (descM) {
      let desc = descM[1].trim();

      if (desc === '>-' || desc === '|-' || desc === '>' || desc === '|') {
        // Block scalar — collect indented continuation lines
        const parts = [];
        i++;
        while (i < lines.length && /^\s+/.test(lines[i])) {
          parts.push(lines[i].trim());
          i++;
        }
        desc = parts.join(' ');
      } else {
        // Inline: may span continuation lines indented with spaces
        i++;
        while (i < lines.length && /^\s{2,}/.test(lines[i])) {
          desc += ' ' + lines[i].trim();
          i++;
        }
      }

      desc = desc.replace(/^["']|["']$/g, '');
      result.description = desc;
      continue;
    }

    i++;
  }

  return result;
}

// ── Trigger extractor ─────────────────────────────────────────────────────────
// Finds quoted phrases after "Triggers", "triggers on", "Triggers:"
const TRIGGER_SECTION = /[Tt]riggers(?:\s+on)?[:\s]+(.+)/;

function extractTriggers(description) {
  if (!description) return [];

  const triggerMatch = description.match(TRIGGER_SECTION);
  if (triggerMatch) {
    // Extract all single or double quoted strings from the trigger section
    const triggerSection = triggerMatch[1];
    const quoted = [];
    const re = /["']([^"']{2,60})["']/g;
    let m;
    while ((m = re.exec(triggerSection)) !== null) {
      quoted.push(m[1].toLowerCase().trim());
    }
    if (quoted.length >= 2) return quoted;
  }

  // Fallback: use the first sentence of description as a loose trigger source
  // Extract 2-4 word ngrams from description (max 6 fallback triggers)
  const clean = description
    .replace(/[Tt]riggers[^.]*\.?/, '')   // strip triggers section
    .replace(/[^\w\sáàảãạăắặẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵÁÀẢÃẠĂẮẶẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ]/g, ' ')
    .toLowerCase();

  const words = clean.split(/\s+/).filter(w => w.length > 2);
  const bigrams = [];
  for (let i = 0; i < Math.min(words.length - 1, 12); i++) {
    const bigram = `${words[i]} ${words[i + 1]}`;
    if (bigram.length > 5) bigrams.push(bigram);
  }
  return bigrams.slice(0, 6);
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  const index   = [];
  let processed = 0;
  let skipped   = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillFile = path.join(SKILLS_DIR, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) { skipped++; continue; }

    let text;
    try {
      text = fs.readFileSync(skillFile, 'utf8');
    } catch {
      skipped++;
      continue;
    }

    const fm = parseFrontmatter(text);
    const name = fm.name || entry.name;
    const triggers = extractTriggers(fm.description || '');

    if (triggers.length === 0) { skipped++; continue; }

    index.push({ name, triggers });
    processed++;
  }

  // Sort by name for stable diffs
  index.sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(OUT_FILE, JSON.stringify(index, null, 2), 'utf8');

  console.log(`skill-trigger-index: ${processed} skills indexed, ${skipped} skipped`);
  console.log(`Output: ${OUT_FILE}`);
}

main();
