const fs = require('fs');

async function testAnimeDetails() {
  const url = 'https://animeav1.com/media/shiguang-dailiren-iii';
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const text = await res.text();
  console.log("Media page HTML length:", text.length);

  // Find kit.start
  const idx = text.indexOf('kit.start');
  if (idx !== -1) {
    const slice = text.slice(idx, idx + 4000);
    fs.writeFileSync('scratch/media_utf8.txt', slice, 'utf8');
    console.log("Saved media slice, length:", slice.length);
  }
}
testAnimeDetails().catch(console.error);
