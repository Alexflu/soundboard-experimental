import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import chalk from 'chalk';
import { merge } from 'webpack-merge';
import { spawn, execSync } from 'child_process';
import baseConfig from './webpack.config.base.mjs';
import CheckNodeEnv from '../scripts/CheckNodeEnv.mjs';
import { rendererModuleRules } from './webpack.config.renderer.rules.mjs';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// When an ESLint server is running, we can't set the NODE_ENV so we'll check if it's
// at the dev webpack config is not accidentally run in a production environment
if (process.env.NODE_ENV === 'production') {
  CheckNodeEnv('development');
}

const port = process.env.PORT || 1212;
const publicPath = '/dist/';
const dllDir = path.join(__dirname, '../dll');
const manifest = path.resolve(dllDir, 'renderer.json');
const mainProcessEnv = { ...process.env };
delete mainProcessEnv.NODE_OPTIONS;

const userAgent = process.env.npm_config_user_agent || '';
const packageManager = userAgent.includes('yarn') ? 'yarn' : 'npm';
const packageManagerRun = (scriptName) =>
  packageManager === 'yarn' ? [scriptName] : ['run', scriptName];
const packageManagerCommand = (scriptName) =>
  [packageManager].concat(packageManagerRun(scriptName)).join(' ');

/**
 * Warn if the DLL is not built
 */
if (!(fs.existsSync(dllDir) && fs.existsSync(manifest))) {
  console.log(
    chalk.black.bgYellow.bold(
      'The DLL files are missing. Sit back while we build them for you with "yarn build-dll"'
    )
  );
  execSync(packageManagerCommand('build-dll'), { stdio: 'inherit' });
}

export default merge(baseConfig, {
  devtool: 'inline-source-map',

  mode: 'development',

  target: 'electron-renderer',

  entry: [
    'core-js',
    'regenerator-runtime/runtime',
    path.join(__dirname, '../../src/index.tsx'),
  ],

  output: {
    publicPath: `http://localhost:${port}/dist/`,
    filename: 'renderer.dev.js',
  },

  module: {
    rules: rendererModuleRules,
  },
  plugins: [

    new webpack.DllReferencePlugin({
      context: path.join(__dirname, '../dll'),
      manifest: JSON.parse(fs.readFileSync(manifest, 'utf8')),
      sourceType: 'var',
    }),

    new webpack.NoEmitOnErrorsPlugin(),

    /**
     * Create global constants which can be configured at compile time.
     *
     * Useful for allowing different behaviour between development builds and
     * release builds
     *
     * NODE_ENV should be production so that modules do not perform certain
     * development checks
     *
     * By default, use 'development' as NODE_ENV. This can be overriden with
     * 'staging', for example, by changing the ENV variables in the npm scripts
     */
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
    }),

    new webpack.LoaderOptionsPlugin({
      debug: true,
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
