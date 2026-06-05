export interface HarnessDocument {
  '$schema'?: string;
  version: string;
  kind?: 'profile' | 'fragment';
  metadata?: Metadata;
  plugins?: Plugin[];
  skills?: Skill[];
  'mcp-servers'?: Record<string, McpServerStdio | McpServerRemote>;
  env?: EnvEntry[];
  instructions?: Instructions;
  permissions?: Permissions;
  policy?: Policy;
  extends?: ExtendsEntry[];
}

export interface Metadata {
  name: string;
  description: string;
  author?: { name: string; url?: string };
  version?: string;
  license?: string;
  tags?: string[];
}

export interface Plugin {
  name: string;
  source: string;
  version?: string;
  description?: string;
  config?: Record<string, unknown>;
  integrity?: { sha256: string };
}

export interface Skill {
  name: string;
  source: string;
  version?: string;
  description?: string;
  enabled?: boolean;
  loading?: 'eager' | 'deferred';
  integrity?: { sha256: string };
}

export interface McpServerStdio {
  transport: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
  source?: string;
  version?: string;
  integrity?: { sha256: string };
}

export interface McpServerRemote {
  transport: 'streamable-http' | 'http' | 'sse' | 'ws';
  url: string;
  headers?: Record<string, string>;
  source?: string;
  version?: string;
}

export interface Policy {
  'mcp-servers'?: { 'allowed-sources'?: string[]; 'denied-sources'?: string[] };
  plugins?: { 'allowed-sources'?: string[]; 'denied-sources'?: string[]; 'allowed-marketplaces'?: string[] };
  skills?: { 'allowed-sources'?: string[]; 'denied-sources'?: string[] };
  permissions?: {
    tools?: { allow?: string[]; deny?: string[] };
    network?: { 'allowed-hosts'?: string[] };
  };
  'require-integrity'?: boolean;
}

export interface EnvEntry {
  name: string;
  description: string;
  required?: boolean;
  sensitive?: boolean;
  when?: string;
  default?: string;
}

export interface Instructions {
  operational?: string | null;
  behavioral?: string | null;
  identity?: string | null;
  'import-mode'?: 'merge' | 'replace' | 'skip';
}

export interface Permissions {
  tools?: {
    allow?: string[];
    deny?: string[];
    ask?: string[];
  };
  paths?: {
    writable?: string[];
    readonly?: string[];
  };
  network?: {
    'allowed-hosts'?: string[];
  };
}

export interface ExtendsEntry {
  source: string;
  version?: string;
}

export interface PluginManifest {
  name: string;
  description: string;
  version: string;
  author?: { name: string; url?: string };
  license?: string;
  skills?: string[];
  agents?: string[];
  requires?: {
    env?: EnvEntry[];
    'min-protocol'?: string;
  };
  'config-schema'?: Record<string, unknown>;
}

// The effective configuration after inheritance resolution
export interface EffectiveConfiguration {
  metadata?: Metadata;
  plugins: Plugin[];
  skills: Skill[];
  'mcp-servers': Record<string, McpServerStdio | McpServerRemote>;
  env: EnvEntry[];
  instructions: {
    operational: string | null;
    behavioral: string | null;
    identity: string | null;
    'import-mode': 'merge' | 'replace' | 'skip';
  };
  permissions: {
    tools: {
      allow: string[] | null; // null means "no restriction from this level"
      deny: string[];
      ask: string[];
    };
    paths: {
      writable: string[];
      readonly: string[];
    };
    network: {
      'allowed-hosts': string[];
    };
  };
}
