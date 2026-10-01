const fetch = globalThis.fetch;

async function checkCatalogSearch() {
  const r = await fetch('https://animeav1.com/catalogo?search=sword-art-online-alicization-war-of-underworld&page=1');
  const t = await r.text();

  // Let's test the Go regex:
  // \{id:"(\d+)",title:"([^"]+)",synopsis:"((?:[^"\\]|\\.)*)",categoryId:\d+,slug:"([^"]+)"
  const regex = /\{id:"(\d+)",title:"([^"]+)",synopsis:"((?:[^"\\]|\\.)*)",categoryId:\d+,slug:"([^"]+)"/g;
  const matches = [...t.matchAll(regex)];
  console.log('Matches with id as string (id:"123"):', matches.length);

  // What if id is a number: id:123 ?
  const regexNum = /\{id:(\d+),title:"([^"]+)",synopsis:"((?:[^"\\]|\\.)*)",categoryId:(\d+),slug:"([^"]+)"/g;
  const matchesNum = [...t.matchAll(regexNum)];
  console.log('Matches with id as number (id:123):', matchesNum.length);
  matchesNum.forEach(m => console.log('  Found:', m[2], 'Slug:', m[5], 'Cat:', m[4]));

  // Also test loose regex
  const anySlug = [...t.matchAll(/slug:"([^"]+)"/g)].map(m => m[1]);
  console.log('Total slugs in page:', anySlug.length, anySlug.slice(0, 5));
}

checkCatalogSearch().catch(console.error);
