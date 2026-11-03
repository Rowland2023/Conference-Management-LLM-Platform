
import { ToolRegistry } from '../src/shared/infrastructure/ai/ToolRegistry.js';
import { toolDefinitions } from '../src/shared/infrastructure/ai/tools/index.js';
import { cases } from './cases.js';

const personas = {
  attendee: {
    id: 'u1',
    tenantId: 't1',
    roles: ['attendee'],
    timezone: 'Africa/Lagos',
  },
  organizer: {
    id: 'u2',
    tenantId: 't1',
    roles: ['organizer'],
    timezone: 'Africa/Lagos',
  },
};

const registry = new ToolRegistry({
  featureFlags: { isEnabled: async () => true },
  definitions: toolDefinitions,
});

let errors = 0;

for (const c of cases) {
  const user = personas[c.persona];

  if (!user) {
    console.error(`[FAIL] ${c.id}: unknown persona "${c.persona}"`);
    errors++;
    continue;
  }

  const { openAITools } = await registry.toolsFor(user);
  const available = new Set(
    openAITools.map(tool => tool.function.name),
  );

  for (const name of c.expect.tools) {
  // null means the expected result is plain text, not a tool call.
  if (name === null) continue;

  if (!available.has(name)) {
    console.error(
      `[FAIL] ${c.id}: expected tool "${name}" is unavailable to ${c.persona}`,
    );
    errors++;
  }
}

  for (const name of c.forbid ?? []) {
    if (!available.has(name)) {
      console.warn(
        `[WARN] ${c.id}: forbidden tool "${name}" is not exposed to ${c.persona}`,
      );
    }
  }
}

console.log({
  mode: 'OFFLINE_PREFLIGHT',
  cases: cases.length,
  errors,
});

if (errors > 0) process.exitCode = 1;
