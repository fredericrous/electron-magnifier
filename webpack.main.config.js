const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  /**
   * This is the main entry point for your application, it's the first file
   * that runs in the main process.
   */
  entry: './src/main.js',
  // Put your normal webpack config below here
  module: {
    rules: require('./webpack.rules'),
  },
  devServer: {
    contentBase: './dist',
    hot: true,
  },
  devtool: 'source-map',
  plugins: [ 'assets' ].map(asset => new CopyWebpackPlugin({
    patterns: [
        {
          from: path.resolve(__dirname, asset),
          to: path.resolve(__dirname, '.webpack/main', asset)
        }
    ]
  }))
};
