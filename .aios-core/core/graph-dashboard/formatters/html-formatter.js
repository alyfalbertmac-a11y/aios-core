'use strict';

// Design tokens aligned with dashboard globals.css (Design Tokens v2.0)
// Source of truth: pro-design-migration/apps/dashboard/src/app/globals.css
const THEME = {
  bg: {
    base: '#000000',       // --bg-base
    surface: '#0A0A0A',    // --bg-surface
    overlay: 'rgba(10,10,10,0.9)', // --bg-surface + opacity
  },
  text: {
    primary: '#E8E8DF',    // --text-primary
    secondary: '#B8B8AC',  // --text-secondary
    tertiary: '#8A8A7F',   // --text-tertiary
    muted: '#6B6B63',      // --text-muted
  },
  status: {
    success: '#4ADE80',    // --status-success
    warning: '#FBBF24',    // --status-warning
    error: '#F87171',      // --status-error
    info: '#60A5FA',       // --status-info
  },
  border: {
    default: 'rgba(255,255,255,0.06)', // --border
    subtle: 'rgba(255,255,255,0.04)',  // --border-subtle (card-refined)
    highlight: 'rgba(201,178,152,0.25)', // --border-gold
    gold: 'rgba(201,178,152,0.25)',    // --border-gold (alias for highlight)
    goldStrong: 'rgba(201,178,152,0.5)', // --border-gold-strong (selection)
  },
  accent: {
    gold: '#C9B298',       // --accent-gold
  },
  agent: {
    dev: '#22c55e',        // --agent-dev
    sm: '#f472b6',         // --agent-sm
    po: '#f97316',         // --agent-po
    qa: '#eab308',         // --agent-qa
    architect: '#8b5cf6',  // --agent-architect
    devops: '#ec4899',     // --agent-devops
    analyst: '#06b6d4',    // --agent-analyst
  },
  tooltip: {
    bg: '#0A0A0A',         // = bg.surface (card-refined)
    border: 'rgba(255,255,255,0.04)', // = border.subtle
    shadow: '0 4px 12px rgba(0,0,0,0.5)', // --tooltip-shadow
  },
  radius: {
    md: '4px',             // --radius-md
  },
  controls: {
    sliderThumb: '#C9B298',                // = accent.gold
    sliderTrack: 'rgba(255,255,255,0.1)',  // slider track background
  },
};

const CATEGORY_COLORS = {
  agents: { color: THEME.agent.dev, shape: 'dot' },
  tasks: { color: THEME.status.info, shape: 'box' },
  templates: { color: THEME.status.warning, shape: 'diamond' },
  checklists: { color: THEME.agent.po, shape: 'triangle' },
  workflows: { color: THEME.agent.sm, shape: 'star' },
  'scripts/task': { color: THEME.status.success, shape: 'box' },
  'scripts/engine': { color: THEME.agent.devops, shape: 'box' },
  'scripts/infra': { color: THEME.agent.analyst, shape: 'box' },
  utils: { color: THEME.agent.analyst, shape: 'ellipse' },
  data: { color: THEME.agent.qa, shape: 'database' },
  tools: { color: THEME.agent.architect, shape: 'hexagon' },
};

const DEFAULT_COLOR = { color: THEME.text.tertiary, shape: 'box' };

const LIFECYCLE_STYLES = {
  production: { opacity: 1.0, borderDashes: false, colorOverride: null },
  experimental: { opacity: 0.8, borderDashes: [5, 5], colorOverride: null },
  deprecated: { opacity: 0.5, borderDashes: false, colorOverride: THEME.text.tertiary },
  orphan: { opacity: 0.3, borderDashes: [2, 4], colorOverride: THEME.text.muted },
};

/**
 * Sanitize a string for safe embedding inside HTML/JS.
 * Prevents XSS by escaping HTML entities and JS-breaking chars.
 * @param {string} str - Raw string
 * @returns {string} Sanitized string
 */
function _sanitize(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Build vis-network nodes array with category-based and lifecycle styling.
 * @param {Array} nodes - Raw graph nodes
 * @returns {Array} Styled nodes for vis-network
 */
function _buildVisNodes(nodes) {
  const seen = new Set();
  return (nodes || []).reduce((acc, node) => {
    if (seen.has(node.id)) return acc;
    seen.add(node.id);

    const category = (node.group || node.category || '').toLowerCase();
    const style = CATEGORY_COLORS[category]
      || (category === 'scripts' ? CATEGORY_COLORS['scripts/task'] : null)
      || DEFAULT_COLOR;
    const lifecycle = node.lifecycle || 'production';
    const lcStyle = LIFECYCLE_STYLES[lifecycle] || LIFECYCLE_STYLES.production;
    const nodeColor = lcStyle.colorOverride || style.color;

    acc.push({
      id: node.id,
      label: _sanitize(node.label || node.id),
      group: category,
      lifecycle: lifecycle,
      path: node.path || '',
      color: {
        background: nodeColor,
        border: THEME.border.subtle,
        highlight: { background: nodeColor, border: THEME.border.goldStrong },
        hover: { background: nodeColor, border: THEME.border.gold },
      },
      opacity: lcStyle.opacity,
      shapeProperties: { borderDashes: lcStyle.borderDashes },
      shape: style.shape,
    });
    return acc;
  }, []);
}

/**
 * Build vis-network edges array.
 * @param {Array} edges - Raw graph edges
 * @returns {Array} Edges for vis-network
 */
function _buildVisEdges(edges) {
  return (edges || []).map((edge) => ({
    from: edge.from,
    to: edge.to,
    arrows: 'to',
  }));
}

/**
 * Build the sidebar HTML for filters.
 * @returns {string} Sidebar HTML
 */
function _buildSidebar(nodes) {
  // Compute node counts per category
  const categoryCounts = {};
  (nodes || []).forEach((n) => {
    const cat = (n.group || n.category || '').toLowerCase();
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  const categoryItems = Object.entries(CATEGORY_COLORS).map(([name, style]) => {
    const count = categoryCounts[name] || 0;
    return `<label class="filter-item">
      <input type="checkbox" data-filter="category" value="${name}" checked>
      <span class="status-dot" style="color:${style.color}"></span>
      <span style="color:${THEME.text.secondary};font-size:11px">${name}</span>
      <span style="color:${THEME.text.tertiary};font-size:11px;margin-left:auto">${count}</span>
    </label>`;
  }).join('\n');

  const lifecycleItems = Object.entries(LIFECYCLE_STYLES).map(([name, style]) => {
    const opacity = style.opacity;
    return `<label class="filter-item">
      <input type="checkbox" data-filter="lifecycle" value="${name}" checked>
      <span style="opacity:${opacity}">&#9679;</span> ${name}
    </label>`;
  }).join('\n');

  return `<div id="sidebar">
    <div class="sidebar-header">
      <span class="sidebar-title">Filters</span>
      <button id="btn-toggle-sidebar" title="Toggle sidebar">&#9776;</button>
    </div>
    <div id="sidebar-content">
      <div class="filter-section">
        <input type="text" id="search-input" placeholder="Search entities..." autocomplete="off">
      </div>
      <div class="filter-section">
        <div class="section-title">ENTITY TYPES</div>
        <div class="gold-line"></div>
        ${categoryItems}
      </div>
      <div class="filter-section">
        <div class="section-title">Lifecycle</div>
        ${lifecycleItems}
        <label class="filter-item hide-orphans">
          <input type="checkbox" id="hide-orphans"> Hide Orphans
        </label>
      </div>
      <div class="filter-section physics-section">
        <div class="section-title physics-toggle" style="cursor:pointer">PHYSICS</div>
        <div class="gold-line"></div>
        <div class="physics-content" style="display:none">
          <div class="slider-row">
            <label class="slider-label">Center Force <span id="val-center" style="color:${THEME.text.tertiary}">0.3</span></label>
            <input type="range" id="slider-center" min="0" max="1" step="0.05" value="0.3" aria-label="Center Force">
          </div>
          <div class="slider-row">
            <label class="slider-label">Repel Force <span id="val-repel" style="color:${THEME.text.tertiary}">-2000</span></label>
            <input type="range" id="slider-repel" min="-30000" max="0" step="500" value="-2000" aria-label="Repel Force">
          </div>
          <div class="slider-row">
            <label class="slider-label">Link Force <span id="val-link" style="color:${THEME.text.tertiary}">0.04</span></label>
            <input type="range" id="slider-link" min="0" max="1" step="0.01" value="0.04" aria-label="Link Force">
          </div>
          <div class="slider-row">
            <label class="slider-label">Link Distance <span id="val-distance" style="color:${THEME.text.tertiary}">95</span></label>
            <input type="range" id="slider-distance" min="10" max="500" step="5" value="95" aria-label="Link Distance">
          </div>
          <div class="physics-buttons">
            <button id="btn-physics-reset" class="action-btn">Reset</button>
            <button id="btn-physics-pause" class="action-btn">Pause</button>
          </div>
        </div>
      </div>
      <div class="filter-section actions">
        <button id="btn-reset" class="action-btn">Reset / Show All</button>
        <button id="btn-exit-focus" class="action-btn" style="display:none">Exit Focus Mode</button>
      </div>
      <div id="metrics" class="filter-section metrics"></div>
    </div>
  </div>`;
}

/**
 * Build the legend HTML for the graph (kept for backward compat, now in sidebar).
 * @returns {string} Legend HTML (empty — legend is now part of sidebar)
 */
function _buildLegend() {
  return '';
}

/**
 * Format graph data as a self-contained HTML page with vis-network,
 * DataView filtering, lifecycle styling, focus mode, search, and metrics.
 * @param {Object} graphData - Normalized graph data { nodes, edges, source, isFallback }
 * @param {Object} [options] - Formatting options
 * @param {boolean} [options.autoRefresh] - Add meta-refresh for watch mode
 * @param {number} [options.refreshInterval] - Refresh interval in seconds (default: 5)
 * @returns {string} Complete HTML string
 */
function formatAsHtml(graphData, options = {}) {
  const visNodes = _buildVisNodes(graphData.nodes);
  const visEdges = _buildVisEdges(graphData.edges);
  const sidebar = _buildSidebar(graphData.nodes);

  const nodesJson = JSON.stringify(visNodes);
  const edgesJson = JSON.stringify(visEdges);

  const metaRefresh = options.autoRefresh
    ? `<meta http-equiv="refresh" content="${options.refreshInterval || 5}">`
    : '';

  const nodeCount = visNodes.length;
  const isLargeGraph = nodeCount > 200;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>AIOS Graph Dashboard</title>
  ${metaRefresh}
  <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: ${THEME.bg.base}; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace; }
    #graph { position: absolute; top: 0; left: 260px; right: 0; bottom: 0; }
    #status { position: fixed; top: 10px; left: 270px; color: ${THEME.accent.gold}; font-family: monospace; font-size: 13px; z-index: 100; background: ${THEME.bg.overlay}; padding: 6px 12px; border-radius: ${THEME.radius.md}; }
    #sidebar {
      position: fixed; top: 0; left: 0; width: 260px; height: 100vh;
      background: ${THEME.bg.surface}; border-right: 1px solid ${THEME.border.default};
      overflow-y: auto; z-index: 200; color: ${THEME.text.secondary}; font-size: 12px;
    }
    #sidebar.collapsed { width: 40px; }
    #sidebar.collapsed #sidebar-content { display: none; }
    #sidebar.collapsed .sidebar-title { display: none; }
    #sidebar.collapsed ~ #graph { left: 40px; }
    #sidebar.collapsed ~ #status { left: 50px; }
    .sidebar-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 12px; border-bottom: 1px solid ${THEME.border.default};
    }
    .sidebar-title { font-size: 14px; font-weight: 600; color: ${THEME.text.primary}; }
    #btn-toggle-sidebar {
      background: none; border: none; color: ${THEME.text.secondary}; font-size: 16px;
      cursor: pointer; padding: 2px 6px;
    }
    #btn-toggle-sidebar:hover { color: ${THEME.text.primary}; }
    .filter-section { padding: 8px 12px; border-bottom: 1px solid ${THEME.border.default}; }
    .section-title { font-size: 10px; text-transform: uppercase; color: ${THEME.accent.gold}; margin-bottom: 6px; letter-spacing: 0.2em; }
    .filter-item { display: flex; align-items: center; gap: 6px; padding: 2px 0; cursor: pointer; }
    .filter-item input[type="checkbox"] { margin: 0; cursor: pointer; }
    .filter-item.hide-orphans { margin-top: 6px; padding-top: 6px; border-top: 1px solid ${THEME.border.default}; }
    #search-input {
      width: 100%; padding: 6px 8px; background: ${THEME.bg.base}; border: 1px solid ${THEME.border.default};
      color: ${THEME.text.secondary}; border-radius: ${THEME.radius.md}; font-size: 12px; outline: none;
    }
    #search-input:focus { border-color: ${THEME.accent.gold}; }
    .action-btn {
      width: 100%; padding: 6px; margin-top: 4px; background: ${THEME.border.default}; border: none;
      color: ${THEME.text.secondary}; border-radius: ${THEME.radius.md}; cursor: pointer; font-size: 12px;
    }
    .action-btn:hover { background: ${THEME.accent.gold}; color: ${THEME.bg.base}; }
    .metrics { color: ${THEME.text.tertiary}; font-size: 11px; line-height: 1.6; }
    .metrics b { color: ${THEME.text.secondary}; }
    .status-dot {
      display: inline-block; width: 6px; height: 6px; border-radius: 50%;
      background: currentColor; box-shadow: 0 0 8px currentColor; flex-shrink: 0;
    }
    .gold-line {
      height: 1px; margin: 6px 0;
      background: linear-gradient(90deg, ${THEME.accent.gold}, transparent);
    }
    .slider-row { margin-bottom: 8px; }
    .slider-label { display: flex; justify-content: space-between; font-size: 11px; color: ${THEME.text.secondary}; margin-bottom: 2px; }
    .physics-buttons { display: flex; gap: 6px; margin-top: 6px; }
    .physics-buttons .action-btn { flex: 1; }
    input[type="range"] {
      -webkit-appearance: none; width: 100%; height: 4px; border-radius: 2px;
      background: ${THEME.controls.sliderTrack}; outline: none;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%;
      background: ${THEME.controls.sliderThumb}; cursor: pointer;
    }
    input[type="range"]::-moz-range-thumb {
      width: 12px; height: 12px; border-radius: 50%; border: none;
      background: ${THEME.controls.sliderThumb}; cursor: pointer;
    }
    input[type="range"]::-moz-range-track {
      height: 4px; border-radius: 2px; background: ${THEME.controls.sliderTrack};
    }
    #node-tooltip {
      display: none; position: fixed; z-index: 500;
      background: ${THEME.tooltip.bg}; border: 1px solid ${THEME.tooltip.border};
      border-radius: ${THEME.radius.md}; padding: 12px;
      box-shadow: ${THEME.tooltip.shadow}; max-width: 320px; pointer-events: auto;
    }
    #node-tooltip .tt-name { color: ${THEME.text.primary}; font-size: 13px; font-weight: 600; margin-bottom: 4px; }
    #node-tooltip .tt-type { display: flex; align-items: center; gap: 6px; color: ${THEME.text.secondary}; font-size: 11px; margin-bottom: 4px; }
    #node-tooltip .tt-path { color: ${THEME.text.tertiary}; font-size: 10px; font-family: monospace; margin-bottom: 4px; word-break: break-all; }
    #node-tooltip .tt-deps { color: ${THEME.text.secondary}; font-size: 11px; }
  </style>
</head>
<body>
  <div id="status">Loading vis-network...</div>
  ${sidebar}
  <div id="node-tooltip" role="tooltip"></div>
  <div id="graph"></div>
  <script>
    (function() {
      var statusEl = document.getElementById('status');
      if (typeof vis === 'undefined') {
        statusEl.textContent = 'ERROR: vis-network failed to load from CDN';
        statusEl.style.color = '${THEME.status.error}';
        return;
      }

      statusEl.textContent = 'Creating graph (${nodeCount} nodes)...';

      // --- Data Setup ---
      var allNodesData = ${nodesJson};
      var allEdgesData = ${edgesJson};
      var nodesDataset = new vis.DataSet(allNodesData);
      var edgesDataset = new vis.DataSet(allEdgesData);
      var totalEntities = allNodesData.length;

      // --- Filter State ---
      var activeCategories = new Set(${JSON.stringify(Object.keys(CATEGORY_COLORS))});
      var activeLifecycles = new Set(['production', 'experimental', 'deprecated', 'orphan']);
      var hideOrphans = false;
      var searchTerm = '';
      var focusNodeId = null;
      var focusNeighbors = null;

      // --- DataView Filtering ---
      var nodesView = new vis.DataView(nodesDataset, {
        filter: function(node) {
          if (focusNodeId) {
            return focusNeighbors && focusNeighbors.has(node.id);
          }
          if (!activeCategories.has(node.group)) return false;
          if (!activeLifecycles.has(node.lifecycle)) return false;
          if (hideOrphans && node.lifecycle === 'orphan') return false;
          if (searchTerm) {
            var term = searchTerm.toLowerCase();
            return node.label.toLowerCase().indexOf(term) !== -1 || node.id.toLowerCase().indexOf(term) !== -1;
          }
          return true;
        }
      });

      var visibleNodeIds = new Set(nodesView.getIds());
      var edgesView = new vis.DataView(edgesDataset, {
        filter: function(edge) {
          return visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to);
        }
      });

      function refreshFilters() {
        nodesView.refresh();
        visibleNodeIds = new Set(nodesView.getIds());
        edgesView.refresh();
        updateMetrics();
      }

      // --- Network ---
      var container = document.getElementById('graph');
      var network = new vis.Network(container, { nodes: nodesView, edges: edgesView }, {
        physics: {
          stabilization: { iterations: ${isLargeGraph ? 200 : 100}, updateInterval: 25 },
          barnesHut: {
            gravitationalConstant: ${isLargeGraph ? -2000 : -3000},
            springLength: ${isLargeGraph ? 200 : 150},
            springConstant: 0.01,
            damping: 0.3
          }
        },
        nodes: {
          font: { color: '${THEME.text.secondary}', size: ${isLargeGraph ? 10 : 12} },
          borderWidth: 2,
          scaling: { min: 5, max: 20 }
        },
        edges: {
          color: { color: '${THEME.border.default}', highlight: '${THEME.border.highlight}' },
          smooth: ${isLargeGraph ? 'false' : '{ type: "cubicBezier" }'}
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          hideEdgesOnDrag: true,
          hideEdgesOnZoom: ${isLargeGraph ? 'true' : 'false'}
        }
      });

      network.on('stabilizationProgress', function(params) {
        var pct = Math.round(params.iterations / params.total * 100);
        statusEl.textContent = 'Stabilizing... ' + pct + '%';
      });

      network.on('stabilizationIterationsDone', function() {
        statusEl.textContent = 'Graph ready — ${nodeCount} nodes';
        statusEl.style.color = '${THEME.status.success}';
        network.fit({ animation: { duration: 500 } });
        setTimeout(function() { statusEl.style.display = 'none'; }, 4000);
      });

      // --- Tooltip ---
      var tooltipEl = document.getElementById('node-tooltip');

      function showTooltip(nodeId, domPos) {
        var nodeData = nodesDataset.get(nodeId);
        if (!nodeData) return;

        // Compute dependency count from edges
        var depCount = 0;
        allEdgesData.forEach(function(e) {
          if (e.from === nodeId || e.to === nodeId) depCount++;
        });

        var catColor = nodeData.color && nodeData.color.background ? nodeData.color.background : '${THEME.text.tertiary}';

        tooltipEl.innerHTML =
          '<div class="tt-name">' + nodeData.label + '</div>' +
          '<div class="tt-type"><span class="status-dot" style="color:' + catColor + '"></span> ' + (nodeData.group || 'unknown') + '</div>' +
          (nodeData.path ? '<div class="tt-path">' + nodeData.path + '</div>' : '') +
          '<div class="tt-deps">' + depCount + ' dependenc' + (depCount === 1 ? 'y' : 'ies') + '</div>';

        // Position tooltip clamped to viewport
        var x = domPos.x + 15;
        var y = domPos.y + 15;
        tooltipEl.style.display = 'block';
        var rect = tooltipEl.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) x = domPos.x - rect.width - 15;
        if (y + rect.height > window.innerHeight) y = domPos.y - rect.height - 15;
        if (x < 0) x = 10;
        if (y < 0) y = 10;
        tooltipEl.style.left = x + 'px';
        tooltipEl.style.top = y + 'px';

        // Accessibility: link node to tooltip
        container.setAttribute('aria-describedby', 'node-tooltip');
      }

      function hideTooltip() {
        tooltipEl.style.display = 'none';
        container.removeAttribute('aria-describedby');
      }

      network.on('click', function(params) {
        if (params.nodes.length === 1) {
          var nodeId = params.nodes[0];
          var canvasPos = network.getPosition(nodeId);
          var domPos = network.canvasToDOM(canvasPos);
          showTooltip(nodeId, domPos);
        } else {
          hideTooltip();
        }
      });

      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') hideTooltip();
      });

      // --- Focus Mode ---
      network.on('doubleClick', function(params) {
        if (params.nodes.length === 1) {
          enterFocusMode(params.nodes[0]);
        }
      });

      function enterFocusMode(nodeId) {
        focusNodeId = nodeId;
        var neighbors = network.getConnectedNodes(nodeId);
        focusNeighbors = new Set([nodeId].concat(neighbors));
        refreshFilters();
        document.getElementById('btn-exit-focus').style.display = 'block';
        network.fit({ animation: { duration: 300 } });
      }

      function exitFocusMode() {
        focusNodeId = null;
        focusNeighbors = null;
        refreshFilters();
        document.getElementById('btn-exit-focus').style.display = 'none';
      }

      // --- Sidebar Events ---
      document.getElementById('btn-toggle-sidebar').addEventListener('click', function() {
        var sb = document.getElementById('sidebar');
        sb.classList.toggle('collapsed');
        var graphEl = document.getElementById('graph');
        graphEl.style.left = sb.classList.contains('collapsed') ? '40px' : '260px';
        statusEl.style.left = sb.classList.contains('collapsed') ? '50px' : '270px';
      });

      // Category checkboxes
      var catBoxes = document.querySelectorAll('input[data-filter="category"]');
      for (var i = 0; i < catBoxes.length; i++) {
        catBoxes[i].addEventListener('change', function() {
          if (this.checked) {
            activeCategories.add(this.value);
          } else {
            activeCategories.delete(this.value);
          }
          refreshFilters();
        });
      }

      // Lifecycle checkboxes
      var lcBoxes = document.querySelectorAll('input[data-filter="lifecycle"]');
      for (var i = 0; i < lcBoxes.length; i++) {
        lcBoxes[i].addEventListener('change', function() {
          if (this.checked) {
            activeLifecycles.add(this.value);
          } else {
            activeLifecycles.delete(this.value);
          }
          refreshFilters();
        });
      }

      // Hide orphans toggle
      document.getElementById('hide-orphans').addEventListener('change', function() {
        hideOrphans = this.checked;
        refreshFilters();
      });

      // Search input
      var searchTimer = null;
      document.getElementById('search-input').addEventListener('input', function() {
        var val = this.value;
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function() {
          searchTerm = val;
          refreshFilters();
        }, 200);
      });

      // Reset button
      document.getElementById('btn-reset').addEventListener('click', function() {
        searchTerm = '';
        focusNodeId = null;
        focusNeighbors = null;
        hideOrphans = false;
        activeCategories = new Set(${JSON.stringify(Object.keys(CATEGORY_COLORS))});
        activeLifecycles = new Set(['production', 'experimental', 'deprecated', 'orphan']);

        document.getElementById('search-input').value = '';
        document.getElementById('hide-orphans').checked = false;
        document.getElementById('btn-exit-focus').style.display = 'none';

        var allBoxes = document.querySelectorAll('#sidebar input[type="checkbox"][data-filter]');
        for (var i = 0; i < allBoxes.length; i++) { allBoxes[i].checked = true; }

        refreshFilters();
        network.fit({ animation: { duration: 300 } });
      });

      // Exit focus button
      document.getElementById('btn-exit-focus').addEventListener('click', exitFocusMode);

      // --- Physics Controls ---
      function _debounce(fn, ms) {
        var timer;
        return function() {
          var args = arguments;
          clearTimeout(timer);
          timer = setTimeout(function() { fn.apply(null, args); }, ms);
        };
      }

      var physicsDefaults = { center: 0.3, repel: -2000, link: 0.04, distance: 95 };
      var physicsPaused = false;

      var sliderCenter = document.getElementById('slider-center');
      var sliderRepel = document.getElementById('slider-repel');
      var sliderLink = document.getElementById('slider-link');
      var sliderDistance = document.getElementById('slider-distance');
      var valCenter = document.getElementById('val-center');
      var valRepel = document.getElementById('val-repel');
      var valLink = document.getElementById('val-link');
      var valDistance = document.getElementById('val-distance');

      function applyPhysics() {
        network.setOptions({
          physics: {
            barnesHut: {
              centralGravity: parseFloat(sliderCenter.value),
              gravitationalConstant: parseFloat(sliderRepel.value),
              springConstant: parseFloat(sliderLink.value),
              springLength: parseFloat(sliderDistance.value)
            }
          }
        });
      }

      var debouncedApply = _debounce(applyPhysics, 50);

      function setupSlider(slider, valEl) {
        slider.addEventListener('input', function() {
          valEl.textContent = this.value;
          debouncedApply();
        });
      }

      setupSlider(sliderCenter, valCenter);
      setupSlider(sliderRepel, valRepel);
      setupSlider(sliderLink, valLink);
      setupSlider(sliderDistance, valDistance);

      // Physics toggle (collapse/expand)
      var physicsToggle = document.querySelector('.physics-toggle');
      var physicsContent = document.querySelector('.physics-content');
      if (physicsToggle) {
        physicsToggle.addEventListener('click', function() {
          physicsContent.style.display = physicsContent.style.display === 'none' ? 'block' : 'none';
        });
      }

      // Reset physics
      document.getElementById('btn-physics-reset').addEventListener('click', function() {
        sliderCenter.value = physicsDefaults.center;
        sliderRepel.value = physicsDefaults.repel;
        sliderLink.value = physicsDefaults.link;
        sliderDistance.value = physicsDefaults.distance;
        valCenter.textContent = physicsDefaults.center;
        valRepel.textContent = physicsDefaults.repel;
        valLink.textContent = physicsDefaults.link;
        valDistance.textContent = physicsDefaults.distance;
        applyPhysics();
      });

      // Pause/Resume physics
      document.getElementById('btn-physics-pause').addEventListener('click', function() {
        physicsPaused = !physicsPaused;
        network.setOptions({ physics: { enabled: !physicsPaused } });
        this.textContent = physicsPaused ? 'Resume' : 'Pause';
        this.style.color = physicsPaused ? '${THEME.text.secondary}' : '';
      });

      // --- Metrics ---
      function updateMetrics() {
        var visible = nodesView.getIds().length;
        var visibleEdges = edgesView.getIds().length;
        var metricsEl = document.getElementById('metrics');
        metricsEl.innerHTML =
          '<b>Visible:</b> ' + visible + ' / ' + totalEntities + ' entities<br>' +
          '<b>Edges:</b> ' + visibleEdges + '<br>' +
          (focusNodeId ? '<b>Focus:</b> ' + focusNodeId + '<br>' : '');
      }

      updateMetrics();
    })();
  </script>
</body>
</html>`;
}

module.exports = {
  formatAsHtml,
  _sanitize,
  _buildVisNodes,
  _buildVisEdges,
  _buildLegend,
  _buildSidebar,
  THEME,
  CATEGORY_COLORS,
  DEFAULT_COLOR,
  LIFECYCLE_STYLES,
};
