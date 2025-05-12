const { getDefaultConfig } = require('@expo/metro-config');

// Created a Metro configuration for Expo SDK 53 fix
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
