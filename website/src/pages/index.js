import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

const features = [
  {
    title: 'Vendor-neutral',
    description:
      'One format that works across Claude Code, Copilot, Cursor, and any harness that adopts the spec. Switch tools without losing your setup.',
  },
  {
    title: 'Complete operational context',
    description:
      'Plugins, MCP servers, environment requirements, behavioral instructions, and permissions — all in one validated YAML file.',
  },
  {
    title: 'Designed for sharing',
    description:
      'Commit a harness.yaml to your dotfiles. Share it with a teammate. Publish it to the registry. Your full AI setup travels with you.',
  },
];

const layers = [
  {
    name: 'Schema',
    status: 'v1 — current',
    current: true,
    description: 'The harness.yaml format, JSON Schema validation, security model, and plugin manifest.',
    to: '/docs/intro',
  },
  {
    name: 'Exchange',
    status: 'v2 — planned',
    current: false,
    description: 'Harness-to-harness sharing: publish, fetch, and compose harnesses across tools and teams.',
    to: '/docs/extensions/roadmap',
  },
  {
    name: 'Registry',
    status: 'v2/v3 — planned',
    current: false,
    description: 'Hosted discovery at harnessprotocol.ai: search, publish, version resolution, and integrity verification.',
    to: '/docs/extensions/roadmap',
  },
];

function Hero() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className="hero">
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className="hero-schema">
          <code>$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json</code>
        </div>
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="button button--primary button--lg" to="/docs/intro">
            Read the Spec
          </Link>
          <Link className="button button--outline button--lg" href="https://harnessprotocol.ai/schema/v1/harness.schema.json">
            JSON Schema ↗
          </Link>
          <Link className="button button--outline button--lg" href="https://github.com/harnessprotocol/harness-protocol">
            GitHub ↗
          </Link>
        </div>
      </div>
    </header>
  );
}

function Features() {
  return (
    <section className="container">
      <div className="features">
        {features.map((f, idx) => (
          <div key={idx} className="feature">
            <h3>{f.title}</h3>
            <p>{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function MinimalExample() {
  return (
    <section className="container" style={{ paddingBottom: '2rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '0.25rem' }}>What a harness looks like</h2>
      <p style={{ textAlign: 'center', opacity: 0.7, marginBottom: '1.5rem' }}>
        A <code>harness.yaml</code> is a validated YAML file that captures your full AI setup.
      </p>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <pre style={{
          background: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-color-emphasis-200)',
          borderRadius: 10,
          padding: '1.5rem',
          fontSize: '0.88rem',
          lineHeight: 1.6,
          overflowX: 'auto',
        }}>
{`$schema: https://harnessprotocol.ai/schema/v1/harness.schema.json
version: "1"

metadata:
  name: data-engineer
  description: SQL, dbt, and data pipeline workflows.

plugins:
  - name: data-lineage
    source: harnessprotocol/harness-kit

mcp-servers:
  postgres:
    transport: stdio
    command: uvx
    args: [mcp-server-postgres, \${DB_CONNECTION_STRING}]

env:
  - name: DB_CONNECTION_STRING
    description: PostgreSQL connection string.
    required: true
    sensitive: true

instructions:
  operational: |
    Prefer set-based SQL over row-by-row loops.
    Check the dbt DAG before modifying shared models.
  import-mode: merge`}
        </pre>
      </div>
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        <Link to="/docs/examples/data-engineer">See more examples →</Link>
      </p>
    </section>
  );
}

function Layers() {
  return (
    <section className="container" style={{ paddingBottom: '3rem' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '0.25rem' }}>Protocol layers</h2>
      <p style={{ textAlign: 'center', opacity: 0.7, marginBottom: '1.5rem' }}>
        Layers are intentionally decoupled — implement Schema today without waiting for Exchange or Registry.
      </p>
      <div className="layers">
        {layers.map((l) => (
          <Link key={l.name} to={l.to} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="layer">
              <span className={`layer-status ${l.current ? 'layer-status--current' : 'layer-status--planned'}`}>
                {l.status}
              </span>
              <h3>{l.name}</h3>
              <p>{l.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Hero />
      <main>
        <Features />
        <MinimalExample />
        <Layers />
      </main>
    </Layout>
  );
}
