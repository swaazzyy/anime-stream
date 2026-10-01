const fetch = globalThis.fetch;

async function checkSAO() {
  console.log('--- 1. Checking SAO ---');
  const r1 = await fetch('https://animeav1.com/media/sword-art-online-alicization-war-of-underworld');
  console.log('Direct status:', r1.status);

  const r2 = await fetch('https://animeav1.com/catalogo?search=sword%20art%20online');
  const t2 = await r2.text();
  const matches = [...t2.matchAll(/\{id:"(\d+)",title:"([^"]+)",synopsis:"((?:[^"\\]|\\.)*)",categoryId:(\d+),slug:"([^"]+)"/g)];
  console.log('Found in search for "sword art online":', matches.length);
  matches.forEach(m => console.log(`  ID:${m[1]} Cat:${m[4]} Slug:${m[5]} Title:${m[2]}`));

  // Check more SAO search
  const r3 = await fetch('https://animeav1.com/catalogo?search=alicization');
  const t3 = await r3.text();
  const m3 = [...t3.matchAll(/\{id:"(\d+)",title:"([^"]+)",synopsis:"((?:[^"\\]|\\.)*)",categoryId:(\d+),slug:"([^"]+)"/g)];
  console.log('Found in search for "alicization":', m3.length);
  m3.forEach(m => console.log(`  ID:${m[1]} Cat:${m[4]} Slug:${m[5]} Title:${m[2]}`));
}

async function checkMovies() {
  console.log('\n--- 2. Checking Movies ---');
  // Search for popular movies on animeav1
  const r = await fetch('https://animeav1.com/catalogo?search=movie');
  const t = await r.text();
  const movies = [...t.matchAll(/\{id:"(\d+)",title:"([^"]+)",synopsis:"((?:[^"\\]|\\.)*)",categoryId:(\d+),slug:"([^"]+)"/g)];
  console.log('Found movies:', movies.length);
  movies.slice(0, 5).forEach(m => console.log(`  Cat:${m[4]} Slug:${m[5]} Title:${m[2]}`));

  // Also check Koe no Katachi or Kimi no Na wa
  const rKoe = await fetch('https://animeav1.com/catalogo?search=koe%20no%20katachi');
  const tKoe = await rKoe.text();
  const mKoe = [...tKoe.matchAll(/\{id:"(\d+)",title:"([^"]+)",synopsis:"((?:[^"\\]|\\.)*)",categoryId:(\d+),slug:"([^"]+)"/g)];
  console.log('Koe no Katachi:', mKoe.map(m => ({ slug: m[5], cat: m[4], id: m[1] })));

  if (mKoe.length > 0) {
    const koeSlug = mKoe[0][5];
    console.log(`Checking Koe no Katachi media page: https://animeav1.com/media/${koeSlug}`);
    const rMedia = await fetch(`https://animeav1.com/media/${koeSlug}`);
    const tMedia = await rMedia.text();
    console.log('Media status:', rMedia.status);
    
    // Check episode list or player structure in media page
    const epMatches = [...tMedia.matchAll(/\{id:\d+,number:(\d+)\}/g)];
    console.log('Episodes found in movie media page:', epMatches.map(e => e[1]));
    
    // Check if episode 1 exists:
    const rEp1 = await fetch(`https://animeav1.com/media/${koeSlug}/1`);
    console.log('Episode 1 page status:', rEp1.status);
    const tEp1 = await rEp1.text();
    console.log('Episode 1 has embeds?', tEp1.includes('embeds:'));
  }
}

async function checkHentai() {
  console.log('\n--- 3. Checking Hentai / Adult categories ---');
  // Check category filter on catalogo
  // Let's see category IDs on animeav1: what is categoryId 1, 2, etc?
  const rHome = await fetch('https://animeav1.com/catalogo');
  const tHome = await rHome.text();
  const genres = [...tHome.matchAll(/genre=([a-z0-9-]+)/g)].map(x => x[1]);
  console.log('Sample genres from catalog:', [...new Set(genres)].slice(0, 20));
  
  // Search for hentai or ecchi
  const rH = await fetch('https://animeav1.com/catalogo?search=hentai');
  const tH = await rH.text();
  console.log('Search "hentai" has results?', tH.includes('slug:'));
  
  const rH2 = await fetch('https://animeav1.com/catalogo?genre=hentai');
  console.log('Genre "hentai" status:', rH2.status);
  const tH2 = await rH2.text();
  const mH2 = [...tH2.matchAll(/\{id:"(\d+)",title:"([^"]+)",synopsis:"((?:[^"\\]|\\.)*)",categoryId:(\d+),slug:"([^"]+)"/g)];
  console.log('Items with genre hentai:', mH2.length);
}

async function run() {
  await checkSAO();
  await checkMovies();
  await checkHentai();
}

run().catch(console.error);
