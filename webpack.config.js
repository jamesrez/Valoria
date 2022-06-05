const path = require('path');

module.exports = {
  entry: './client/valoria.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'client'),
  },
};