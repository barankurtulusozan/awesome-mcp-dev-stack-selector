import { AppEntry, SearchResultItem } from './types.js';

export interface SearchOptions {
  query?: string;
  platform?: string;
  category?: string;
  capability?: string;
  offlineOnly?: boolean;
  limit?: number;
}

export class SearchEngine {
  public search(apps: AppEntry[], options: SearchOptions): SearchResultItem[] {
    const { query, platform, category, capability, offlineOnly, limit = 10 } = options;

    let filtered = apps;

    // Filter by health status (exclude archived by default)
    filtered = filtered.filter(app => app.health_status !== 'archived');

    // Category filter
    if (category) {
      filtered = filtered.filter(app => app.category === category);
    }

    // Platform filter
    if (platform) {
      filtered = filtered.filter(app => app.platforms.some(p => p.toLowerCase() === platform.toLowerCase()));
    }

    // Offline filter
    if (offlineOnly) {
      filtered = filtered.filter(app => app.privacy?.offline_usable === true);
    }

    // Capability filter
    if (capability) {
      const capQuery = capability.toLowerCase();
      filtered = filtered.filter(app => app.capabilities?.some(c => c.toLowerCase() === capQuery));
    }

    // Keyword & Relevance Scoring
    const scoredResults: SearchResultItem[] = [];

    const rawQuery = (query || '').trim().toLowerCase();
    const queryTokens = rawQuery ? rawQuery.split(/\s+/).filter(t => t.length > 0) : [];

    for (const app of filtered) {
      let score = 0;
      const matchReasons: string[] = [];

      if (queryTokens.length === 0) {
        // If no query string, default rank by popularity/health
        score = 1.0;
        if (app.security?.verified_publisher) score += 0.5;
        scoredResults.push({ app, score, match_reasons: ['Catalog entry'] });
        continue;
      }

      // 1. Exact ID / Name match
      if (app.id.toLowerCase() === rawQuery || app.name.toLowerCase() === rawQuery) {
        score += 10.0;
        matchReasons.push(`Exact match on name "${app.name}"`);
      }

      // 2. Token scoring
      for (const token of queryTokens) {
        // Name match
        if (app.name.toLowerCase().includes(token)) {
          score += 4.0;
          matchReasons.push(`Name contains "${token}"`);
        }

        // Tagline match
        if (app.tagline.toLowerCase().includes(token)) {
          score += 2.5;
          matchReasons.push(`Tagline match "${token}"`);
        }

        // Tag match
        if (app.tags.some(t => t.toLowerCase().includes(token))) {
          score += 2.0;
          matchReasons.push(`Matched tag "${token}"`);
        }

        // Capability match
        if (app.capabilities.some(c => c.toLowerCase().includes(token))) {
          score += 3.0;
          matchReasons.push(`Matched capability "${token}"`);
        }

        // Replacement target match (e.g., searching "postman")
        if (app.replaces?.some(r => r.target.toLowerCase().includes(token))) {
          score += 5.0;
          matchReasons.push(`FOSS replacement target for "${token}"`);
        }

        // Description match
        if (app.description.toLowerCase().includes(token)) {
          score += 1.0;
          matchReasons.push(`Description match "${token}"`);
        }
      }

      if (score > 0) {
        if (app.security?.verified_publisher) score += 0.2;
        scoredResults.push({
          app,
          score,
          match_reasons: Array.from(new Set(matchReasons))
        });
      }
    }

    // Sort descending by score
    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.slice(0, limit);
  }
}
