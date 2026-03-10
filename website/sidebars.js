/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Protocol',
      collapsed: false,
      items: [
        'protocol/overview',
        'protocol/profile-schema',
        'protocol/plugins',
        'protocol/mcp-servers',
        'protocol/instructions',
        'protocol/environment',
        'protocol/fragments',
        'protocol/inheritance',
        'protocol/plugin-manifest',
      ],
    },
    {
      type: 'category',
      label: 'Security',
      items: [
        'security/threat-model',
        'security/trust-boundaries',
        'security/integrity',
        'security/secrets',
        'security/instruction-injection',
        'security/permissions',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      items: [
        'examples/minimal',
        'examples/data-engineer',
      ],
    },
    {
      type: 'category',
      label: 'Extensions',
      items: [
        'extensions/roadmap',
      ],
    },
  ],
};

module.exports = sidebars;
