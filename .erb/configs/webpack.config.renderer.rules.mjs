export const rendererModuleRules = [
  {
    test: /\.[jt]sx?$/,
    exclude: /node_modules/,
    use: [
      {
        loader: 'babel-loader',
        options: {
          // On Node/OpenSSL 3+, babel-loader's on-disk cache hash can fail in older
          // dependency stacks. Keep renderer transpilation uncached to avoid that path.
          cacheDirectory: false,
          plugins: [
            'react-refresh/babel',
          ].filter(Boolean),
        },
      },
    ],
  },
  {
    test: /\.global\.css$/,
    use: [
      {
        loader: 'style-loader',
      },
      {
        loader: 'css-loader',
        options: {
          sourceMap: true,
        },
      },
    ],
  },
  {
    test: /^((?!\.global).)*\.css$/,
    use: [
      {
        loader: 'style-loader',
      },
      {
        loader: 'css-loader',
        options: {
          modules: {
            localIdentName: '[name]__[local]__[hash:base64:5]',
          },
          sourceMap: true,
          importLoaders: 1,
        },
      },
    ],
  },
  // SASS support - compile all .global.scss files and pipe it to style.css
  {
    test: /\.global\.(scss|sass)$/,
    use: [
      {
        loader: 'style-loader',
      },
      {
        loader: 'css-loader',
        options: {
          sourceMap: true,
        },
      },
      {
        loader: 'sass-loader',
      },
    ],
  },
  // SASS support - compile all other .scss files and pipe it to style.css
  {
    test: /^((?!\.global).)*\.(scss|sass)$/,
    use: [
      {
        loader: 'style-loader',
      },
      {
        loader: '@teamsupercell/typings-for-css-modules-loader',
      },
      {
        loader: 'css-loader',
        options: {
          modules: {
            localIdentName: '[name]__[local]__[hash:base64:5]',
          },
          sourceMap: true,
          importLoaders: 1,
        },
      },
      {
        loader: 'sass-loader',
      },
    ],
  },
  // Fonts (webpack 5 asset modules)
  {
    test: /\.(woff2?|otf|ttf|eot)(\?v=\d+\.\d+\.\d+)?$/,
    type: 'asset',
    parser: {
      dataUrlCondition: {
        maxSize: 10000,
      },
    },
  },
  // SVG
  {
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    type: 'asset',
    parser: {
      dataUrlCondition: {
        maxSize: 10000,
      },
    },
  },
  // Common Image Formats
  {
    test: /\.(?:ico|gif|png|jpg|jpeg|webp)$/,
    type: 'asset',
  },
];
