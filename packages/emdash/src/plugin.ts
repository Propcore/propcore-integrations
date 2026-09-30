import type { SandboxedPlugin } from 'emdash/plugin';

const plugin: SandboxedPlugin = {
  hooks: {},
  routes: {
    admin: { handler: async () => ({ blocks: [{ type: 'section', text: 'Propcore' }] }) },
  },
};

export default plugin;
