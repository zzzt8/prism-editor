// app.js — Prism Visual Control Center V0 Dashboard
// Pure vanilla JS, no dependencies. Reads verification.json and renders the UI.

(function () {
  'use strict';

  const VERIFICATION_URL = '../artifacts/verification/M0/verification.json';

  // ── Utility ───────────────────────────────────────────────────────────────

  /** Create an element with optional className and attributes. */
  function el(tag, className, attrs) {
    const e = document.createElement(tag);
    if (className) e.className = className;
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        e.setAttribute(k, v);
      }
    }
    return e;
  }

  /** Create a text node. */
  function txt(s) { return document.createTextNode(s); }

  /** Escape HTML entities. */
  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Format ISO timestamp to local date+time. */
  function fmtTime(iso) {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
    } catch {
      return iso;
    }
  }

  /** Format duration in ms. */
  function fmtDuration(ms) {
    if (ms == null) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  /** Status badge element. */
  function statusBadge(status) {
    const s = status || 'PENDING';
    const b = el('span', `gate-status-badge ${s}`);
    const icons = { PASS: '✓', BLOCKED: '✗', FAILED: '✗', WARNING: '⚠', PENDING: '○', LOCKED: '⊘' };
    b.textContent = icons[s] || '?';
    b.title = s;
    return b;
  }

  /** Status chip element (larger, for header). */
  function overallChip(status) {
    const b = el('span', `overall-badge ${status}`);
    const labels = { PASS: 'PASS', BLOCKED: 'BLOCKED', FAILED: 'FAILED', WARNING: 'WARNING', PENDING: 'PENDING' };
    b.textContent = labels[status] || status;
    return b;
  }

  // ── Section: Header ───────────────────────────────────────────────────────

  function renderHeader(data) {
    const git = data.git || {};
    const phase = data.phase || 'M0';

    $('header-branch').textContent = git.branch || 'unknown';
    $('header-commit').textContent = git.commit ? `#${git.commit}` : '—';
    $('header-phase').textContent = phase;

    if (git.isDirty) {
      $('header-dirty').style.display = '';
    } else {
      $('header-dirty').style.display = 'none';
    }

    const overall = overallChip(data.overallStatus);
    const oldChip = $('header-overall');
    oldChip.parentNode.replaceChild(overall, oldChip);

    const generatedAt = $('generated-at');
    generatedAt.textContent = `生成于 ${fmtTime(data.generatedAt)}`;

    // Doc warning
    const docChanged = Object.values(data.sourceDocuments || {}).some(d => d.changed);
    if (docChanged) {
      $('doc-warning').style.display = '';
    } else {
      $('doc-warning').style.display = 'none';
    }
  }

  /** Shorthand for getElementById */
  function $(id) { return document.getElementById(id); }

  // ── Section: Roadmap ─────────────────────────────────────────────────────

  function renderRoadmap(data) {
    const milestones = data.milestones || {};
    const container = $('roadmap');
    container.innerHTML = '';

    const milestoneOrder = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];

    for (const id of milestoneOrder) {
      const m = milestones[id];
      if (!m) continue;

      const card = el('div', `milestone-card ${m.status} ${id === 'M0' ? 'current' : ''}`);
      if (m.status === 'LOCKED') card.classList.add('LOCKED');

      const idEl = el('div', 'milestone-id');
      idEl.textContent = id;
      card.appendChild(idEl);

      const nameEl = el('div', 'milestone-name');
      nameEl.textContent = m.name || id;
      card.appendChild(nameEl);

      const footer = el('div', 'milestone-footer');

      const progWrap = el('div', 'progress-bar-wrap');
      const progBar = el('div', `progress-bar ${m.status}`);
      const prog = m.progress || 0;
      progBar.style.width = `${prog}%`;
      progBar.title = `${prog}%`;
      progWrap.appendChild(progBar);
      footer.appendChild(progWrap);

      footer.appendChild(statusBadge(m.status));
      card.appendChild(footer);
      container.appendChild(card);
    }
  }

  // ── Section: Gate Matrix ─────────────────────────────────────────────────

  function renderGates(data) {
    const gates = data.gates || {};
    const tbody = $('gate-table-body');
    tbody.innerHTML = '';

    const gateOrder = [
      'scope-clean',
      'node-executor-real-run',
      'browser-executor-real-run',
      'same-fixture',
      'browser-node-comparison',
      'geometry-comparison',
      'browser-image-evidence',
      'node-image-evidence',
      'diff-image-evidence',
      'metrics-json-evidence',
      'no-skip-todo-only',
      'deterministic',
      'typecheck',
      'relevant-test-command',
      'build',
      'source-docs-stable',
    ];

    // Gate summary badges
    const summary = data.gateSummary || {};
    const badgeEl = $('gate-summary-badge');
    badgeEl.innerHTML = '';
    for (const [status, count] of Object.entries(summary).sort((a, b) => {
      const order = ['BLOCKED', 'FAILED', 'WARNING', 'PASS', 'PENDING'];
      return order.indexOf(a[0]) - order.indexOf(b[0]);
    })) {
      const chip = el('span', `gate-status-badge ${status}`);
      chip.textContent = `${status} ${count}`;
      chip.style.marginRight = '6px';
      chip.style.fontSize = '11px';
      chip.style.padding = '2px 6px';
      badgeEl.appendChild(chip);
    }

    for (const id of gateOrder) {
      const g = gates[id];
      if (!g) continue;

      const row = el('tr');
      row.style.cursor = 'default';

      // Status
      const statusCell = el('td', 'gate-status-cell');
      statusCell.appendChild(statusBadge(g.status));
      row.appendChild(statusCell);

      // Name
      const nameCell = el('td', 'gate-name');
      nameCell.textContent = g.name || id;
      row.appendChild(nameCell);

      // Reason
      const reasonCell = el('td', 'gate-reason');
      reasonCell.textContent = g.reason || '';
      row.appendChild(reasonCell);

      // Command
      const cmdCell = el('td', 'gate-cmd');
      cmdCell.textContent = g.command ? g.command.replace(/pnpm/g, 'pnpm') : '—';
      cmdCell.title = g.command || '';
      row.appendChild(cmdCell);

      // Exit code
      const codeCell = el('td', 'gate-code');
      if (g.exitCode !== null && g.exitCode !== undefined) {
        codeCell.textContent = g.exitCode;
        codeCell.style.color = g.exitCode === 0 ? 'var(--pass)' : 'var(--failed)';
      } else {
        codeCell.textContent = '—';
        codeCell.style.color = 'var(--text-muted)';
      }
      if (g.duration) {
        const dur = el('div');
        dur.style.fontSize = '10px';
        dur.style.color = 'var(--text-muted)';
        dur.textContent = fmtDuration(g.duration);
        codeCell.appendChild(el('br'));
        codeCell.appendChild(dur);
      }
      row.appendChild(codeCell);

      // Evidence path
      const pathCell = el('td', 'gate-path');
      pathCell.textContent = g.evidencePath ? g.evidencePath.split('/').slice(-2).join('/') : '—';
      pathCell.title = g.evidencePath || '';
      row.appendChild(pathCell);

      // Last run
      const timeCell = el('td', 'gate-time');
      timeCell.textContent = g.lastRun ? fmtTime(g.lastRun) : '—';
      row.appendChild(timeCell);

      tbody.appendChild(row);
    }
  }

  // ── Section: Visual Evidence ─────────────────────────────────────────────

  function renderEvidence(data) {
    const artifacts = data.artifacts || {};
    const container = $('evidence-grid');
    container.innerHTML = '';

    const evidenceOrder = [
      { key: 'browser.png', label: 'Browser 输出图', desc: 'Browser executor 渲染结果' },
      { key: 'node.png', label: 'Node 输出图', desc: 'Node executor 渲染结果' },
      { key: 'diff.png', label: 'Diff 对照图', desc: 'Browser vs Node 差异可视化' },
    ];

    for (const item of evidenceOrder) {
      const af = artifacts[item.key] || {};
      const card = el('div', 'evidence-card');

      const header = el('div', 'evidence-header');
      const label = el('div', 'evidence-label');
      label.textContent = item.label;
      const badge = statusBadge(af.exists ? 'PASS' : 'BLOCKED');
      header.appendChild(label);
      header.appendChild(badge);
      card.appendChild(header);

      const body = el('div', 'evidence-body');

      if (af.exists) {
        const img = el('img', 'evidence-img');
        img.src = `../artifacts/verification/M0/${item.key}?t=${Date.now()}`;
        img.alt = item.label;
        img.onerror = function () {
          img.style.display = 'none';
          body.innerHTML = '';
          body.appendChild(placeholder(item.label, '文件存在但无法显示'));
        };
        body.appendChild(img);
      } else {
        body.appendChild(placeholder(item.label, '暂无证据', item.desc));
      }
      card.appendChild(body);

      const meta = el('div', 'evidence-meta');
      const sizeEl = el('span');
      sizeEl.textContent = af.exists ? `文件大小: ${fmtSize(af.size)}` : '不存在';
      const timeEl = el('span');
      timeEl.textContent = af.modified ? `修改于: ${fmtTime(af.modified)}` : '';
      meta.appendChild(sizeEl);
      if (timeEl.textContent) meta.appendChild(timeEl);
      card.appendChild(meta);

      container.appendChild(card);
    }
  }

  function placeholder(label, text, subtext) {
    const div = el('div', 'evidence-placeholder');
    div.innerHTML = `
      <svg class="evidence-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <path d="M3 15l5-5 4 4 3-3 6 6"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
      </svg>`;
    const t1 = el('div');
    t1.className = 'evidence-placeholder-text';
    t1.textContent = text;
    const t2 = el('div');
    t2.style.fontSize = '10px';
    t2.style.color = 'var(--text-muted)';
    t2.textContent = subtext || '';
    div.appendChild(t1);
    if (subtext) div.appendChild(t2);
    return div;
  }

  function fmtSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  }

  // ── Section: Metrics ─────────────────────────────────────────────────────

  function renderMetrics(data) {
    const container = $('metrics-content');
    const metrics = data.artifacts?.['metrics.json'];

    // Also check for metrics embedded in internal data
    const internal = data._internal || {};
    const vitestResult = internal.vitestResult || {};

    if (!metrics && !vitestResult.exitCode) {
      container.innerHTML = '';
      const card = el('div', 'evidence-placeholder');
      card.style.background = 'var(--bg-card)';
      card.style.border = '1px solid var(--border)';
      card.style.borderRadius = 'var(--radius)';
      card.style.padding = '24px';
      card.style.textAlign = 'center';
      const t1 = el('div', 'evidence-placeholder-text');
      t1.textContent = '暂无 metrics.json';
      const t2 = el('div');
      t2.style.fontSize = '11px';
      t2.style.color = 'var(--text-muted)';
      t2.style.marginTop = '6px';
      t2.textContent = '测试仅在内存中运行，未生成磁盘证据';
      card.appendChild(t1);
      card.appendChild(t2);

      // Also show a small test summary
      const summary = el('div', 'metrics-table-wrap');
      summary.style.marginTop = '16px';
      summary.innerHTML = `
        <table class="metrics-table">
          <thead>
            <tr>
              <th>检查项</th>
              <th>结果</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>M0 测试 exit code</td>
              <td style="color:${vitestResult.exitCode === 0 ? 'var(--pass)' : 'var(--failed)'}">${vitestResult.exitCode ?? '未运行'}</td>
              <td>注意：exit code 0 ≠ M0 PASS</td>
            </tr>
            <tr>
              <td>M0 测试执行时长</td>
              <td>${fmtDuration(vitestResult.duration)}</td>
              <td>—</td>
            </tr>
            <tr>
              <td>Typecheck exit code</td>
              <td style="color:${internal.typecheckResult?.exitCode === 0 ? 'var(--pass)' : 'var(--failed)'}">${internal.typecheckResult?.exitCode ?? '未运行'}</td>
              <td>—</td>
            </tr>
            <tr>
              <td>Build exit code</td>
              <td style="color:${internal.buildResult?.exitCode === 0 ? 'var(--pass)' : 'var(--failed)'}">${internal.buildResult?.exitCode ?? '未运行'}</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>`;
      container.appendChild(card);
      container.appendChild(summary);
      return;
    }

    // Full metrics.json display
    container.innerHTML = `<pre style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;overflow:auto;font-size:12px;font-family:var(--font-mono);color:var(--text-secondary);max-height:400px">${esc(JSON.stringify(metrics, null, 2))}</pre>`;
  }

  // ── Section: Blockers ────────────────────────────────────────────────────

  function renderBlockers(data) {
    const container = $('blockers-content');
    container.innerHTML = '';

    const milestones = data.milestones || {};
    const m0 = milestones.M0 || {};
    const blockers = m0.blockers || [];
    const gates = data.gates || {};

    // Get all BLOCKED gates
    const blockedGates = Object.values(gates).filter(g => g.status === 'BLOCKED');

    if (blockedGates.length === 0) {
      const noBlock = el('div');
      noBlock.className = 'blockers-summary';
      noBlock.innerHTML = `<h4>当前无阻塞</h4><p>所有门禁均已通过，里程碑可以进入下一阶段。</p>`;
      container.appendChild(noBlock);
      return;
    }

    // Summary box
    const summary = el('div', 'blockers-summary');
    summary.innerHTML = `
      <h4>为什么当前阶段不能进入下一阶段</h4>
      <p>有 <strong>${blockedGates.length} 个门禁</strong>为 BLOCKED 状态：</p>`;

    const ul = el('ul');
    ul.style.marginTop = '8px';
    ul.style.paddingLeft = '20px';
    for (const g of blockedGates) {
      const li = el('li');
      li.textContent = `${g.name || g.id}：${g.reason || '缺少必要证据'}`;
      ul.appendChild(li);
    }
    summary.appendChild(ul);

    // Next steps
    const nextSteps = el('p');
    nextSteps.style.marginTop = '12px';
    nextSteps.innerHTML = '<strong>下一步应补什么：</strong>配置 <code>@vitest/browser</code> + playwright provider 使 Browser executor 真实执行；让 M0 测试生成 <code>browser.png</code> / <code>node.png</code> / <code>diff.png</code> / <code>metrics.json</code> 证据文件。';
    summary.appendChild(nextSteps);

    // Warning note
    const note = el('div', 'note');
    note.textContent = '⚠ 注意：test exit code = 0 不等于 M0 PASS。双端一致性验证必须 Browser 和 Node 都真实执行。';
    summary.appendChild(note);
    container.appendChild(summary);

    // Individual blocker cards
    const list = el('div', 'blockers-list');
    for (const g of blockedGates) {
      const item = el('div', 'blocker-item');
      const gate = el('div', 'blocker-gate');
      gate.textContent = g.name || g.id;
      const reason = el('div', 'blocker-reason');
      reason.textContent = g.reason || '缺少必要证据，无法验证此门禁';
      item.appendChild(gate);
      item.appendChild(reason);
      list.appendChild(item);
    }
    container.appendChild(list);
  }

  // ── Section: Git Impact ─────────────────────────────────────────────────

  function renderGitImpact(data) {
    const container = $('git-content');
    container.innerHTML = '';

    const git = data.git || {};
    const files = git.modifiedFiles || [];
    const violations = git.scopeViolations || [];

    // Scope violation banner
    if (violations.length > 0) {
      const banner = el('div', 'scope-warning-banner');
      banner.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1.5a.5.5 0 0 1 .5.5v5.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 1 1 .708-.708L7.5 7.293V2a.5.5 0 0 1 1 0v4z"/>
        </svg>
        禁止范围修改警告：${violations.length} 个文件在禁止区域内（packages/）`;
      container.appendChild(banner);
    }

    // Group files by category
    const categories = {};
    for (const f of files) {
      const cat = f.category || 'root';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(f);
    }

    const catOrder = ['tools', 'docs', 'openspec', 'tests', 'packages', 'apps', 'root'];
    const catLabels = {
      tools: '🛠 tools/',
      docs: '📄 docs/',
      openspec: '📋 openspec/',
      tests: '🧪 tests/',
      packages: '📦 packages/ (禁止)',
      apps: '📱 apps/',
      root: '🏠 root/',
    };

    for (const cat of catOrder) {
      const catFiles = categories[cat];
      if (!catFiles || catFiles.length === 0) continue;

      const section = el('div', 'git-category');

      const title = el('div', 'git-category-title');
      title.textContent = catLabels[cat] || cat;
      const count = el('span', 'git-category-count');
      count.textContent = `${catFiles.length} 个文件`;
      title.appendChild(count);
      section.appendChild(title);

      const fileList = el('div', 'git-file-list');
      for (const f of catFiles) {
        const tag = el('span', `git-file-tag ${f.inScope ? 'in-scope' : 'scope-violation'}`);
        tag.textContent = f.path.split('/').pop();
        tag.title = `${f.path}\n${f.warning || ''}`;
        if (f.warning) {
          const warnIcon = el('span');
          warnIcon.textContent = ' ⚠';
          warnIcon.style.color = 'var(--blocked)';
          tag.appendChild(warnIcon);
        }
        fileList.appendChild(tag);
      }
      section.appendChild(fileList);
      container.appendChild(section);
    }

    if (files.length === 0) {
      const empty = el('div', 'blockers-summary');
      empty.innerHTML = '<h4>无未提交的修改</h4><p>工作区干净。</p>';
      container.appendChild(empty);
    }

    // Recent commits
    const recent = git.recentCommits || [];
    if (recent.length > 0) {
      const recSection = el('div', 'git-category');
      const recTitle = el('div', 'git-category-title');
      recTitle.textContent = '📜 最近提交';
      recSection.appendChild(recTitle);

      const recList = el('div', 'git-file-list');
      for (const c of recent.slice(0, 5)) {
        const tag = el('span', 'git-file-tag');
        tag.textContent = `${c.hash.slice(0, 7)} ${c.message}`;
        tag.title = `${c.hash}\n${c.message}`;
        recList.appendChild(tag);
      }
      recSection.appendChild(recList);
      container.appendChild(recSection);
    }
  }

  // ── Main ─────────────────────────────────────────────────────────────────

  function render(data) {
    renderHeader(data);
    renderRoadmap(data);
    renderGates(data);
    renderEvidence(data);
    renderMetrics(data);
    renderBlockers(data);
    renderGitImpact(data);

    $('loading').style.display = 'none';
    $('content').style.display = '';
  }

  function showError(msg) {
    $('loading').style.display = 'none';
    $('error').style.display = '';
    $('error-msg').textContent = msg;
  }

  async function init() {
    try {
      const resp = await fetch(VERIFICATION_URL + '?t=' + Date.now(), {
        cache: 'no-cache',
      });
      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText} — 访问 ${VERIFICATION_URL} 失败。请先运行 \`pnpm prism:dashboard\` 或 \`node tools/prism-control-center/generate.mjs\` 生成数据。`);
      }
      const data = await resp.json();
      if (!data.schemaVersion) {
        throw new Error('verification.json 缺少 schemaVersion 字段，格式不可识别');
      }
      render(data);
    } catch (err) {
      console.error('[app] Failed to load verification data:', err);
      showError(err.message || String(err));
    }
  }

  init();
})();
