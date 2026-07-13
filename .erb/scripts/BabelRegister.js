const path = require('path');

if (process.versions.electron && process.env.NODE_ENV === 'development') {
  const { app } = require('electron');
  app.setPath('userData', path.join(app.getPath('appData'), 'soundboard'));
}

require('@babel/register')({
  extensions: ['.es6', '.es', '.jsx', '.js', '.mjs', '.ts', '.tsx'],
  cwd: path.join(__dirname, '../..'),
});
