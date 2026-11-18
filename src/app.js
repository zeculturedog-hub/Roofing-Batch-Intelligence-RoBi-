import {inventory, complaints} from './data/mock-inventory.js';
import {recommendCoilAllocation, calculatePairCompatibility, TIER_DEFINITIONS} from './engine/compatibilityEngine.js';
import {analyzeComplaintPatterns} from './engine/complaintAnalyticsEngine.js';
import {FileDataSource} from './services/data-sources.js';
import {AuthService, ENTERPRISE_USERS} from './services/auth.js';

const $ = s => document.querySelector(s);
const mockInventory = inventory.map(record => ({ ...record }));
let page = 'Overview';
let selected = inventory[0];
let compatibilityTarget = { product: 'PPAZ COIL (Brick Red)', plant: '', quantity: 5000, color: 'Brick Red' };
let sourceInfo = { name: 'RoBI Mock Coil Stock', updated: '28 Aug 2026, 09:42', kind: 'mock' };
let selectedLoginEmail = ENTERPRISE_USERS[0].email;

const icon = {
  Overview: '⌂',
  Inventory: '▥',
  'Batch Explorer': '▤',
  Compatibility: '◈',
  Complaints: '◷',
  Insights: '◌',
  'Data Sources': '⇅'
};

const nav = ['Overview', 'Compatibility', 'Inventory', 'Batch Explorer', 'Complaints', 'Insights', 'Data Sources'];
const num = n => new Intl.NumberFormat().format(Math.round(n || 0));

function loginView() {
  const currentRole = (ENTERPRISE_USERS.find(u => u.email === selectedLoginEmail) || ENTERPRISE_USERS[0]).role;
  return `
    <div class="login-screen">
      <div class="login-card">
        <div class="intranet-badge">🔒 ALAF Enterprise Intranet Gateway</div>
        <div class="login-brand">
          <div class="brand-mark" style="width:40px;height:40px;font-size:15px">RoBI</div>
          <div style="text-align:left">
            <b style="font-family:Manrope;font-size:18px;display:block">RoBI Operations Portal</b>
            <span style="font-size:10px;color:var(--muted);letter-spacing:0.05em">ROOFING BATCH INTELLIGENCE</span>
          </div>
        </div>
        <h2 class="login-title">Sign In to RoBI</h2>
        <p class="login-subtitle">Select an authorized intranet role to access coil compatibility and gap planning.</p>

        <div class="account-selector">
          ${ENTERPRISE_USERS.map(u => `
            <div class="account-option ${u.email === selectedLoginEmail ? 'active' : ''}" data-email="${u.email}">
              <div class="avatar">${u.avatar}</div>
              <div>
                <b>${u.name} — <span style="font-weight:600;color:var(--blue)">${u.role}</span></b>
                <small>${u.department} · ${u.plant}</small>
              </div>
            </div>
          `).join('')}
        </div>

        <button class="btn primary login-btn" id="do-login">Authenticate as ${currentRole}</button>
        <div class="muted" style="font-size:11px;margin-top:14px">Secured behind corporate intranet firewall</div>
      </div>
    </div>
  `;
}

function layout(body) {
  const user = AuthService.getCurrentUser() || ENTERPRISE_USERS[0];
  return `<div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">RoBI</div>
        <div>
          <b>RoBI</b>
          <span>ROOFING BATCH INTELLIGENCE</span>
        </div>
      </div>
      <div class="nav-label">PLANNING & CONTROL</div>
      <nav class="nav">
        ${nav.map(n => `<button class="${page === n ? 'active' : ''}" data-page="${n}"><span>${icon[n]}</span>${n === 'Compatibility' ? 'Batch Allocation' : n}</button>`).join('')}
      </nav>
      <div class="side-bottom">
        <div class="status"><i class="dot"></i> System operational</div>
        <div class="profile">
          <div class="avatar">${user.avatar}</div>
          <div style="flex:1">
            <b style="font-size:12px;display:block">${user.name}</b>
            <small style="display:block">${user.role}</small>
            <button class="logout-btn" id="logout-btn">Sign Out</button>
          </div>
        </div>
      </div>
    </aside>
    <main class="main">
      <header class="topbar">
        <div>
          <div class="crumb">RoBI / ${page === 'Compatibility' ? 'Batch Allocation & Gap Planning' : page}</div>
          <div class="top-title">${page === 'Compatibility' ? 'Coil Allocation & Compatibility Advisor' : page}</div>
        </div>
        <div class="top-actions">
          <div class="source-pill">
            <span class="dot" style="display:inline-block;margin-right:6px"></span>${sourceInfo.name}<br/>
            <span class="muted">Updated ${sourceInfo.updated}</span>
          </div>
          <div class="avatar" title="${user.name} (${user.role})">${user.avatar}</div>
        </div>
      </header>
      <section class="content">${body}</section>
    </main>
  </div>`;
}

function kpi(label, value, note = 'Active stock data') {
  return `<div class="card kpi">
    <div class="kpi-label">${label}</div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-note">${note}</div>
  </div>`;
}

function chart(title, items) {
  const max = Math.max(...items.map(x => x[1]), 1);
  return `<div class="card panel">
    <h2 class="panel-title">${title}</h2>
    <p class="panel-sub">Active inventory mass distribution (KG)</p>
    <div class="chart">
      ${items.map(([n, v]) => `<div class="bar-col" title="${n}: ${num(v)} KG"><i style="height:${(v / max) * 100}%"></i><span>${n.slice(0, 10)}</span></div>`).join('')}
    </div>
    <div class="legend">
      <span><i></i>Coil Mass (KG)</span>
      <span>${num(items.reduce((a, x) => a + x[1], 0))} KG Total</span>
    </div>
  </div>`;
}

/** Redesigned Centered Landing Showcase for the Overview Page */
function overview() {
  return layout(`
    <div class="robi-landing-hero">
      <div class="robi-pill">⚡ Decision Support for Sales & Stock Planners</div>
      <h1>RoBI — Roofing Batch Intelligence</h1>
      <p>Intelligently allocate raw-material coils, prioritize <b>Zero-Mix single-coil fulfillment</b>, and prevent on-site shade variation complaints before dispatch.</p>
      
      <div class="robi-search-wrap">
        <input class="robi-search-input" id="global-search" placeholder="Search coils by Batch ID (e.g. IPP0184), Material (ZPAZ), Plant (DA01), or Color..." autofocus />
        <div id="global-results" class="robi-results-dropdown hidden"></div>
      </div>

      <div class="robi-quick-actions">
        <button class="btn primary" data-go="Compatibility">⚡ Plan Batch Allocation</button>
        <button class="btn" data-go="Inventory">▥ Inventory Overview</button>
        <button class="btn" data-go="Batch Explorer">▤ Explore All Coils</button>
        <button class="btn" data-go="Data Sources">⇅ Ingest SAP BI Export</button>
      </div>
    </div>
  `);
}

function inventoryDashboard() {
  const totalKG = inventory.reduce((s, x) => s + (Number(x.quantity) || 0), 0);
  const prepaintedKG = inventory.filter(x => /ZPAZ|Prepainted/i.test(x.materialType || x.product)).reduce((s, x) => s + x.quantity, 0);
  const aluzincKG = inventory.filter(x => /ZAZC|Aluzinc/i.test(x.materialType || x.product)).reduce((s, x) => s + x.quantity, 0);
  const hrcKG = inventory.filter(x => /ZHRC|Hot Rolled/i.test(x.materialType || x.product)).reduce((s, x) => s + x.quantity, 0);

  const plantCounts = {};
  inventory.forEach(x => { const p = x.plant ? x.plant.split('-')[0].trim() : 'Unknown'; plantCounts[p] = (plantCounts[p] || 0) + x.quantity; });
  const plantItems = Object.entries(plantCounts).slice(0, 5);

  const ageGroups = {};
  inventory.forEach(x => { ageGroups[x.ageBucket || '0–30 days'] = (ageGroups[x.ageBucket || '0–30 days'] || 0) + x.quantity; });
  const ageItems = Object.entries(ageGroups);

  return layout(`
    <div class="hero">
      <div>
        <h1>Coil Inventory & Stock Distribution</h1>
        <p>Executive view of raw-material coil tonnage by substrate, plant, and ageing distribution.</p>
      </div>
      <div>
        <button class="btn primary" data-go="Compatibility">⚡ Plan Safe Batch Mix</button>
      </div>
    </div>

    <div class="grid kpis">
      ${kpi('TOTAL COILS / BATCHES', inventory.length, 'Active dataset records')}
      ${kpi('TOTAL TONNAGE', `${num(totalKG / 1000)} T`, `${num(totalKG)} KG coil mass`)}
      ${kpi('PREPAINTED (ZPAZ)', `${num(prepaintedKG / 1000)} T`, 'Color-coated coils')}
      ${kpi('ALUZINC (ZAZC)', `${num(aluzincKG / 1000)} T`, 'Bare Al-Zinc coils')}
      ${kpi('ACTIVE PLANTS', new Set(inventory.map(x => x.plant)).size, 'Manufacturing locations')}
      ${kpi('RECORDED COMPLAINTS', complaints.length, 'Field observations')}
    </div>

    <div class="grid overview-grid">
      ${chart('Inventory by Material Substrate', [['ZPAZ Prepainted', prepaintedKG], ['ZAZC Aluzinc', aluzincKG], ['ZHRC Hot Rolled', hrcKG || 1]])}
      ${chart('Inventory by Plant', plantItems.length ? plantItems : [['DA01 Dar', 10000]])}
      <div class="card panel">
        <h2 class="panel-title">Inventory by Stock Age</h2>
        <p class="panel-sub">Dominant ageing bracket distribution</p>
        <ul class="list" style="margin-top:14px">
          ${ageItems.map(([b, q]) => `<li><span>${b}</span><b>${num(q)} KG (${Math.round((q / (totalKG || 1)) * 100)}%)</b></li>`).join('')}
        </ul>
      </div>
    </div>
  `);
}

/** Sales & Stock Planner 4-Tier Allocation Hub with Live Complaint Learning */
function compatibility() {
  const target = compatibilityTarget || { product: inventory[0]?.product || 'PPAZ COIL (Brick Red)', plant: '', quantity: 5000 };
  const rec = recommendCoilAllocation(target, inventory, complaints);

  const distinctProducts = [...new Set(inventory.map(x => x.product).filter(Boolean))];
  const distinctPlants = [...new Set(inventory.map(x => x.plant).filter(Boolean))];

  return layout(`
    <div class="hero">
      <div>
        <h1>Coil Allocation & Safe Batch Mixing</h1>
        <p>Input customer order demand to get instant 4-Tier safe coil batch recommendations, live complaint checks, and roll-forming gap calculations.</p>
      </div>
    </div>

    ${rec.hasComplaintConflict ? `
      <div class="conflict-alert-banner">
        <div class="icon">🚨</div>
        <div>
          <h4>Historical Field Complaint Conflict Detected (Downgraded to Tier 4)</h4>
          <p>
            Coils in this allocation were previously mixed on site in customer complaint <b>${rec.conflictAlertDetails?.complaintId}</b> (${rec.conflictAlertDetails?.issueType} on order <b>${rec.conflictAlertDetails?.customerReference}</b>: <i>"${rec.conflictAlertDetails?.description}"</i>).<br/>
            <b>Recommended Action:</b> Avoid mixing these coils on the same roof slope. Prioritize single-coil Zero Mix or allocate across physically separated buildings.
          </p>
        </div>
      </div>
    ` : ''}

    <div class="grid two-col">
      <!-- Order Demand Form -->
      <div class="card panel requirements">
        <h2 class="panel-title">Order Demand</h2>
        <p class="panel-sub">Set order parameters & required mass</p>
        
        <div class="field">
          <label>Target Product / Material Grade</label>
          <select id="spec-product" data-spec="product">
            <option value="">-- Any Matching Grade --</option>
            ${distinctProducts.map(p => `<option value="${p}" ${p === target.product ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label>Preferred Plant / Yard</label>
          <select id="spec-plant" data-spec="plant">
            <option value="">-- All Available Plants --</option>
            ${distinctPlants.map(pl => `<option value="${pl}" ${pl === target.plant ? 'selected' : ''}>${pl}</option>`).join('')}
          </select>
        </div>

        <div class="field">
          <label>Required Order Demand (KG)</label>
          <input type="number" id="spec-qty" data-spec="quantity" value="${target.quantity}" min="100" step="500" />
          <div class="preset-chips">
            <span class="preset-chip" data-qty="2500">2,500 KG</span>
            <span class="preset-chip" data-qty="5000">5,000 KG</span>
            <span class="preset-chip" data-qty="10000">10,000 KG</span>
            <span class="preset-chip" data-qty="20000">20,000 KG</span>
          </div>
        </div>

        <button class="btn primary" id="evaluate" style="width:100%;margin-top:14px">⚡ Evaluate Safe Allocation</button>
      </div>

      <!-- Recommendation & Allocation Results -->
      <div>
        <div class="card panel">
          <div class="rec-head">
            <div>
              <h2 class="panel-title">Allocation Recommendation</h2>
              <p class="panel-sub">${rec.summary}</p>
            </div>
            <span class="badge ${rec.tier.badgeClass}">${rec.tier.label}</span>
          </div>

          <!-- Planner Metric Boxes -->
          <div class="planner-metrics">
            <div class="metric-box">
              <label>Order Demand</label>
              <div class="val">${num(rec.demandKG)} KG</div>
            </div>
            <div class="metric-box success">
              <label>Stock Allocated</label>
              <div class="val">${num(rec.totalAllocatedKG)} KG</div>
            </div>
            <div class="metric-box">
              <label>Fulfilled</label>
              <div class="val">${rec.fulfilledPercent}%</div>
            </div>
            <div class="metric-box ${rec.productionGapKG > 0 ? 'gap' : 'success'}">
              <label>${rec.productionGapKG > 0 ? 'Production Gap' : 'Surplus Stock'}</label>
              <div class="val">${num(rec.productionGapKG)} KG</div>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="gap-bar-wrap">
            <div class="gap-bar-fill" style="width:${rec.fulfilledPercent}%"></div>
            <div class="gap-bar-deficit" style="width:${100 - rec.fulfilledPercent}%"></div>
          </div>

          <!-- Explanation Info -->
          <div class="info" style="margin-top:14px">
            <b>Rule Context:</b> ${rec.tier.description}
          </div>

          ${rec.warnings.map(w => `<p class="reason" style="color:#a96306;margin-top:10px">⚠ ${w}</p>`).join('')}

          <h3 class="panel-title" style="margin-top:22px">Selected Coil Batches (${rec.selected.length})</h3>
          ${rec.selected.length ? rec.selected.map(item => `
            <article class="card batch-card">
              <div class="rec-head">
                <div>
                  <h3>${item.batch.batchId}</h3>
                  <span class="muted">${item.batch.product} · ${item.batch.plant}</span>
                </div>
                <div style="text-align:right">
                  <div class="score">${num(item.allocatedKG)} KG</div>
                  <span class="muted">of ${num(item.totalAvailableKG)} KG coil</span>
                </div>
              </div>
              <div class="batch-meta">
                <span>Age Bracket: <b>${item.batch.ageBucket}</b></span>
                <span>Coil Remaining: <b>${num(item.remainingInCoilKG)} KG</b></span>
                <span>Location: ${item.batch.location || 'Coil Bay'}</span>
              </div>
            </article>
          `).join('') : '<div class="empty">No candidate coils available to allocate.</div>'}
        </div>
      </div>
    </div>
  `);
}

function explorer() {
  return layout(`
    <div class="hero">
      <div>
        <h1>Batch & Coil Explorer</h1>
        <p>Browse active inventory coils, inspect campaign series, and check batch profiles.</p>
      </div>
    </div>
    <div class="card panel">
      <div class="filters">
        <input id="batch-search" placeholder="Search batch, material, plant, series…" style="width:280px">
        <select id="product-filter">
          <option value="">All Materials / Products</option>
          ${[...new Set(inventory.map(x => x.product).filter(Boolean))].map(x => `<option>${x}</option>`).join('')}
        </select>
        <span class="muted" id="record-count">${inventory.length} records</span>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              ${['Batch ID', 'Product / Description', 'Substrate Type', 'Plant / Location', 'Mass (KG)', 'Age Bracket', 'Color / Coating'].map(x => `<th>${x}</th>`).join('')}
            </tr>
          </thead>
          <tbody id="batch-rows"></tbody>
        </table>
      </div>
    </div>
    <div id="batch-detail"></div>
  `);
}

function rows(items) {
  return items.map(b => `
    <tr data-id="${b.id}">
      <td><b>${b.batchId}</b></td>
      <td>${b.product}</td>
      <td>${b.materialType || 'Coil'}</td>
      <td>${b.plant}</td>
      <td><b>${num(b.quantity)}</b> ${b.quantityUnit || 'KG'}</td>
      <td><span class="badge ${b.ageBucket && b.ageBucket.includes('0–30') ? 'tier-1' : 'tier-3'}">${b.ageBucket || '0–30 days'}</span></td>
      <td>${b.color || 'Standard'} ${b.thickness ? `· ${b.thickness}` : ''}</td>
    </tr>
  `).join('');
}

function complaintsPage() {
  return layout(`
    <div class="hero">
      <div>
        <h1>Customer Complaints & Feedback</h1>
        <p>Log shade and quality feedback to teach RoBI which batch combinations trigger field issues.</p>
      </div>
    </div>
    <div class="grid complaint-grid">
      <div class="card panel">
        <h2 class="panel-title">Recorded Observations</h2>
        <p class="panel-sub">${complaints.length} historical feedback entries</p>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr><th>ID</th><th>Product</th><th>Batches Mixed</th><th>Issue Type</th><th>Severity</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${complaints.map(c => `<tr>
                <td><b>${c.id}</b></td>
                <td>${c.product}</td>
                <td><span style="font-family:monospace">${c.batches}</span></td>
                <td>${c.issueType}</td>
                <td><span class="badge ${c.severity === 'High' ? 'tier-4' : 'tier-3'}">${c.severity}</span></td>
                <td>${c.status}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card panel">
        <h2 class="panel-title">Record New Field Complaint</h2>
        <p class="panel-sub">Link observed roof shade variation to supplied batch combinations.</p>
        <form id="complaint-form">
          <div class="field"><label>Sales Order / Reference</label><input name="reference" required placeholder="e.g. SO-904123" /></div>
          <div class="field"><label>Product / Description</label><input name="product" required placeholder="e.g. PPAZ COIL (Brick Red)" /></div>
          <div class="field"><label>Batches Mixed on Site</label><input name="batches" required placeholder="e.g. IPP0184253 + IT00003905" /></div>
          <div class="field"><label>Issue Type</label><select name="issueType"><option>Visible shade variation</option><option>Gloss / finish difference</option><option>Surface coating flaw</option><option>Other</option></select></div>
          <div class="field"><label>Severity</label><select name="severity"><option>High</option><option selected>Medium</option><option>Low</option></select></div>
          <div class="field"><label>Observation Notes</label><textarea name="description" rows="3" placeholder="Describe customer roof observation..."></textarea></div>
          <button class="btn primary">Save Complaint Record</button>
        </form>
      </div>
    </div>
  `);
}

function insights() {
  const analytics = analyzeComplaintPatterns(complaints, inventory);
  const top = (values, fallback) => values.length ? values.slice(0, 4) : [[fallback, 0]];
  return layout(`
    <div class="hero">
      <div>
        <h1>RoBI Learning & Insights</h1>
        <p>Empirical evidence connecting historical batch pairings with shade-risk complaints.</p>
      </div>
    </div>
    <div class="grid kpis">
      ${kpi('TOTAL COMPLAINTS', analytics.total, 'Field reports')}
      ${kpi('SHADE VARIATION CASES', analytics.shadeDifference, 'Color clash instances')}
      ${kpi('RECURRING COMBINATIONS', analytics.frequent.length, 'Potential risk patterns')}
      ${kpi('ACTIVE BATCHES', inventory.length, 'Monitored stock')}
    </div>
    <div class="grid overview-grid">
      ${chart('Complaints by Product', top(analytics.byProduct, 'No data'))}
      ${chart('Complaints by Plant', top(analytics.byPlant, 'No data'))}
      <div class="card panel">
        <h2 class="panel-title">Recurring Signal Analysis</h2>
        <p class="panel-sub">Pattern detection from field complaints</p>
        ${analytics.frequent.length ? analytics.frequent.map(item => `
          <div class="info" style="margin-top:10px">
            <b>${item.combination}</b><br/>
            ${item.count} complaint records. ${item.message}
          </div>
        `).join('') : '<div class="empty">No recurring clash patterns detected yet.</div>'}
      </div>
    </div>
  `);
}

function dataSources() {
  return layout(`
    <div class="hero">
      <div>
        <h1>Data Sources & SAP BI Ingestion</h1>
        <p>Upload SAP BI inventory workbooks (e.g. July / June reports) with multi-sheet parsing support.</p>
      </div>
    </div>
    <div class="grid complaint-grid">
      <div class="card panel">
        <h2 class="panel-title">Active Data Source</h2>
        <p class="panel-sub">Current working inventory in memory</p>
        <ul class="list">
          <li><span>Source</span><b>${sourceInfo.name}</b></li>
          <li><span>Status</span><b class="up">● Connected</b></li>
          <li><span>Total Records</span><b>${inventory.length}</b></li>
          <li><span>Total Mass</span><b>${num(inventory.reduce((s, x) => s + (x.quantity || 0), 0))} KG</b></li>
          <li><span>Last Ingested</span><b>${sourceInfo.updated}</b></li>
        </ul>
        <div style="margin-top:16px">
          ${sourceInfo.kind === 'upload' ? '<button class="btn" id="restore-mock">Restore Mock Dataset</button>' : ''}
        </div>
      </div>

      <div class="card panel">
        <h2 class="panel-title">Upload SAP BI Export</h2>
        <p class="panel-sub">Select a .csv, .xls, or .xlsx file (e.g. BI Template - Controls.xlsx)</p>
        <div class="info">
          Automatically normalizes SAP BI cross-tabs, parses plant codes (DA01, AR01), material types (ZPAZ, ZAZC), coil weights (KG), and 9 ageing buckets.
        </div>
        <div class="field" style="margin-top:16px">
          <label>Choose File</label>
          <input id="file-input" type="file" accept=".csv,.xls,.xlsx" />
        </div>
        <div id="sheet-selector-wrap" class="field hidden">
          <label>Select Sheet to Ingest</label>
          <select id="sheet-select"></select>
        </div>
        <div id="upload-status" class="muted">No file selected.</div>
        <div id="upload-preview"></div>
      </div>
    </div>
  `);
}

function showDetail(b) {
  if (!b) return;
  const samePlantSibling = inventory.filter(x => x.id !== b.id && x.plant === b.plant).slice(0, 4);
  $('#batch-detail').innerHTML = `
    <div class="card panel detail">
      <div class="rec-head">
        <div>
          <h2 class="panel-title">Coil Batch Profile · ${b.batchId}</h2>
          <p class="panel-sub">${b.product} · ${b.materialType || 'Coil'} · ${b.plant}</p>
        </div>
        <span class="badge tier-1">${b.ageBucket || '0–30 days'}</span>
      </div>
      <div class="batch-meta">
        <span>Available Mass: <b>${num(b.quantity)} ${b.quantityUnit || 'KG'}</b></span>
        <span>Plant: <b>${b.plant}</b></span>
        <span>Location: ${b.location || 'Coil Yard'}</span>
        <span>Substrate: ${b.materialType || 'Coil Stock'}</span>
      </div>
      <h3 class="panel-title" style="margin-top:20px">Coil Compatibility in Same Yard</h3>
      <div class="checks" style="margin-top:8px">
        ${samePlantSibling.map(x => {
          const comp = calculatePairCompatibility(b, x, complaints);
          return `<button class="check" data-batch="${x.id}">
            <b>${x.batchId}</b> (${num(x.quantity)} KG) — <span class="badge ${comp.tier.badgeClass}" style="padding:2px 6px;font-size:9px">${comp.tier.label}</span>
          </button>`;
        }).join('')}
      </div>
    </div>
  `;
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function render() {
  if (!AuthService.isAuthenticated()) {
    $('#app').innerHTML = loginView();
    bindLogin();
    return;
  }

  const body = page === 'Overview' ? overview()
    : page === 'Inventory' ? inventoryDashboard()
    : page === 'Batch Explorer' ? explorer()
    : page === 'Compatibility' ? compatibility()
    : page === 'Complaints' ? complaintsPage()
    : page === 'Insights' ? insights()
    : dataSources();

  $('#app').innerHTML = body;
  bind();

  // Search logic on the landing hero
  if (page === 'Overview') {
    const input = $('#global-search');
    const results = $('#global-results');
    input?.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        results.classList.add('hidden');
        results.innerHTML = '';
        return;
      }
      const matches = inventory.filter(item =>
        item.batchId?.toLowerCase().includes(q) ||
        item.product?.toLowerCase().includes(q) ||
        item.materialType?.toLowerCase().includes(q) ||
        item.plant?.toLowerCase().includes(q) ||
        item.color?.toLowerCase().includes(q)
      ).slice(0, 6);

      if (matches.length) {
        results.classList.remove('hidden');
        results.innerHTML = matches.map(item => `
          <button class="check" data-batch="${item.id}" style="width:100%;margin:3px 0;display:flex;justify-content:space-between">
            <span><b>${item.batchId}</b> · ${item.product} · ${item.plant}</span>
            <b>${num(item.quantity)} ${item.quantityUnit || 'KG'}</b>
          </button>
        `).join('');
        results.querySelectorAll('[data-batch]').forEach(btn => {
          btn.onclick = () => {
            selected = inventory.find(x => x.id === btn.dataset.batch);
            page = 'Batch Explorer';
            render();
            showDetail(selected);
          };
        });
      } else {
        results.classList.remove('hidden');
        results.innerHTML = '<span class="muted" style="padding:8px;display:block">No matching coils found.</span>';
      }
    });
  }
}

function bindLogin() {
  document.querySelectorAll('.account-option').forEach(opt => {
    opt.onclick = () => {
      selectedLoginEmail = opt.dataset.email;
      $('#app').innerHTML = loginView();
      bindLogin();
    };
  });

  $('#do-login')?.addEventListener('click', () => {
    AuthService.login(selectedLoginEmail);
    page = 'Overview';
    render();
  });
}

function bind() {
  $('#logout-btn')?.addEventListener('click', () => {
    AuthService.logout();
    render();
  });

  document.querySelectorAll('[data-page],[data-go]').forEach(b => {
    b.onclick = () => {
      page = b.dataset.page || b.dataset.go;
      render();
    };
  });

  if (page === 'Batch Explorer') {
    const filter = () => {
      const q = ($('#batch-search')?.value || '').toLowerCase();
      const p = $('#product-filter')?.value || '';
      const data = inventory.filter(x => (!p || x.product === p) && Object.values(x).join(' ').toLowerCase().includes(q));
      $('#batch-rows').innerHTML = rows(data);
      $('#record-count').textContent = `${data.length} records`;
      document.querySelectorAll('#batch-rows tr').forEach(r => {
        r.onclick = () => showDetail(inventory.find(x => x.id === r.dataset.id));
      });
    };
    $('#batch-search').oninput = filter;
    $('#product-filter').onchange = filter;
    filter();
  }

  if (page === 'Compatibility') {
    document.querySelectorAll('.preset-chip').forEach(chip => {
      chip.onclick = () => {
        $('#spec-qty').value = chip.dataset.qty;
        evaluateTarget();
      };
    });

    const evaluateTarget = () => {
      compatibilityTarget = {
        product: $('#spec-product')?.value || '',
        plant: $('#spec-plant')?.value || '',
        quantity: Number($('#spec-qty')?.value) || 5000
      };
      render();
    };

    $('#evaluate').onclick = evaluateTarget;
  }

  if (page === 'Complaints') {
    $('#complaint-form').onsubmit = e => {
      e.preventDefault();
      const f = new FormData(e.target);
      complaints.unshift({
        id: `CMP-${String(261 + complaints.length).padStart(4, '0')}`,
        date: new Date().toISOString().slice(0, 10),
        customerReference: f.get('reference'),
        product: f.get('product'),
        batches: f.get('batches'),
        issueType: f.get('issueType'),
        severity: f.get('severity'),
        description: f.get('description'),
        status: 'Under Investigation'
      });
      render();
    };
  }

  if (page === 'Data Sources') {
    let uploadedFile = null;
    let fileSource = new FileDataSource();

    $('#restore-mock')?.addEventListener('click', () => {
      inventory.splice(0, inventory.length, ...mockInventory.map(r => ({ ...r })));
      sourceInfo = { name: 'RoBI Mock Coil Stock', updated: '28 Aug 2026, 09:42', kind: 'mock' };
      render();
    });

    $('#file-input').onchange = async event => {
      const file = event.target.files[0];
      if (!file) return;
      uploadedFile = file;
      $('#upload-status').textContent = `Inspecting workbook ${file.name}...`;

      try {
        const { availableSheets, defaultSheet } = await fileSource.inspectWorkbook(file);
        const selectorWrap = $('#sheet-selector-wrap');
        const sheetSelect = $('#sheet-select');

        selectorWrap.classList.remove('hidden');
        sheetSelect.innerHTML = availableSheets.map(s => `<option value="${s}" ${s === defaultSheet ? 'selected' : ''}>${s}</option>`).join('');

        const parseSelectedSheet = async (sheetName) => {
          $('#upload-status').textContent = `Parsing sheet ${sheetName}...`;
          const parsed = await fileSource.parse(file, sheetName);
          $('#upload-status').innerHTML = `<span class="up">✓ Validated ${parsed.records.length.toLocaleString()} coils (${num(parsed.totalWeightKG / 1000)} T) from sheet ${parsed.sheetName}.</span>`;
          $('#upload-preview').innerHTML = `
            <div class="info" style="margin-top:12px">
              <b>Import Preview (${parsed.records.length.toLocaleString()} Coils):</b><br/>
              ${parsed.records.slice(0, 3).map(r => `• <b>${r.batchId}</b>: ${r.product} (${r.plant}) — ${num(r.quantity)} KG`).join('<br/>')}<br/><br/>
              <button class="btn primary" id="import-data">Import ${parsed.records.length.toLocaleString()} Coils into RoBI</button>
            </div>
          `;
          $('#import-data').onclick = () => {
            inventory.splice(0, inventory.length, ...parsed.records);
            sourceInfo = { name: parsed.sourceName, updated: new Date().toLocaleTimeString(), kind: 'upload' };
            page = 'Overview';
            render();
          };
        };

        sheetSelect.onchange = () => parseSelectedSheet(sheetSelect.value);
        await parseSelectedSheet(defaultSheet);
      } catch (err) {
        $('#upload-status').innerHTML = `<span style="color:#c94a4a">Upload error: ${err.message}</span>`;
      }
    };
  }
}

render();

