const fetch = globalThis.fetch;

async function verifyFixes() {
  console.log('=== 1. VERIFYING MOVIES ===');
  const rKoe = await fetch('http://localhost:8080/api/anime/koe-no-katachi');
  const dKoe = await rKoe.json();
  console.log('Koe no Katachi anime:');
  console.log('  Status:', rKoe.status);
  console.log('  Type:', dKoe.anime.type);
  console.log('  Total episodes:', dKoe.anime.total_episodes);
  console.log('  Episodes length:', dKoe.anime.episodes.length);
  console.log('  Episode 1 Title:', dKoe.anime.episodes[0]?.title);

  const rKoeEp = await fetch('http://localhost:8080/api/anime/koe-no-katachi/episode/1');
  const dKoeEp = await rKoeEp.json();
  console.log('Koe no Katachi Episode 1:');
  console.log('  HTTP:', rKoeEp.status);
  console.log('  Servers count:', dKoeEp.servers?.length);
  console.log('  Downloads count:', dKoeEp.downloads?.length);
  console.log('  First server:', dKoeEp.servers?.[0]?.name, '->', dKoeEp.servers?.[0]?.url);

  console.log('\n=== 2. VERIFYING SAO ALICIZATION WAR OF UNDERWORLD ===');
  const rSAO = await fetch('http://localhost:8080/api/anime/sword-art-online-alicization-war-of-underworld');
  const dSAO = await rSAO.json();
  console.log('SAO Alicization War of Underworld anime:');
  console.log('  Status:', rSAO.status);
  console.log('  Title:', dSAO.anime.title);
  console.log('  Total episodes:', dSAO.anime.total_episodes);
  console.log('  Episodes in array:', dSAO.anime.episodes.length);
  console.log('  First episode:', dSAO.anime.episodes[0]?.number, '-', dSAO.anime.episodes[0]?.title);
  console.log('  Last episode:', dSAO.anime.episodes[dSAO.anime.episodes.length - 1]?.number, '-', dSAO.anime.episodes[dSAO.anime.episodes.length - 1]?.title);

  const rSAOEp = await fetch('http://localhost:8080/api/anime/sword-art-online-alicization-war-of-underworld/episode/1');
  const dSAOEp = await rSAOEp.json();
  console.log('SAO Episode 1:');
  console.log('  HTTP:', rSAOEp.status);
  console.log('  Servers count:', dSAOEp.servers?.length);
  console.log('  Downloads count:', dSAOEp.downloads?.length);
  console.log('  First server:', dSAOEp.servers?.[0]?.name, '->', dSAOEp.servers?.[0]?.url);

  console.log('\n=== 3. VERIFYING HENTAI FILTERING ===');
  const rSearchHentai = await fetch('http://localhost:8080/api/anime/search?q=hentai');
  const dSearchHentai = await rSearchHentai.json();
  console.log('Search "hentai" results count:', dSearchHentai.length);

  const rCat = await fetch('http://localhost:8080/api/anime/catalog');
  const dCat = await rCat.json();
  const allTitles = [...dCat.hero_slides, ...dCat.trending, ...dCat.popular, ...dCat.top_rated].map(a => a.title.toLowerCase());
  const hasHentai = allTitles.some(t => t.includes('hentai'));
  console.log('Catalog has any hentai?', hasHentai);
}

verifyFixes().catch(console.error);
