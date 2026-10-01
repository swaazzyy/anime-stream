"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  getAnime: () => getAnime,
  getCatalog: () => getCatalog,
  getEpisode: () => getEpisode,
  searchAnime: () => searchAnime
});
module.exports = __toCommonJS(index_exports);

// src/scraper/extractor.ts
var BASE_URL = "https://animeav1.com";
var CDN_BASE = "https://cdn.animeav1.com";
function cleanSynopsis(text) {
  if (!text) return "";
  return text.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/"([^"]+)"/g, "$1").replace(/\n+\s*\n*/g, " ").replace(/ {2,}/g, " ").trim();
}
async function extractAnimeFromPage(url) {
  const response = await fetch(url);
  const html = await response.text();
  const kitStartIdx = html.indexOf("kit.start");
  if (kitStartIdx === -1) return null;
  const dataIdx = html.indexOf("data: [", kitStartIdx);
  if (dataIdx === -1) return null;
  const arrayStart = dataIdx + 6;
  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < html.length; i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]") {
      depth--;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }
  if (arrayEnd === -1) return null;
  const dataArray = html.slice(arrayStart, arrayEnd + 1);
  const jsonArray = dataArray.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3').replace(/,"uses":\{"[^}]*"}"/g, "").replace(/,"form":null/g, "").replace(/,"error":null/g, "");
  try {
    const data = JSON.parse(jsonArray);
    const media = data[2]?.data?.media;
    if (!media) return null;
    media.synopsis = cleanSynopsis(media.synopsis);
    if (media.id) {
      media.poster = `${CDN_BASE}/covers/${media.id}.jpg`;
      media.backdrop = `${CDN_BASE}/backdrops/${media.id}.jpg`;
    }
    if (media.trailer && !media.trailer.startsWith("http")) {
      media.trailer = `https://www.youtube.com/watch?v=${media.trailer}`;
    }
    const statusMap = {
      0: "Finished",
      1: "Upcoming",
      2: "Airing"
    };
    media.statusText = statusMap[media.status] || "Finished";
    return media;
  } catch (e) {
    console.error("Failed to parse anime data:", e);
    return null;
  }
}
async function getAnime(slug) {
  const url = `${BASE_URL}/media/${slug}`;
  return extractAnimeFromPage(url);
}
function extractCatalogFromJson(html) {
  const kitStartIdx = html.indexOf("kit.start");
  if (kitStartIdx === -1) return { items: [], total: 0 };
  const dataIdx = html.indexOf("data: [", kitStartIdx);
  if (dataIdx === -1) return { items: [], total: 0 };
  const arrayStart = dataIdx + 6;
  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < html.length; i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]") {
      depth--;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }
  if (arrayEnd === -1) return { items: [], total: 0 };
  const dataArray = html.slice(arrayStart, arrayEnd + 1);
  const jsonArray = dataArray.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3').replace(/,"uses":\{"[^}]*"}"/g, "").replace(/,"form":null/g, "").replace(/,"error":null/g, "");
  try {
    const data = JSON.parse(jsonArray);
    const catalogData = data[2]?.data;
    if (!catalogData) return { items: [], total: 0 };
    const results = catalogData.results || [];
    const total = catalogData.total || results.length;
    const items = results.map((item) => ({
      id: parseInt(item.id, 10),
      title: item.title || "",
      slug: item.slug || "",
      poster: `${CDN_BASE}/covers/${item.id}.jpg`,
      type: item.category?.name || "",
      typeSlug: item.category?.slug || "",
      synopsis: cleanSynopsis(item.synopsis)
    }));
    return { items, total };
  } catch (e) {
    console.error("Failed to parse catalog data:", e);
    return { items: [], total: 0 };
  }
}
function extractCatalogItemsFromHtml(html) {
  const items = [];
  const articleBlocks = html.split("<article");
  for (const block of articleBlocks.slice(1)) {
    const slugMatch = block.match(/href="\/media\/([^"]+)"/);
    const titleMatch = block.match(/<h3[^>]*>([^<]+)<\/h3>/);
    const posterMatch = block.match(/<img[^>]+src="([^"]+)"/);
    const typeMatch = block.match(/class="rounded bg-line[^"]*"[^>]*>([^<]+)<\/div>/);
    const synopsisMatch = block.match(/class="line-clamp-6"[^>]*>([^<]+)<\/p>/);
    if (slugMatch && titleMatch) {
      const posterIdMatch = (posterMatch?.[1] || "").match(/\/covers\/(\d+)\./);
      const id = posterIdMatch ? parseInt(posterIdMatch[1], 10) : 0;
      items.push({
        id,
        title: titleMatch[1].trim(),
        slug: slugMatch[1].trim(),
        poster: posterMatch?.[1] || "",
        type: typeMatch?.[1].trim() || "",
        typeSlug: (typeMatch?.[1].trim() || "").toLowerCase().replace(/\s+/g, "-"),
        synopsis: cleanSynopsis(synopsisMatch?.[1])
      });
    }
  }
  return items;
}
function appendParam(url, key, value) {
  if (value === void 0) return url;
  if (Array.isArray(value)) {
    return value.reduce((u, v) => u + `&${key}=${encodeURIComponent(v)}`, url);
  }
  return url + `&${key}=${encodeURIComponent(value)}`;
}
async function getCatalog(params = {}) {
  const { page = 1, letter, genre, category, minYear, maxYear, status, order } = params;
  let url = `${BASE_URL}/catalogo?page=${page}`;
  url = appendParam(url, "letter", letter);
  url = appendParam(url, "genre", genre);
  url = appendParam(url, "category", category);
  url = appendParam(url, "minYear", minYear);
  url = appendParam(url, "maxYear", maxYear);
  url = appendParam(url, "status", status);
  url = appendParam(url, "order", order);
  const response = await fetch(url);
  const html = await response.text();
  const { items, total } = extractCatalogFromJson(html);
  if (items.length > 0) {
    return { items, total };
  }
  const fallbackItems = extractCatalogItemsFromHtml(html);
  const totalMatch = html.match(/<span[^>]*class="[^"]*font-bold[^"]*"[^>]*>([\d,]+)<\/span>\s*<span[^>]*>Resultados<\/span>/);
  const fallbackTotal = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ""), 10) : fallbackItems.length;
  return { items: fallbackItems, total: fallbackTotal };
}
async function searchAnime(query) {
  const url = `${BASE_URL}/catalogo?search=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  const html = await response.text();
  const { items } = extractCatalogFromJson(html);
  if (items.length > 0) {
    return items;
  }
  return extractCatalogItemsFromHtml(html);
}
function resolveStreamUrl(url) {
  const match = url.match(/^https?:\/\/player\.zilla-networks\.com\/play\/([a-f0-9]{32})\/?$/i);
  if (match) {
    return `https://player.zilla-networks.com/m3u8/${match[1]}`;
  }
  return url;
}
async function getEpisode(animeSlug, episodeNumber) {
  const url = `${BASE_URL}/media/${animeSlug}/${episodeNumber}`;
  const response = await fetch(url);
  const html = await response.text();
  const kitStartIdx = html.indexOf("kit.start");
  if (kitStartIdx === -1) return null;
  const dataIdx = html.indexOf("data: [", kitStartIdx);
  if (dataIdx === -1) return null;
  const arrayStart = dataIdx + 6;
  let depth = 0;
  let arrayEnd = -1;
  for (let i = arrayStart; i < html.length; i++) {
    if (html[i] === "[") depth++;
    else if (html[i] === "]") {
      depth--;
      if (depth === 0) {
        arrayEnd = i;
        break;
      }
    }
  }
  if (arrayEnd === -1) return null;
  const dataArray = html.slice(arrayStart, arrayEnd + 1);
  const jsonArray = dataArray.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3').replace(/,"uses":\{"[^}]*"}"/g, "").replace(/,"form":null/g, "").replace(/,"error":null/g, "").replace(/void 0/g, "null");
  try {
    const data = JSON.parse(jsonArray);
    for (const slot of data) {
      if (slot?.data?.episode) {
        const episodeData = slot.data;
        const episode = episodeData.episode;
        const episodeDetail = {
          ...episode,
          embeds: episodeData.embeds || { SUB: [], DUB: [] },
          downloads: episodeData.downloads || { SUB: [], DUB: [] }
        };
        for (const variant of ["SUB", "DUB"]) {
          const links = episodeDetail.embeds?.[variant];
          if (Array.isArray(links)) {
            for (const link of links) {
              link.url = resolveStreamUrl(link.url);
            }
          }
        }
        return episodeDetail;
      }
    }
    return null;
  } catch (e) {
    console.error("Failed to parse episode data:", e);
    return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getAnime,
  getCatalog,
  getEpisode,
  searchAnime
});
