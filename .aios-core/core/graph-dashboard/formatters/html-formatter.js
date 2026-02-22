'use strict';

const CATEGORY_COLORS = {
  agents: { color: '#66bb6a', shape: 'dot' },
  tasks: { color: '#4fc3f7', shape: 'box' },
  templates: { color: '#ffd54f', shape: 'diamond' },
  checklists: { color: '#E69F00', shape: 'triangle' },
  workflows: { color: '#CC79A7', shape: 'star' },
  'scripts/task': { color: '#009E73', shape: 'box' },
  'scripts/engine': { color: '#D55E00', shape: 'box' },
  'scripts/infra': { color: '#90a4ae', shape: 'box' },
  utils: { color: '#56B4E9', shape: 'ellipse' },
  data: { color: '#F0E442', shape: 'database' },
  tools: { color: '#b39ddb', shape: 'hexagon' },
};

const DEFAULT_COLOR = { color: '#b0bec5', shape: 'box' };

const LIFECYCLE_STYLES = {
  production: { opacity: 1.0, borderDashes: false, colorOverride: null },
  experimental: { opacity: 0.8, borderDashes: [5, 5], colorOverride: null },
  deprecated: { opacity: 0.5, borderDashes: false, colorOverride: '#999' },
  orphan: { opacity: 0.3, borderDashes: [2, 4], colorOverride: '#ccc' },
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
      color: {
        background: nodeColor,
        border: nodeColor,
        highlight: { background: nodeColor, border: '#fff' },
      },
      opacity: lcStyle.opacity,
      shapeProperties: { borderDashes: lcStyle.borderDashes },
      shape: style.shape,
      title: [
        `<b>${_sanitize(node.label || node.id)}</b>`,
        `Category: ${_sanitize(category || 'unknown')}`,
        `Lifecycle: ${_sanitize(lifecycle)}`,
        node.path ? `Path: ${_sanitize(node.path)}` : null,
      ].filter(Boolean).join('<br>'),
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
function _buildSidebar() {
  const SHAPE_ICONS = {
    dot: '&#9679;',
    box: '&#9632;',
    diamond: '&#9670;',
    triangle: '&#9650;',
    star: '&#9733;',
    ellipse: '&#11044;',
    database: '&#9707;',
    hexagon: '&#11042;',
  };

  const categoryItems = Object.entries(CATEGORY_COLORS).map(([name, style]) => {
    const icon = SHAPE_ICONS[style.shape] || '&#9632;';
    return `<label class="filter-item">
      <input type="checkbox" data-filter="category" value="${name}" checked>
      <span style="color:${style.color}">${icon}</span> ${name}
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
        <div class="section-title">Categories</div>
        ${categoryItems}
      </div>
      <div class="filter-section">
        <div class="section-title">Lifecycle</div>
        ${lifecycleItems}
        <label class="filter-item hide-orphans">
          <input type="checkbox" id="hide-orphans"> Hide Orphans
        </label>
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
  const sidebar = _buildSidebar();

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
    body { margin: 0; background: #1e1e1e; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace; }
    #graph { position: absolute; top: 0; left: 260px; right: 0; bottom: 0; }
    #status { position: fixed; top: 10px; left: 270px; color: #4fc3f7; font-family: monospace; font-size: 13px; z-index: 100; background: rgba(30,30,30,0.9); padding: 6px 12px; border-radius: 4px; }
    #sidebar {
      position: fixed; top: 0; left: 0; width: 260px; height: 100vh;
      background: #252526; border-right: 1px solid #3c3c3c;
      overflow-y: auto; z-index: 200; color: #ccc; font-size: 12px;
    }
    #sidebar.collapsed { width: 40px; }
    #sidebar.collapsed #sidebar-content { display: none; }
    #sidebar.collapsed .sidebar-title { display: none; }
    #sidebar.collapsed ~ #graph { left: 40px; }
    #sidebar.collapsed ~ #status { left: 50px; }
    .sidebar-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 12px; border-bottom: 1px solid #3c3c3c;
    }
    .sidebar-title { font-size: 14px; font-weight: 600; color: #e0e0e0; }
    #btn-toggle-sidebar {
      background: none; border: none; color: #ccc; font-size: 16px;
      cursor: pointer; padding: 2px 6px;
    }
    #btn-toggle-sidebar:hover { color: #fff; }
    .filter-section { padding: 8px 12px; border-bottom: 1px solid #3c3c3c; }
    .section-title { font-size: 11px; text-transform: uppercase; color: #888; margin-bottom: 6px; letter-spacing: 0.5px; }
    .filter-item { display: flex; align-items: center; gap: 6px; padding: 2px 0; cursor: pointer; }
    .filter-item input[type="checkbox"] { margin: 0; cursor: pointer; }
    .filter-item.hide-orphans { margin-top: 6px; padding-top: 6px; border-top: 1px solid #3c3c3c; }
    #search-input {
      width: 100%; padding: 6px 8px; background: #1e1e1e; border: 1px solid #3c3c3c;
      color: #ccc; border-radius: 4px; font-size: 12px; outline: none;
    }
    #search-input:focus { border-color: #4fc3f7; }
    .action-btn {
      width: 100%; padding: 6px; margin-top: 4px; background: #3c3c3c; border: none;
      color: #ccc; border-radius: 4px; cursor: pointer; font-size: 12px;
    }
    .action-btn:hover { background: #4fc3f7; color: #1e1e1e; }
    .metrics { color: #888; font-size: 11px; line-height: 1.6; }
    .metrics b { color: #ccc; }
  </style>
</head>
<body>
  <div id="status">Loading vis-network...</div>
  ${sidebar}
  <div id="graph"></div>
  <script>
    (function() {
      var statusEl = document.getElementById('status');
      if (typeof vis === 'undefined') {
        statusEl.textContent = 'ERROR: vis-network failed to load from CDN';
        statusEl.style.color = '#f44336';
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
          font: { color: '#ccc', size: ${isLargeGraph ? 10 : 12} },
          borderWidth: 2,
          scaling: { min: 5, max: 20 }
        },
        edges: {
          color: { color: '#555', highlight: '#aaa' },
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
        statusEl.style.color = '#66bb6a';
        network.fit({ animation: { duration: 500 } });
        setTimeout(function() { statusEl.style.display = 'none'; }, 4000);
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
  CATEGORY_COLORS,
  DEFAULT_COLOR,
  LIFECYCLE_STYLES,
};
