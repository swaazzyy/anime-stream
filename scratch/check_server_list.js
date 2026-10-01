const fetch = globalThis.fetch;

async function checkServers() {
  const animes = [
    { slug: 'fx-senshi-kurumi-chan', ep: 1 },
    { slug: 'one-piece', ep: 1 },
    { slug: 'sword-art-online-alicization-war-of-underworld', ep: 1 },
    { slug: 'koe-no-katachi', ep: 1 },
    { slug: 'sword-art-online-movie-ordinal-scale', ep: 1 },
    { slug: 'tensei-shitara-ken-deshita-ii', ep: 1 },
    { slug: 'dogulwang', ep: 1 },
    { slug: 'thunder-3', ep: 1 },
    { slug: 'bleach-sennen-kessen-hen-kashin-tan', ep: 1 },
    { slug: 'shingeki-no-kyojin', ep: 1 },
    { slug: 'death-note', ep: 1 },
    { slug: 'one-punch-man', ep: 1 }
  ];

  for (const item of animes) {
    const res = await fetch(`http://localhost:8080/api/anime/${item.slug}/episode/${item.ep}`);
    const data = await res.json();
    console.log(`\n=== Anime: ${item.slug} (Ep ${item.ep}) ===`);
    console.log('Servers returned:');
    data.servers?.forEach(s => console.log(`  • ${s.name} (${s.quality}) -> ${s.url}`));
  }
}

checkServers().catch(console.error);
