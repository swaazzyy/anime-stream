interface Genre {
    id: number;
    name: string;
    type: number;
    slug: string;
    malId: number;
}
interface Category {
    id: number;
    name: string;
    slug: string;
    malId: number;
}
interface Episode {
    id: number;
    number: number;
}
interface Mirror {
    server: string;
    url: string;
}
interface DownloadOption {
    server: string;
    url: string;
}
interface EpisodeVariant {
    SUB?: number;
    DUB?: number;
}
interface EpisodeDetail {
    id: number;
    mediaId: number;
    title: string | null;
    number: number;
    season: number | null;
    relativeNumber: number | null;
    variants: EpisodeVariant;
    filler: boolean;
    publishedAt: string;
    createdAt: string;
    updatedAt: string;
    embeds: {
        SUB?: Mirror[];
        DUB?: Mirror[];
    };
    downloads: {
        SUB?: DownloadOption[];
        DUB?: DownloadOption[];
    };
}
interface RelatedAnime {
    type: number;
    destination: {
        id: number;
        slug: string;
        title: string;
        startDate: string;
    };
}
interface Anime {
    id: number;
    categoryId: number;
    title: string;
    slug: string;
    aka: {
        "en-us"?: string;
        "ja-jp"?: string;
        [key: string]: string | undefined;
    };
    genres: Genre[];
    synopsis: string;
    poster: string | null;
    backdrop: string | null;
    trailer: string | null;
    status: number;
    statusText: "Finished" | "Upcoming" | "Airing";
    runtime: number | null;
    startDate: string;
    nextDate: string | null;
    endDate: string | null;
    waitDays: number;
    featured: boolean;
    mature: boolean;
    episodesCount: number;
    score: number;
    votes: number;
    malId: number;
    seasons: number | null;
    createdAt: string;
    updatedAt: string;
    category: Category;
    episodes: Episode[];
    relations: RelatedAnime[];
}
type CatalogOrder = 'score' | 'popular' | 'title' | 'latest_added' | 'latest_released';
interface CatalogItem {
    id: number;
    title: string;
    slug: string;
    synopsis: string;
    poster: string;
    type: string;
    typeSlug: string;
}
interface CatalogResponse {
    items: CatalogItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
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
interface SearchParams {
    query?: string;
    genre?: string | string[];
    type?: string;
    year?: number;
    status?: string;
    letter?: string;
    page?: number;
    pageSize?: number;
}
interface SvelteKitDataItem {
    type: string;
    data: {
        user?: unknown;
        media?: Anime;
        [key: string]: unknown;
    };
    uses?: {
        dependencies?: string[];
        params?: string[];
    };
}
interface ScrapedData {
    user?: unknown;
    media?: Anime;
    [key: string]: unknown;
}
interface SvelteKitData {
    base: string;
    env: Record<string, string>;
}

/**
 * Fetches and parses an anime page by slug
 */
declare function getAnime(slug: string): Promise<Anime | null>;
/**
 * Gets the anime catalog with optional filtering
 */
declare function getCatalog(params?: CatalogParams): Promise<{
    items: CatalogItem[];
    total: number;
}>;
/**
 * Searches for anime by query
 */
declare function searchAnime(query: string): Promise<CatalogItem[]>;
/**
 * Gets full episode data including mirrors and downloads
 */
declare function getEpisode(animeSlug: string, episodeNumber: number): Promise<EpisodeDetail | null>;

export { type Anime, type CatalogItem, type CatalogOrder, type CatalogParams, type CatalogResponse, type Category, type DownloadOption, type Episode, type EpisodeDetail, type EpisodeVariant, type Genre, type Mirror, type RelatedAnime, type ScrapedData, type SearchParams, type SvelteKitData, type SvelteKitDataItem, getAnime, getCatalog, getEpisode, searchAnime };
