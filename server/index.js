const Valoria = require('./valoria');
const isLocal = process.env.PORT ? false : true;
const port = process.env.PORT || 3000;

if(isLocal){
  Valoria.runLocalNet(8);
} else {
  let valoria = new Valoria(port);
}