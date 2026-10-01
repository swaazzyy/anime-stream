async function verify() {
  const tests = [
    { slug: 'fx-senshi-kurumi-chan', ep: 1 },
    { slug: 'tensei-shitara-ken-deshita-ii', ep: 1 },
    { slug: 'dogulwang', ep: 12 },
    { slug: 'thunder-3', ep: 12 },
    { slug: 'one-piece', ep: 1 },
    { slug: 'one-piece', ep: 1180 },
    { slug: 'bleach-sennen-kessen-hen-kashin-tan', ep: 1 }
  ];

  for (const t of tests) {
    console.log(`\n--- Testing https://animeav1.com/media/${t.slug} and episode ${t.ep} ---`);
    
    // 1. Fetch anime details
    const animeRes = await fetch(`http://127.0.0.1:8080/api/anime/${t.slug}`);
    console.log(`GET /api/anime/${t.slug} -> HTTP ${animeRes.status}`);
    if (animeRes.ok) {
      const a = await animeRes.json();
      console.log(`  Title: ${a.anime ? a.anime.title : a.title}`);
      console.log(`  Total episodes: ${a.anime ? a.anime.total_episodes : a.total_episodes}`);
    }

    // 2. Fetch episode
    const epRes = await fetch(`http://127.0.0.1:8080/api/anime/${t.slug}/episode/${t.ep}`);
    console.log(`GET /api/anime/${t.slug}/episode/${t.ep} -> HTTP ${epRes.status}`);
    if (epRes.ok) {
      const ep = await epRes.json();
      console.log(`  Episode: ${ep.number} (${ep.title})`);
      console.log(`  Servers found:`, ep.servers?.map(s => s.name));
      console.log(`  Downloads found:`, ep.downloads?.map(d => d.name));
    }
  }
}

verify().catch(console.error);
