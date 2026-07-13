/* eslint global-require: off, import/no-extraneous-dependencies: off */

module.exports = (api) => {
  const environment = api.env();
  const webpack = api.caller((caller) => caller?.name === 'babel-loader');
  const development = environment === 'development' || environment === 'test';
  const test = environment === 'test';

  return {
    presets: [
      [
        require('@babel/preset-env'),
        {
          modules: webpack ? false : 'commonjs',
          targets: test ? { node: 'current' } : { electron: '41' },
        },
      ],
      require('@babel/preset-typescript'),
      [require('@babel/preset-react'), { development, runtime: 'automatic' }],
    ],
    plugins: [require('@babel/plugin-transform-runtime')],
  };
};
