import { OpenAIClient } from '../src/shared/infrastructure/ai/OpenAIClient.js';
import { ToolRegistry } from '../src/shared/infrastructure/ai/ToolRegistry.js';
import { toolDefinitions } from '../src/shared/infrastructure/ai/tools/index.js';
import { cases } from './cases.js';
const NOW = new Date('2026-10-16T09:00:00Z');
const REPEATS = Number(process.env.REPEATS ?? 3);
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const personas = {
  attendee:  { id: 'u1', tenantId: 't1', roles: ['attendee'],  timezone: 'Africa/Lagos' },
  organizer: { id: 'u2', tenantId: 't1', roles: ['organizer'], timezone: 'Africa/Lagos' },
};

const registry = new ToolRegistry({ featureFlags: { isEnabled: async () => true }, definitions: toolDefinitions });
const client = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY });
const pct = (n, d) => (d ? `${((100 * n) / d).toFixed(1)}%` : 'n/a');
const q = (arr, p) => [...arr].sort((a, b) => a - b)[Math.min(arr.length - 1, Math.floor(arr.length * p))];

const stats = {}; const latencies = []; let promptTok = 0, completionTok = 0; const failures = [];
const bump = (cat, k, ok) => { (stats[cat] ??= { n: 0, pass: 0, schema: [0, 0], args: [0, 0], fabricated: 0 }); stats[cat][k] += ok; };

for (const c of cases) {
  const user = personas[c.persona];
  const { openAITools } = await registry.toolsFor(user);
  for (let r = 0; r < REPEATS; r++) {
    const t0 = performance.now();
    const p = await client.propose({ message: c.message, tools: openAITools, context: { now: NOW, timezone: user.timezone } });
    latencies.push(performance.now() - t0);
    promptTok += p.usage?.prompt_tokens ?? 0; completionTok += p.usage?.completion_tokens ?? 0;

    const got = p.kind === 'tool' ? p.name : null;
    let ok = c.expect.tools.includes(got) && !(c.forbid ?? []).includes(got);
    const s = (stats[c.cat] ??= { n: 0, pass: 0, schema: [0, 0], args: [0, 0], fabricated: 0 });
    s.n++;
    if (p.kind === 'tool') {
      const schemaOk = registry.get(p.name).zodSchema.safeParse(p.args).success;
      s.schema[1]++; if (schemaOk) s.schema[0]++;
      if (c.expect.args) {
        const argsOk = Object.entries(c.expect.args).every(([k, v]) => p.args?.[k] === v);
        s.args[1]++; if (argsOk) s.args[0]++; ok &&= argsOk;
      }
      const fab = (JSON.stringify(p.args).match(UUID_RE) ?? []).filter(u => !c.message.includes(u)).length;
      s.fabricated += fab; ok &&= fab === 0;
    }
    if (ok) s.pass++; else failures.push({ case: c.id, run: r, got, args: p.args });
  }
}

console.table(Object.entries(stats).map(([cat, s]) => ({
  category: cat, runs: s.n, pass: pct(s.pass, s.n),
  'schema-valid': pct(...s.schema), 'args-correct': pct(...s.args), 'fabricated-ids': s.fabricated,
})));
console.log({ p50_ms: Math.round(q(latencies, 0.5)), p95_ms: Math.round(q(latencies, 0.95)),
  avg_prompt_tokens: Math.round(promptTok / latencies.length), avg_completion_tokens: Math.round(completionTok / latencies.length) });
console.log('FAILURES', JSON.stringify(failures, null, 2));
client.close();