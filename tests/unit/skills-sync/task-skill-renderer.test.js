'use strict';

const {
  getTaskSkillId,
  getAgentSourceFilename,
  sanitizeDescription,
  buildTaskSkillContent,
} = require('../../../.aios-core/infrastructure/scripts/skills-sync/renderers/task-skill');

describe('task-skill renderer', () => {
  it('builds agent-scoped task skill ids', () => {
    expect(getTaskSkillId('build-resume', 'dev')).toBe('aios-dev-build-resume');
    expect(getTaskSkillId('aios-task-build-resume', 'aios-dev')).toBe('aios-dev-build-resume');
  });

  it('resolves owner agent source filename', () => {
    expect(getAgentSourceFilename('dev')).toBe('dev.md');
    expect(getAgentSourceFilename('master')).toBe('aios-master.md');
  });

  it('sanitizes markdown-heavy summary text', () => {
    const cleaned = sanitizeDescription('> **Command:** `*build-resume {story-id}`');
    expect(cleaned).toBe('> Command: *build-resume {story-id}'.replace(/^>\s*/, ''));
  });

  it('renders clean frontmatter with task metadata', () => {
    const content = buildTaskSkillContent({
      id: 'build-resume',
      filename: 'build-resume.md',
      title: 'Task: Build Resume',
      summary: '> **Command:** `*build-resume {story-id}`',
      command: '*build-resume {story-id}',
      agent: 'dev',
      elicit: false,
    });

    expect(content).toContain('name: aios-dev-build-resume');
    expect(content).toContain('description: "Command: *build-resume {story-id}"');
    expect(content).toContain('owner: "dev"');
    expect(content).toContain('source: ".aios-core/development/tasks/build-resume.md"');
    expect(content).toContain('command: "*build-resume {story-id}"');
    expect(content).toContain('## Agent Context');
    expect(content).toContain('.aios-core/development/agents/dev.md');
    expect(content).toContain('## Canonical Command');
  });
});
