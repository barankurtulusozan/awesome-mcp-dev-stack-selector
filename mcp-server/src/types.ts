export interface AppPricing {
  model: 'free_open_source' | 'freemium' | 'free_proprietary' | 'paid_commercial';
  has_paid_tier: boolean;
  paid_tier_description?: string;
}

export interface AppPrivacy {
  telemetry: boolean;
  offline_usable: boolean;
  cloud_sync_required: boolean;
}

export interface AppSelfHosting {
  supported: boolean;
  docker_image?: string;
  documentation_url?: string;
}

export interface AppInstallation {
  macOS?: string;
  Windows?: string;
  Linux?: string;
}

export interface AppReplacement {
  target: string;
  migration_ease: 'seamless' | 'moderate' | 'complex';
  import_supported?: boolean;
  notes?: string;
}

export interface AppSecurity {
  verified_publisher: boolean;
  last_audit_date: string;
}

export interface AppEntry {
  id: string;
  name: string;
  tagline: string;
  description: string;
  website: string;
  repository?: string;
  license_spdx: string;
  category: 'developer-tools' | 'ai-tools' | 'container-infra' | 'design-media' | 'productivity' | 'security-networking' | 'database-analytics';
  tags: string[];
  capabilities: string[];
  import_export_formats?: string[];
  platforms: string[];
  pricing: AppPricing;
  privacy: AppPrivacy;
  self_hosting?: AppSelfHosting;
  installation: AppInstallation;
  replaces?: AppReplacement[];
  security?: AppSecurity;
  health_status?: 'healthy' | 'degraded' | 'archived';
}

export interface RegistryMeta {
  version: string;
  total_apps: number;
  last_updated: string;
  generator?: string;
}

export interface RegistryData {
  $schema?: string;
  meta: RegistryMeta;
  apps: AppEntry[];
}

export interface SearchResultItem {
  app: AppEntry;
  score: number;
  match_reasons: string[];
}
