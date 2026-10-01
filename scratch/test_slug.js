const str = 'embeds:{SUB:[{server:"UPNShare",url:"#1"},{server:"Voe",url:"#2"}],DUB:[{server:"UPNShare",url:"#3"},{server:"Voe",url:"#4"}]},downloads:{SUB:[{server:"TransferIt",url:"#5"}],DUB:[{server:"TransferIt",url:"#6"}]}}';

const embedsBlock = str.match(/embeds:\{([\s\S]*?)\}(?:,downloads|$)/);
if (embedsBlock) {
  const langRegex = /([A-Z]+):\[([\s\S]*?)\]/g;
  for (const m of embedsBlock[1].matchAll(langRegex)) {
    const lang = m[1];
    const itemRegex = /\{server:"([^"]+)",url:"([^"]+)"\}/g;
    for (const item of m[2].matchAll(itemRegex)) {
      console.log(`Embed [${lang}]:`, item[1], item[2]);
    }
  }
}

const dlBlock = str.match(/downloads:\{([\s\S]*?)\}\}/);
if (dlBlock) {
  const langRegex = /([A-Z]+):\[([\s\S]*?)\]/g;
  for (const m of dlBlock[1].matchAll(langRegex)) {
    const lang = m[1];
    const itemRegex = /\{server:"([^"]+)",url:"([^"]+)"\}/g;
    for (const item of m[2].matchAll(itemRegex)) {
      console.log(`Download [${lang}]:`, item[1], item[2]);
    }
  }
}
