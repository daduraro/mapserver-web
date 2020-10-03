const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlPlugin = require('html-webpack-plugin');

const PATHS = {
  build: path.join(__dirname, './build')
};

module.exports = {
  entry: './src/main.js',
  output: {
    path: PATHS.build,
    filename: 'main.js',
  },
  devtool: false,
  devServer: {
    port: 3000,
    clientLogLevel: 'none',
    stats: 'errors-only'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      { 
        test: /\.(woff|woff2)$/, 
        use: {
          loader: 'file-loader',
          options: {
            outputPath: 'fonts/',
            name: '[name][hash].[ext]',
          },
        },
      },
      { 
        test: /\.(jpg)$/, 
        use: {
          loader: 'file-loader',
          options: {
            outputPath: 'img/',
            name: '[name][hash].[ext]',
          },
        },
      },
      { 
        test: /favicon\.svg$/, 
        use: {
          loader: 'file-loader',
          options: {
            name: '[name].[ext]'
          },
        },
      },
    ]
  },
  plugins: [
    //new CopyPlugin([{from: 'data', to: 'data'}]),
    new HtmlPlugin({
      template: 'index.html'
    })
  ]
};
