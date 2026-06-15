const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Allow .md files to be required as static assets (used by useRag.ts)
config.resolver.assetExts.push('md');

module.exports = config;
