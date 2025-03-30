const rules = require('./webpack.rules');
const path = require('path');

module.exports = {
  // Put your normal webpack config below here
  module: {
    rules: [
      ...rules,
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                localIdentName: '[name]__[local]--[hash:base64:5]',
                exportLocalsConvention: 'camelCase',
              },
            },
          },
        ],
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      }
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx', '.css'],
    alias: {
      // Add aliases if needed to help with path resolution
      '@src': path.resolve(__dirname, 'src'),
      '@renderer': path.resolve(__dirname, 'src/renderer'),
      '@preload': path.resolve(__dirname, 'src/preload'),
      '@main': path.resolve(__dirname, 'src/main')
    }
  },
  externals: {
    'electron': 'commonjs2 electron'
  }
};
