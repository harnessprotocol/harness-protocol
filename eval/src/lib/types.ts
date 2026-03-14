export interface HarnessDocument {
  '$schema'?: string;
  version: string;
  kind?: 'profile' | 'fragment';
  metadata?: Metadata;
  plugins?: Plugin[];
  'mcp-servers'?: Record<string, McpServerStdio | McpServerRemote>;
  env?: EnvEntry[];
  instructions?: Instructions;
  permissions?: Permissions;
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

export interface McpServerStdio {
  transport: 'stdio';
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpServerRemote {
  transport: 'http' | 'sse' | 'ws';
  url: string;
  headers?: Record<string, string>;
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
