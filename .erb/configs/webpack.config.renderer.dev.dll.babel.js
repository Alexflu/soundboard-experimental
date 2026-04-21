/**
 * Builds the DLL for development electron renderer process
 */

import webpack from 'webpack';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { merge } from 'webpack-merge';
import baseConfig from './webpack.config.base.js';
import CheckNodeEnv from '../scripts/CheckNodeEnv.js';
import { rendererModuleRules } from './webpack.config.renderer.rules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

CheckNodeEnv('development');

const dist = path.join(__dirname, '../dll');
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8')
);
const dependencies = packageJson.dependencies;

export default merge(baseConfig, {
  context: path.join(__dirname, '../..'),

  devtool: 'eval',

  mode: 'development',

  target: 'electron-renderer',

  externals: ['fsevents', 'crypto-browserify'],

  /**
   * Use `module` from `webpack.config.renderer.dev.js`
   */
  module: {
    rules: rendererModuleRules,
  },

  entry: {
    renderer: Object.keys(dependencies || {}),
  },

  output: {
    library: 'renderer',
    path: dist,
    filename: '[name].dev.dll.js',
    libraryTarget: 'var',
  },

  plugins: [
    new webpack.DllPlugin({
      path: path.join(dist, '[name].json'),
      name: '[name]',
    }),

    /**
     * Create global constants which can be configured at compile time.
     *
     * Useful for allowing different behaviour between development builds and
     * release builds
     *
     * NODE_ENV should be production so that modules do not perform certain
     * development checks
     */
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
    }),

    new webpack.LoaderOptionsPlugin({
      debug: true,
      options: {
        context: path.join(__dirname, '../../src'),
        output: {
          path: path.join(__dirname, '../dll'),
        },
      },
    }),
  ],
});
