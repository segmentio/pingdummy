var path = require('path');
var autoprefixer = require('autoprefixer');
var webpack = require('webpack');

module.exports = {
  cache: true,
  entry: [
    'tether',
    'bootstrap-loader',
  ],
  output: {
    path: path.join(__dirname, 'public', 'assets'),
    filename: 'app.js',
    publicPath: '/assets/',
  },
  resolve: {
    extensions: [ '', '.js' ]
  },

  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
    new webpack.ProvidePlugin({
      "window.Tether": "tether"
    }),
  ],

  module: {
    loaders: [
      { test: /\.css$/, loaders: [ 'style', 'css', 'postcss' ] },
      { test: /\.scss$/, loaders: [ 'style', 'css', 'postcss', 'sass' ] },
      {
        test: /\.woff2?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: "url?limit=10000"
      },
      {
        test: /\.(ttf|eot|svg)(\?[\s\S]+)?$/,
        loader: 'file'
      }
    ],
  },

  postcss: [ autoprefixer ],
}
