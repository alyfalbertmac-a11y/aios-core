'use strict';

const {
  formatAsHtml,
  _sanitize,
  _buildVisNodes,
  _buildVisEdges,
  _buildLegend,
  _buildSidebar,
  CATEGORY_COLORS,
  LIFECYCLE_STYLES,
} = require('../../.aios-core/core/graph-dashboard/formatters/html-formatter');

const MOCK_GRAPH_DATA = {
  nodes: [
    { id: 'dev', label: 'dev', group: 'agents', path: '.aios-core/agents/dev.md', lifecycle: 'production' },
    { id: 'task-a', label: 'task-a', group: 'tasks', path: '.aios-core/tasks/task-a.md', lifecycle: 'production' },
    { id: 'tmpl-story', label: 'story-tmpl', group: 'templates', path: '.aios-core/templates/story-tmpl.yaml', lifecycle: 'experimental' },
    { id: 'script-1', label: 'build.js', group: 'scripts', path: '.aios-core/scripts/build.js', lifecycle: 'orphan' },
  ],
  edges: [
    { from: 'dev', to: 'task-a' },
    { from: 'dev', to: 'tmpl-story' },
  ],
  source: 'code-intel',
  isFallback: false,
};

describe('html-formatter', () => {
  describe('formatAsHtml', () => {
    it('should return a complete HTML string with vis-network CDN', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('https://unpkg.com/vis-network/standalone/umd/vis-network.min.js');
      expect(html).toContain('</html>');
    });

    it('should embed JSON data for DataView filtering', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).toContain('vis.DataSet');
      expect(html).toContain('vis.DataView');
    });

    it('should include meta charset utf-8', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).toContain('<meta charset="utf-8">');
    });

    it('should use dark theme background', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).toContain('#1e1e1e');
    });

    it('should include physics stabilization config', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).toContain('stabilization');
      expect(html).toContain('iterations: 100');
    });

    it('should include sidebar with all 11 categories', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).toContain('id="sidebar"');
      const allCategories = [
        'agents', 'tasks', 'templates', 'checklists', 'workflows',
        'scripts/task', 'scripts/engine', 'scripts/infra',
        'utils', 'data', 'tools',
      ];
      for (const cat of allCategories) {
        expect(html).toContain(cat);
      }
    });

    it('should generate valid HTML for empty graph', () => {
      const html = formatAsHtml({ nodes: [], edges: [] });
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('vis.DataSet');
      expect(html).toContain('</html>');
    });

    it('should add meta-refresh when autoRefresh option is set', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA, { autoRefresh: true, refreshInterval: 5 });
      expect(html).toContain('<meta http-equiv="refresh" content="5">');
    });

    it('should NOT add meta-refresh by default', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).not.toContain('http-equiv="refresh"');
    });

    it('should default refreshInterval to 5 when autoRefresh is true', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA, { autoRefresh: true });
      expect(html).toContain('content="5"');
    });

    it('should include search input', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).toContain('id="search-input"');
    });

    it('should include reset button', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).toContain('id="btn-reset"');
      expect(html).toContain('Reset / Show All');
    });

    it('should include focus mode exit button', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).toContain('id="btn-exit-focus"');
    });

    it('should include metrics display', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).toContain('id="metrics"');
    });

    it('should include hideEdgesOnDrag for performance', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).toContain('hideEdgesOnDrag: true');
    });

    it('should include lifecycle filter checkboxes', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).toContain('data-filter="lifecycle"');
      expect(html).toContain('value="production"');
      expect(html).toContain('value="experimental"');
      expect(html).toContain('value="deprecated"');
      expect(html).toContain('value="orphan"');
    });

    it('should include hide orphans toggle', () => {
      const html = formatAsHtml(MOCK_GRAPH_DATA);
      expect(html).toContain('id="hide-orphans"');
      expect(html).toContain('Hide Orphans');
    });
  });

  describe('_sanitize', () => {
    it('should escape HTML special characters', () => {
      expect(_sanitize('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(_sanitize('a & b')).toBe('a &amp; b');
    });

    it('should escape single quotes', () => {
      expect(_sanitize("it's")).toBe('it&#x27;s');
    });

    it('should handle non-string input', () => {
      expect(_sanitize(123)).toBe('123');
      expect(_sanitize(null)).toBe('null');
    });
  });

  describe('_buildVisNodes', () => {
    it('should apply correct colors per category', () => {
      const nodes = _buildVisNodes(MOCK_GRAPH_DATA.nodes);

      const agentNode = nodes.find((n) => n.id === 'dev');
      expect(agentNode.color.background).toBe(CATEGORY_COLORS.agents.color);
      expect(agentNode.shape).toBe(CATEGORY_COLORS.agents.shape);

      const taskNode = nodes.find((n) => n.id === 'task-a');
      expect(taskNode.color.background).toBe(CATEGORY_COLORS.tasks.color);

      const tmplNode = nodes.find((n) => n.id === 'tmpl-story');
      expect(tmplNode.color.background).toBe(CATEGORY_COLORS.templates.color);
      expect(tmplNode.shape).toBe(CATEGORY_COLORS.templates.shape);

      const scriptNode = nodes.find((n) => n.id === 'script-1');
      expect(scriptNode.color.background).toBe(LIFECYCLE_STYLES.orphan.colorOverride);
    });

    it('should include tooltip with category, lifecycle, and path', () => {
      const nodes = _buildVisNodes(MOCK_GRAPH_DATA.nodes);
      const devNode = nodes.find((n) => n.id === 'dev');
      expect(devNode.title).toContain('Category: agents');
      expect(devNode.title).toContain('Lifecycle: production');
      expect(devNode.title).toContain('Path: .aios-core/agents/dev.md');
    });

    it('should use default color for unknown category', () => {
      const nodes = _buildVisNodes([{ id: 'x', label: 'x', group: 'unknown' }]);
      expect(nodes[0].color.background).toBe('#b0bec5');
    });

    it('should handle null/undefined nodes', () => {
      expect(_buildVisNodes(null)).toEqual([]);
      expect(_buildVisNodes(undefined)).toEqual([]);
    });

    it('should include group and lifecycle properties on nodes', () => {
      const nodes = _buildVisNodes(MOCK_GRAPH_DATA.nodes);
      const devNode = nodes.find((n) => n.id === 'dev');
      expect(devNode.group).toBe('agents');
      expect(devNode.lifecycle).toBe('production');
    });

    it('should default lifecycle to production when missing', () => {
      const nodes = _buildVisNodes([{ id: 'x', label: 'x', group: 'tasks' }]);
      expect(nodes[0].lifecycle).toBe('production');
    });

    it('should apply lifecycle visual styles', () => {
      const nodes = _buildVisNodes(MOCK_GRAPH_DATA.nodes);

      const productionNode = nodes.find((n) => n.id === 'dev');
      expect(productionNode.opacity).toBe(1.0);

      const experimentalNode = nodes.find((n) => n.id === 'tmpl-story');
      expect(experimentalNode.opacity).toBe(0.8);

      const orphanNode = nodes.find((n) => n.id === 'script-1');
      expect(orphanNode.opacity).toBe(0.3);
      expect(orphanNode.color.background).toBe('#ccc');
    });

    it('should apply deprecated lifecycle styling', () => {
      const nodes = _buildVisNodes([{
        id: 'old', label: 'old', group: 'tasks', lifecycle: 'deprecated',
      }]);
      expect(nodes[0].opacity).toBe(0.5);
      expect(nodes[0].color.background).toBe('#999');
    });

    it('should set borderDashes for experimental lifecycle', () => {
      const nodes = _buildVisNodes([{
        id: 'exp', label: 'exp', group: 'tasks', lifecycle: 'experimental',
      }]);
      expect(nodes[0].shapeProperties.borderDashes).toEqual([5, 5]);
    });

    it('should set borderDashes for orphan lifecycle', () => {
      const nodes = _buildVisNodes([{
        id: 'orph', label: 'orph', group: 'tasks', lifecycle: 'orphan',
      }]);
      expect(nodes[0].shapeProperties.borderDashes).toEqual([2, 4]);
    });

    it('should deduplicate nodes by id', () => {
      const nodes = _buildVisNodes([
        { id: 'dup', label: 'dup', group: 'tasks' },
        { id: 'dup', label: 'dup-2', group: 'agents' },
      ]);
      expect(nodes).toHaveLength(1);
    });
  });

  describe('_buildVisNodes - all 11 categories', () => {
    it('should apply correct styles for all 11 categories', () => {
      const allCatNodes = [
        { id: 'a1', label: 'a1', group: 'agents' },
        { id: 't1', label: 't1', group: 'tasks' },
        { id: 'tp1', label: 'tp1', group: 'templates' },
        { id: 'cl1', label: 'cl1', group: 'checklists' },
        { id: 'wf1', label: 'wf1', group: 'workflows' },
        { id: 'st1', label: 'st1', group: 'scripts/task' },
        { id: 'se1', label: 'se1', group: 'scripts/engine' },
        { id: 'si1', label: 'si1', group: 'scripts/infra' },
        { id: 'u1', label: 'u1', group: 'utils' },
        { id: 'd1', label: 'd1', group: 'data' },
        { id: 'to1', label: 'to1', group: 'tools' },
      ];
      const nodes = _buildVisNodes(allCatNodes);
      expect(nodes).toHaveLength(11);

      for (const node of nodes) {
        const cat = allCatNodes.find((n) => n.id === node.id).group;
        const expected = CATEGORY_COLORS[cat];
        expect(node.color.background).toBe(expected.color);
        expect(node.shape).toBe(expected.shape);
      }
    });

    it('should map legacy "scripts" group to scripts/task fallback', () => {
      const nodes = _buildVisNodes([{ id: 's', label: 's', group: 'scripts' }]);
      expect(nodes[0].color.background).toBe(CATEGORY_COLORS['scripts/task'].color);
      expect(nodes[0].shape).toBe(CATEGORY_COLORS['scripts/task'].shape);
    });
  });

  describe('_buildVisEdges', () => {
    it('should map edges with arrows', () => {
      const edges = _buildVisEdges(MOCK_GRAPH_DATA.edges);
      expect(edges).toHaveLength(2);
      expect(edges[0]).toEqual({ from: 'dev', to: 'task-a', arrows: 'to' });
    });

    it('should handle null/undefined edges', () => {
      expect(_buildVisEdges(null)).toEqual([]);
      expect(_buildVisEdges(undefined)).toEqual([]);
    });
  });

  describe('_buildLegend (backward compat)', () => {
    it('should return empty string (legend is now in sidebar)', () => {
      const legend = _buildLegend();
      expect(legend).toBe('');
    });
  });

  describe('_buildSidebar', () => {
    it('should contain all 11 category names', () => {
      const sidebar = _buildSidebar();
      const allCategories = [
        'agents', 'tasks', 'templates', 'checklists', 'workflows',
        'scripts/task', 'scripts/engine', 'scripts/infra',
        'utils', 'data', 'tools',
      ];
      for (const cat of allCategories) {
        expect(sidebar).toContain(cat);
      }
    });

    it('should contain all category colors', () => {
      const sidebar = _buildSidebar();
      for (const [, style] of Object.entries(CATEGORY_COLORS)) {
        expect(sidebar).toContain(style.color);
      }
    });

    it('should contain shape icons', () => {
      const sidebar = _buildSidebar();
      expect(sidebar).toContain('&#9679;');
      expect(sidebar).toContain('&#9632;');
      expect(sidebar).toContain('&#9670;');
      expect(sidebar).toContain('&#9650;');
      expect(sidebar).toContain('&#9733;');
    });

    it('should contain lifecycle filter checkboxes', () => {
      const sidebar = _buildSidebar();
      expect(sidebar).toContain('data-filter="lifecycle"');
      expect(sidebar).toContain('production');
      expect(sidebar).toContain('experimental');
      expect(sidebar).toContain('deprecated');
      expect(sidebar).toContain('orphan');
    });

    it('should contain search input', () => {
      const sidebar = _buildSidebar();
      expect(sidebar).toContain('id="search-input"');
    });

    it('should contain hide orphans toggle', () => {
      const sidebar = _buildSidebar();
      expect(sidebar).toContain('id="hide-orphans"');
    });

    it('should contain reset button', () => {
      const sidebar = _buildSidebar();
      expect(sidebar).toContain('id="btn-reset"');
    });

    it('should contain exit focus button', () => {
      const sidebar = _buildSidebar();
      expect(sidebar).toContain('id="btn-exit-focus"');
    });
  });

  describe('LIFECYCLE_STYLES', () => {
    it('should define all 4 lifecycle states', () => {
      expect(LIFECYCLE_STYLES.production).toBeDefined();
      expect(LIFECYCLE_STYLES.experimental).toBeDefined();
      expect(LIFECYCLE_STYLES.deprecated).toBeDefined();
      expect(LIFECYCLE_STYLES.orphan).toBeDefined();
    });

    it('should have correct opacity values', () => {
      expect(LIFECYCLE_STYLES.production.opacity).toBe(1.0);
      expect(LIFECYCLE_STYLES.experimental.opacity).toBe(0.8);
      expect(LIFECYCLE_STYLES.deprecated.opacity).toBe(0.5);
      expect(LIFECYCLE_STYLES.orphan.opacity).toBe(0.3);
    });

    it('should have correct color overrides', () => {
      expect(LIFECYCLE_STYLES.production.colorOverride).toBeNull();
      expect(LIFECYCLE_STYLES.experimental.colorOverride).toBeNull();
      expect(LIFECYCLE_STYLES.deprecated.colorOverride).toBe('#999');
      expect(LIFECYCLE_STYLES.orphan.colorOverride).toBe('#ccc');
    });

    it('should have correct borderDashes', () => {
      expect(LIFECYCLE_STYLES.production.borderDashes).toBe(false);
      expect(LIFECYCLE_STYLES.experimental.borderDashes).toEqual([5, 5]);
      expect(LIFECYCLE_STYLES.deprecated.borderDashes).toBe(false);
      expect(LIFECYCLE_STYLES.orphan.borderDashes).toEqual([2, 4]);
    });
  });

  describe('CLI integration (FORMAT_MAP)', () => {
    it('should have html in FORMAT_MAP', () => {
      const { FORMAT_MAP } = require('../../.aios-core/core/graph-dashboard/cli');
      expect(FORMAT_MAP.html).toBe(formatAsHtml);
    });

    it('should have html in VALID_FORMATS', () => {
      const { VALID_FORMATS } = require('../../.aios-core/core/graph-dashboard/cli');
      expect(VALID_FORMATS).toContain('html');
    });

    it('should have html in WATCH_FORMAT_MAP', () => {
      const { WATCH_FORMAT_MAP } = require('../../.aios-core/core/graph-dashboard/cli');
      expect(WATCH_FORMAT_MAP.html).toBeDefined();
      expect(WATCH_FORMAT_MAP.html.filename).toBe('graph.html');
    });

    it('should parse --format=html correctly', () => {
      const { parseArgs } = require('../../.aios-core/core/graph-dashboard/cli');
      const args = parseArgs(['--deps', '--format=html']);
      expect(args.format).toBe('html');
      expect(args.command).toBe('--deps');
    });

    it('should parse --format html correctly', () => {
      const { parseArgs } = require('../../.aios-core/core/graph-dashboard/cli');
      const args = parseArgs(['--deps', '--format', 'html']);
      expect(args.format).toBe('html');
    });
  });

  describe('XSS prevention', () => {
    it('should sanitize node labels with script tags', () => {
      const maliciousData = {
        nodes: [{ id: 'xss', label: '<img src=x onerror=alert(1)>', group: 'tasks' }],
        edges: [],
      };
      const html = formatAsHtml(maliciousData);
      expect(html).not.toContain('<img src=x');
      expect(html).toContain('&lt;img src=x');
    });

    it('should sanitize node labels with embedded quotes', () => {
      const maliciousData = {
        nodes: [{ id: 'q', label: '"); alert("xss', group: 'tasks' }],
        edges: [],
      };
      const html = formatAsHtml(maliciousData);
      expect(html).not.toContain('"); alert("xss');
    });
  });
});
