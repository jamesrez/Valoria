async function _import(urls){
  let script = document.createElement('script');
  let loaded = 0;
  for(let i=0;i<urls.length;i++){
    const text = await (await fetch(urls[i])).text();
    script.innerHTML += "\n" + text;
  }
  document.body.prepend(script);
}

(async () => {
  await _import([
    './modules/three.js', 
    './modules/three-gltf.js',
    "./modules/avatar.js",
    "./modules/world.js",
    "./modules/events.js",
    "./modules/valoria.js",
  ]);
  valoria.load();
  valoria.world.add("city", "/valoria/city.glb");
})()