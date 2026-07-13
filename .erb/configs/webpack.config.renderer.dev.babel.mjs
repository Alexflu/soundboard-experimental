import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import { merge } from 'webpack-merge';
import { spawn } from 'child_process';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import baseConfig from './webpack.config.base.mjs';
import CheckNodeEnv from '../scripts/CheckNodeEnv.mjs';
import { rendererModuleRules } from './webpack.config.renderer.rules.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (process.env.NODE_ENV === 'production') {
  CheckNodeEnv('development');
}

const port = process.env.PORT || 1212;
const publicPath = '/dist/';
const mainProcessEnv = { ...process.env };
delete mainProcessEnv.NODE_OPTIONS;

const userAgent = process.env.npm_config_user_agent || '';
const packageManager = userAgent.includes('yarn') ? 'yarn' : 'npm';
const packageManagerRun = (scriptName) =>
  packageManager === 'yarn' ? [scriptName] : ['run', scriptName];
const packageManagerCommand = (scriptName) =>
  [packageManager].concat(packageManagerRun(scriptName)).join(' ');

export default merge(baseConfig, {
  devtool: 'inline-source-map',

  mode: 'development',

  target: 'electron-renderer',

  entry: path.join(__dirname, '../../src/index.tsx'),

  output: {
    publicPath: `http://localhost:${port}/dist/`,
    filename: 'renderer.dev.js',
  },

  module: {
    rules: rendererModuleRules,
  },

  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),

    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
    }),

    new ReactRefreshWebpackPlugin({
      overlay: false,
    }),
  ],

  node: {
    __dirname: false,
    __filename: false,
  },

  devServer: {
    port,
    host: 'localhost',
    allowedHosts: 'all',
    compress: true,
    hot: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    devMiddleware: {
      publicPath,
      stats: 'errors-only',
    },
    watchFiles: {
      paths: ['src/**/*'],
      options: {
        aggregateTimeout: 300,
        ignored: /node_modules/,
        poll: 100,
      },
    },
    historyApiFallback: {
      verbose: true,
      disableDotRule: false,
    },
    setupMiddlewares(middlewares) {
      console.log('Starting Main Process...');
      spawn(packageManagerCommand('start:main'), {
        env: mainProcessEnv,
        stdio: 'inherit',
        shell: true,
      })
        .on('close', (code) => process.exit(code))
        .on('error', (spawnError) => console.error(spawnError));

      return middlewares;
    },
  },
});
