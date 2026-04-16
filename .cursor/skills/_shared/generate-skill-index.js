/**
 * SKILL-INDEX.md 自动生成脚本
 *
 * 使用方法：
 *   node .cursor/skills/_shared/generate-skill-index.js
 *
 * 功能：
 *   扫描 .cursor/skills/ 下所有 SKILL.md，解析 YAML frontmatter，
 *   按 category 分组生成 SKILL-INDEX.md
 */

const fs = require('fs');
const path = require('path');

function parseFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  try {
    const yaml = require('yaml');
    return yaml.parse(match[1]);
  } catch (e) {
    console.warn(`Warning: yaml library not available, using fallback parser for ${filePath}`);
    return fallbackParse(match[1]);
  }
}

function fallbackParse(yamlContent) {
  const fm = {};
  const lines = yamlContent.replace(/\r/g, '').split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) { i++; continue; }

    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();

    if (value !== '' || !line.endsWith(':')) {
      fm[key] = value;
      i++;
      continue;
    }

    const arr = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].startsWith('  - ')) {
        arr.push(lines[j].replace(/^  - /, ''));
      } else {
        break;
      }
    }

    if (arr.length > 0) {
      fm[key] = arr;
      i += arr.length + 1;
    } else {
      fm[key] = [];
      i++;
    }
  }

  return fm;
}

function escapeMd(str) {
  if (Array.isArray(str)) {
    return str.map(s => `\`${s}\``).join(', ');
  }
  return str ? `\`${str}\`` : '—';
}

function generateIndex(skillsByCategory) {
  const order = ['explore', 'propose', 'meta', 'apply', 'verify', 'archive', 'debug'];
  const navLinks = order.filter(c => skillsByCategory[c]).map(c => `[${c}](#${c})`).join(' · ');

  let md = `---
name: _skill-index
description: 所有 Skill 的索引目录。按 category 组织。
---

# Skill Index

> 本 index 由生成脚本自动维护。所有 Skill 必须遵循 [SKILL-SCHEMA.md](./SKILL-SCHEMA.md) 定义的元数据 schema。

## 快速导航

${navLinks}

---

`;

  for (const cat of order) {
    const skills = skillsByCategory[cat];
    if (!skills) continue;

    md += `## ${cat}\n\n`;

    for (const skill of skills) {
      md += `### ${skill.name}\n\n`;
      md += `${skill.description || ''}\n\n`;

      md += '| 属性 | 值 |\n';
      md += '|------|----|\n';
      md += `| name | \`${skill.name}\` |\n`;
      md += `| category | \`${cat}\` |\n`;
      if (skill.version) md += `| version | \`${skill.version}\` |\n`;
      if (skill.tags) md += `| tags | ${escapeMd(skill.tags)} |\n`;
      if (skill.aliases) md += `| aliases | ${escapeMd(skill.aliases)} |\n`;
      if (skill.depends_on && skill.depends_on.length > 0) {
        md += `| depends_on | ${escapeMd(skill.depends_on)} |\n`;
      }
      md += '\n';

      if (skill.aliases && skill.aliases.length > 0) {
        md += '```bash\n';
        md += `${skill.aliases[0]}\n`;
        md += '```\n\n';
      }

      md += '---\n\n';
    }
  }

  md += `## 搜索示例

### 按 tag 搜索

\`\`\`
layer:meta    → 所有 OpenSpec 相关 skill
layer:engine  → 工作流/图像操作相关
layer:backend → 服务端/数据库相关
\`\`\`

### 按 category 搜索

\`\`\`
propose → openspec-propose
apply   → openspec-apply
verify  → openspec-verify
archive → openspec-archive
debug   → openspec-debug
meta    → openspec-plan, openspec-skill
\`\`\`

## 相关文件

- [SKILL-SCHEMA.md](./SKILL-SCHEMA.md) — 元数据字段规范
- [SHARED-LAYERS.md](./SHARED-LAYERS.md) — Layer 映射和验证命令
`;

  return md;
}

function main() {
  const skillsDir = path.resolve(__dirname, '..');
  const indexPath = path.join(__dirname, 'SKILL-INDEX.md');

  const skillFiles = [];

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const skillFile = path.join(fullPath, 'SKILL.md');
        if (fs.existsSync(skillFile)) {
          skillFiles.push(skillFile);
        } else if (entry.name !== '_shared') {
          walkDir(fullPath);
        }
      }
    }
  }

  walkDir(skillsDir);

  const skills = skillFiles.map(file => {
    const fm = parseFrontmatter(file);
    if (!fm || !fm.name) return null;
    return {
      name: fm.name,
      description: fm.description,
      version: fm.version,
      category: fm.category,
      tags: fm.tags,
      aliases: fm.aliases,
      depends_on: fm.depends_on
    };
  }).filter(Boolean);

  const skillsByCategory = {};
  for (const skill of skills) {
    const cat = skill.category || 'other';
    if (!skillsByCategory[cat]) skillsByCategory[cat] = [];
    skillsByCategory[cat].push(skill);
  }

  const index = generateIndex(skillsByCategory);

  fs.writeFileSync(indexPath, index, 'utf8');
  console.log(`Generated: ${indexPath}`);
  console.log(`Found ${skillFiles.length} skills in ${Object.keys(skillsByCategory).length} categories`);
}

if (require.main === module) {
  main();
}

module.exports = { parseFrontmatter, generateIndex };
