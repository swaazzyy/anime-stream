const fetch = globalThis.fetch;

const testAnimeList = [
  'fx-senshi-kurumi-chan',
  'one-piece',
  'tensei-shitara-ken-deshita-ii',
  'dogulwang',
  'thunder-3',
  'shin-tennis-no-oujisama-u-17-world-cup-kesshou-member-ketteisen',
  'rezero-kara-hajimeru-isekai-seikatsu-3rd-season',
  'shiguang-dailiren-iii',
  'bleach-sennen-kessen-hen-kashin-tan',
  'boku-no-hero-academia-i-am-a-hero-too',
  'shingeki-no-kyojin',
  'death-note',
  'one-punch-man',
  'sword-art-online-alicization-war-of-underworld',
  'koe-no-katachi',
  'sword-art-online-movie-ordinal-scale',
  'kimetsu-no-yaiba-movie-mugen-ressha-hen'
];

async function checkAll() {
  for (const slug of testAnimeList) {
    const url = `https://animeav1.com/media/${slug}/1`;
    try {
      const res = await fetch(url);
      const text = await res.text();
      const hasEmbeds = text.includes('embeds:');
      const embedsMatch = text.match(/embeds:\{([\s\S]*?)\}(?:,downloads|$)/);
      let servers = [];
      if (embedsMatch) {
        const itemRegex = /\{server:"([^"]+)",url:"([^"]+)"\}/g;
        servers = [...embedsMatch[1].matchAll(itemRegex)].map(m => m[1]);
      }
      console.log(`[${res.status}] ${slug}: embeds=${hasEmbeds}, servers=${servers.join(', ')}`);
    } catch (e) {
      console.log(`[ERROR] ${slug}:`, e.message);
    }
  }
}

checkAll().catch(console.error);
