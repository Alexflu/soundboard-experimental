/* eslint global-require: off, import/no-extraneous-dependencies: off */

module.exports = (api) => {
  const environment = api.env();
  const development = environment === 'development' || environment === 'test';
  const test = environment === 'test';

  return {
    presets: [
      [
        require('@babel/preset-env'),
        {
          modules: test ? 'commonjs' : false,
          targets: test ? { node: 'current' } : { electron: '41' },
        },
      ],
      require('@babel/preset-typescript'),
      [require('@babel/preset-react'), { development, runtime: 'automatic' }],
    ],
    plugins: [require('@babel/plugin-transform-runtime')],
  };
};
