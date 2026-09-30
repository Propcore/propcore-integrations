import type { SandboxedPlugin } from 'emdash/plugin';
import { runSync, SYNC_TASK } from './sync.js';

const plugin: SandboxedPlugin = {
  hooks: {
    cron: async (event, ctx) => {
      if (event.name === SYNC_TASK) await runSync(ctx);
    },
  },
  routes: {
    admin: { handler: async () => ({ blocks: [{ type: 'section', text: 'Propcore' }] }) },
  },
};

export default plugin;
