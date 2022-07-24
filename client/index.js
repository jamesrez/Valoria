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
    "./modules/tween.js",
    "./modules/avatar.js",
    "./modules/touch.js",
    "./modules/vr.js",
    "./modules/world.js",
    "./modules/events.js",
    "./modules/valoria.js",
  ]);
  valoria.load();
  valoria.avatar.setMetadata({name: "James", holding: true});
  await valoria.avatar.set("http://localhost:3000/valoria/mimi.glb");
  valoria.avatar.model.position.set(0, 0, 5);
  await valoria.world.add("city", "/valoria/city.glb", {
    castShadow: false,
    receiveShadow: true
  });

  const directionalLight = new valoria.THREE.DirectionalLight(0xdd77ff, 1)
  directionalLight.position.y = 10
  directionalLight.castShadow = true
  valoria.scene.add(directionalLight)


  // const pLight = new valoria.THREE.PointLight(0xdd77ff, 2)
  // pLight.position.y = 20
  // pLight.position.x = -15
  // pLight.position.z = 10
  // pLight.castShadow = true
  // valoria.scene.add(pLight)

  const pLight2 = new valoria.THREE.PointLight(0xdd77ff, 1.5)
  pLight2.position.y = 20
  pLight2.position.x = 0
  pLight2.position.z = 0
  pLight2.castShadow = true
  valoria.scene.add(pLight2)


})()