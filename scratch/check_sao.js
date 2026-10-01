const fetch = globalThis.fetch;

async function checkSAODetails() {
  const url = 'https://animeav1.com/media/sword-art-online-alicization-war-of-underworld';
  const r = await fetch(url);
  console.log('Status:', r.status);
  const html = await r.text();
  console.log('HTML length:', html.length);
  
  // Check media object
  const mId = html.match(/media:\{id:(\d+)/);
  console.log('media id match:', mId ? mId[1] : null);

  const mTitle = html.match(/media:\{[^}]*title:"([^"]+)"/);
  console.log('title match:', mTitle ? mTitle[1] : null);

  // Check what media:{ contains in this page!
  const mediaIdx = html.indexOf('media:{');
  if (mediaIdx !== -1) {
    console.log('media block snippet:', html.substring(mediaIdx, mediaIdx + 200));
  } else {
    console.log('media:{ NOT FOUND in HTML!');
    // Let's see what is in HTML!
    const titleTag = html.match(/<title>([^<]+)<\/title>/);
    console.log('Title tag:', titleTag ? titleTag[1] : null);
  }

  // Check episode 1
  const epUrl = 'https://animeav1.com/media/sword-art-online-alicization-war-of-underworld/1';
  const rEp = await fetch(epUrl);
  console.log('Ep 1 Status:', rEp.status);
  const epHtml = await rEp.text();
  console.log('Ep 1 has embeds?', epHtml.includes('embeds:'));
  console.log('Ep 1 has downloads?', epHtml.includes('downloads:'));
}

checkSAODetails().catch(console.error);
