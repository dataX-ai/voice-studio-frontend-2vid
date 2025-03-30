const path = require('path');
const webpack = require('webpack');
module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main/main.js',
  target: 'electron-main',
  // Put your normal webpack config below here
  module: {
    rules: [
      ...require('./webpack.rules'),
      {
        test: /\.(bat|sh)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              name: '[name].[ext]'
            }
          }
        ]
      },
      {
        test: /\.node$/,
        loader: 'node-loader'
      }
    ]
  },
  plugins: [
    new webpack.EnvironmentPlugin({
      BACKEND_ENDPOINT: process.env.BACKEND_ENDPOINT || 'http://127.0.0.1:8000',
      DOCKER_IMAGE: process.env.DOCKER_IMAGE || 'voicestudio/model-library:latest'
    }),
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.bat', '.sh', '.node'],
    alias: {
      '@src': path.resolve(__dirname, 'src'),
      '@main': path.resolve(__dirname, 'src/main')
    }
  },
  externals: {
    'electron': 'commonjs2 electron'
  },
  node: {
    __dirname: false,
    __filename: false
  }
};
