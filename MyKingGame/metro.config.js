const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const defaultGetPolyfills = config.serializer?.getPolyfills;

config.serializer = {
  ...(config.serializer ?? {}),
  getPolyfills: (options) => {
    const base = defaultGetPolyfills ? defaultGetPolyfills(options) : [];
    return [...base, path.resolve(__dirname, 'src/utils/polyfills.js')];
  },
};

module.exports = config;
