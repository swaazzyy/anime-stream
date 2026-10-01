const fetch = globalThis.fetch;

async function testFetchAnimeAV1Details() {
  const url = 'https://animeav1.com/media/sword-art-online-alicization-war-of-underworld';
  const r = await fetch(url);
  const html = await r.text();

  console.log('--- Testing regexes on SAO HTML ---');
  
  // 1. idMatch
  const idMatch = html.match(/media:\{id:(\d+)/);
  console.log('1. idMatch:', idMatch ? idMatch[1] : null);

  // 2. titleMatch
  const titleMatch = html.match(/media:\{[^}]*title:"([^"]+)"/);
  console.log('2. titleMatch:', titleMatch ? titleMatch[1] : null);

  // 3. slugMatch
  const slugMatch = html.match(/media:\{[^}]*slug:"([a-z0-9-]+)"/);
  console.log('3. slugMatch:', slugMatch ? slugMatch[1] : null);

  // 4. synopsisMatch:
  // In Go: `synopsis:"((?:[^"\\]|\\.)*)"`
  const synopsisMatch = html.match(/synopsis:"((?:[^"\\]|\\.)*)"/);
  console.log('4. synopsisMatch found?:', !!synopsisMatch);

  // 5. episodesCount:
  // In Go: `episodesCount:(\d+)`
  const epCountMatch = html.match(/episodesCount:(\d+)/);
  console.log('5. epCountMatch:', epCountMatch ? epCountMatch[1] : null);

  // 6. scoreMatch:
  // In Go: `score:([0-9.]+)`
  const scoreMatch = html.match(/score:([0-9.]+)/);
  console.log('6. scoreMatch:', scoreMatch ? scoreMatch[1] : null);

  // 7. trailerMatch:
  // In Go: `trailer:"([^"]+)"`
  const trailerMatch = html.match(/trailer:"([^"]+)"/);
  console.log('7. trailerMatch:', trailerMatch ? trailerMatch[1] : null);

  // 8. genresRegex:
  // In Go: `\{id:\d+,name:"([^"]+)",type:\d+,slug:"[^"]+",malId:\d+\}`
  const genresRegex = /\{id:\d+,name:"([^"]+)",type:\d+,slug:"[^"]+",malId:\d+\}/g;
  const genres = [...html.matchAll(genresRegex)].map(m => m[1]);
  console.log('8. genres found:', genres);

  // 9. epRegex:
  // In Go: `\{id:\d+,number:(\d+)\}`
  const epRegex = /\{id:\d+,number:(\d+)\}/g;
  const eps = [...html.matchAll(epRegex)].map(m => m[1]);
  console.log('9. episode numbers found:', eps);
}

testFetchAnimeAV1Details().catch(console.error);
