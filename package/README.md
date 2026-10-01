# animeav1-api
![npm](https://img.shields.io/npm/v/animeav1-api) ![downloads](https://img.shields.io/npm/dm/animeav1-api) ![license](https://img.shields.io/npm/l/animeav1-api) ![bundle](https://img.shields.io/bundlephobia/minzip/animeav1-api) ![GitHub stars](https://img.shields.io/github/stars/carlosfdezb/animeav1-api)

> Unofficial API for scraping AnimeAV1 data

## Install

```bash
npm install animeav1-api
```

## Usage

```typescript
import { getAnime, getCatalog, searchAnime, getEpisode } from 'animeav1-api';

// Get anime details by slug
const anime = await getAnime('sousou-no-frieren-2nd-season');
console.log(anime.title);        // "Sousou no Frieren 2nd Season"
console.log(anime.episodes);    // [{id: 49741, number: 1}, ...]
console.log(anime.genres);       // [{id: 2, name: "Aventura", ...}, ...]

// List catalog with filters
const catalog = await getCatalog({ page: 1, genre: 'aventura' });
console.log(catalog.items);      // CatalogItem[]
console.log(catalog.total);      // 1000

// Multi-genre filtering (OR logic - returns results matching ANY genre)
const multiGenre = await getCatalog({ genre: ['comedia', 'deportes'] });
console.log(multiGenre.items);   // Anime matching comedia OR deportes

// Sort catalog by popularity
const popular = await getCatalog({ order: 'popular' });
console.log(popular.items);      // Most popular anime first

// Combine with other filters
const recent = await getCatalog({ genre: 'accion', order: 'latest_released' });
console.log(recent.items);       // Recently released accion anime

// Search by text
const results = await searchAnime('Frieren');
console.log(results[0].title);  // "Sousou no Frieren 2nd Season"

// Get episode info
const episode = await getEpisode('sousou-no-frieren-2nd-season', 1);
console.log(episode.id);        // 49741
```

## API

### `getAnime(slug: string)`
Gets full anime details by slug.

**Returns:** `Promise<Anime | null>`

### `getCatalog(params?: CatalogParams)`
Lists catalog with optional filters.

**Params:**
- `page?: number` - Page number (default: 1)
- `letter?: string` - Filter by first letter (A-Z)
- `genre?: string | string[]` - Genre slug(s) (accion, romance, etc). Array for multiple genres (OR logic).
- `category?: string` - Category (tv-anime, pelicula, ova, especial)
- `minYear?: number` - Minimum release year
- `maxYear?: number` - Maximum release year
- `status?: string` - Status (en-emision, finalizado, etc)
- `order?: CatalogOrder` - Sort order (score, popular, title, latest_added, latest_released)

**Returns:** `Promise<{ items: CatalogItem[]; total: number }>`

### `searchAnime(query: string)`
Searches animes by title text.

**Returns:** `Promise<CatalogItem[]>`

### `getEpisode(animeSlug: string, episodeNumber: number)`
Gets specific episode info with mirrors and downloads.

**Returns:** `Promise<EpisodeDetail | null>`

## Types

```typescript
// Catalog filtering parameters
interface CatalogParams {
  page?: number;
  letter?: string;
  genre?: string | string[];
  category?: string;
  minYear?: number;
  maxYear?: number;
  status?: string;
  order?: CatalogOrder;
}

export type CatalogOrder = 'score' | 'popular' | 'title' | 'latest_added' | 'latest_released';

interface Anime {
  id: number;
  title: string;
  slug: string;
  aka: { "en-us"?: string; "ja-jp"?: string };
  genres: Genre[];
  synopsis: string;          // Clean (no \n, quotes, etc)
  poster: string;            // Full URL
  backdrop: string;          // Full URL
  trailer: string | null;  // Full YouTube URL
  status: number;           // 0 = Finished, 1 = Upcoming, 2 = Airing
  statusText: "Finished" | "Upcoming" | "Airing";
  episodesCount: number;
  episodes: Episode[];
  relations: RelatedAnime[];
  category: Category;
  // ... more fields
}

interface EpisodeDetail {
  id: number;
  mediaId: number;
  number: number;
  variants: { SUB?: number; DUB?: number };
  embeds: {
    SUB?: { server: string; url: string }[];
    DUB?: { server: string; url: string }[];
  };
  downloads: {
    SUB?: { server: string; url: string }[];
    DUB?: { server: string; url: string }[];
  };
}
```

## Disclaimer

This package is not affiliated with AnimeAV1. Use at your own risk. The site may change its structure at any time, breaking this package.

## AI Generation

This package was fully designed and developed by an AI agent. The code was generated using **MiniMax-M2.7** (an LLM by MiniMax) following an Agent Teams architecture with Spec-Driven Development (SDD).

If you find any bugs or want to contribute, improvements are welcome.

## License

MIT
