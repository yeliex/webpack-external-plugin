const defaultLoader = require('./libs/loader');

module.exports = {
  filename: 'load-[name].js',
  externals: [],
  loader: defaultLoader,
  cdnPath: 'https://unpkg.com/[package]@[version]',
  hash: true
};
