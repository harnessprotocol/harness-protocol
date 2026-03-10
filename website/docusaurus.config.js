// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Harness Protocol',
  tagline: 'An open specification for portable AI coding harnesses.',
  favicon: 'img/favicon.svg',

  url: 'https://harnessprotocol.ai',
  baseUrl: '/',

  organizationName: 'harnessprotocol',
  projectName: 'harness-protocol',

  onBrokenLinks: 'throw',

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        hashed: true,
        indexBlog: false,
      }),
    ],
  ],

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/harnessprotocol/harness-protocol/tree/main/website/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/harnessprotocol/harness-protocol/tree/main/website/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Harness Protocol',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docs',
            position: 'left',
            label: 'Spec',
          },
          {
            href: 'https://harnessprotocol.ai/schema/v1/harness.schema.json',
            label: 'Schema',
            position: 'left',
          },
          {
            href: 'https://github.com/harnessprotocol/harness-protocol',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Spec',
            items: [
              { label: 'Overview', to: '/docs/intro' },
              { label: 'Profile Schema', to: '/docs/protocol/profile-schema' },
              { label: 'Security', to: '/docs/security/threat-model' },
            ],
          },
          {
            title: 'Schema',
            items: [
              {
                label: 'harness.schema.json',
                href: 'https://harnessprotocol.ai/schema/v1/harness.schema.json',
              },
              {
                label: 'plugin.schema.json',
                href: 'https://harnessprotocol.ai/schema/v1/plugin.schema.json',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/harnessprotocol/harness-protocol',
              },
              {
                label: 'harness-kit',
                href: 'https://harnesskit.ai',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Harness Protocol contributors. Apache 2.0 License.`,
      },
      prism: {
        theme: require('prism-react-renderer').themes.github,
        darkTheme: require('prism-react-renderer').themes.dracula,
        additionalLanguages: ['bash', 'json', 'yaml'],
      },
    }),
};

module.exports = config;
