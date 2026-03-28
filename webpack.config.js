//const webpack = require('webpack');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { plugin } = require('typescript-eslint');

console.log('build start', new Date().toLocaleString('ja-JP'));

const gameConfig = (env, argv) => {
  const dev = argv.mode === 'development';
  return {
    stats: 'minimal', // Keep console output easy to read.
    entry: {
      bundle: './src/main.ts', // Your program entry point
    },

    // Your build destination
    output: {
      path: path.resolve(__dirname, 'js'),
      filename: '[name].js',
    },

    // Config for your testing server
    devServer: {
      compress: true,
      static: {
        directory: __dirname,
      },
      client: {
        logging: 'warn',
        overlay: {
          errors: true,
          warnings: false,
        },
        progress: true,
      },
      port: 1234,
      host: '0.0.0.0',
    },

    // Web games are bigger than pages, disable the warnings that our game is too big.
    performance: { hints: false },

    // Enable sourcemaps while debugging
    devtool: dev ? 'source-map' : false,

    // Minify the code when making a final build
    optimization: {
      minimize: !dev,
      minimizer: [
        new TerserPlugin({
          exclude: 'lib/',
          terserOptions: {
            ecma: 2023,
            compress: { drop_console: true },
            output: { comments: false, beautify: false, ascii_only: false },
          },
        }),
      ],
    },

    // Explain webpack how to do Typescript
    module: {
      rules: [
        {
          test: /\.ts(x)?$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },

    plugins: dev ? [
      // Copy our static assets to the final build
      new CopyPlugin({
        patterns: [{ from: 'static/' }],
      }),

      // Make an index.html from the template
      new HtmlWebpackPlugin({
            filename: '../index.html',
            template: 'src/index.ejs',
            hash: true,
            minify: false,
            inject: 'body',
          }),
       new HtmlWebpackPlugin({
            filename: '../index_test.html',
            template: 'src/index_test.ejs',
            hash: true,
            minify: false,
            inject: 'body',
          })
    ] : [
      // Copy our static assets to the final build
      new CopyPlugin({
        patterns: [{ from: 'static/' }],
      }),
      new HtmlWebpackPlugin({
            filename: '../index.html',
            template: 'src/index.ejs',
            hash: true,
            minify: true,
            inject: 'body',
          }),
    ],
  };
};

const configConfig = (env, argv) => {
  const dev = argv.mode === 'development';
  return {
    stats: 'minimal', // Keep console output easy to read.
    entry: {
      bundle_config: './src_config/main.ts', // Your program entry point
    },

    // Your build destination
    output: {
      path: path.resolve(__dirname, 'js_config'),
      filename: '[name].js',
    },

    // Config for your testing server
    devServer: {
      compress: true,
      static: {
        directory: __dirname,
      },
      client: {
        logging: 'warn',
        overlay: {
          errors: true,
          warnings: false,
        },
        progress: true,
      },
      port: 1234,
      host: '0.0.0.0',
    },

    // Web games are bigger than pages, disable the warnings that our game is too big.
    performance: { hints: false },

    // Enable sourcemaps while debugging
    devtool: dev ? 'source-map' : false,

    // Minify the code when making a final build
    optimization: {
      minimize: !dev,
      minimizer: [
        new TerserPlugin({
          exclude: 'lib/',
          terserOptions: {
            ecma: 2023,
            compress: { drop_console: true },
            output: { comments: false, beautify: false, ascii_only: false },
          },
        }),
      ],
    },

    // Explain webpack how to do Typescript
    module: {
      rules: [
        {
          test: /\.ts(x)?$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },

    plugins: [
      // Configはデバッグモードなし
      new HtmlWebpackPlugin({
        filename: '../index_config.html',
        template: 'src_config/index_config.ejs',
        hash: true,
        minify: true,
        inject: 'body',
      }),
    ],
  };
};

module.exports = (env, argv) => {
  const configs = [];
  if (env.buildGame) {
    configs.push(gameConfig(env, argv));
    console.log('レンダープロセスゲームをビルド対象にします');
  }
  if (env.buildConfig) {
    configs.push(configConfig(env, argv));
    console.log('レンダープロセスコンフィッグをビルド対象にします');
  }
  if (configs.length >= 2) {
    console.log('フルビルドします');
  }

  return configs;
};
