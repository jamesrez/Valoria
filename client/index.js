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
    "./modules/touch.js",
    "./modules/world.js",
    "./modules/events.js",
    "./modules/valoria.js",
  ]);
  valoria.load();
  await valoria.avatar.set("http://localhost:3000/valoria/mimi.glb");
  valoria.avatar.model.position.set(0, 0, 5);
  await valoria.world.add("city", "/valoria/city.glb");
})()