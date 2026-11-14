const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const config = getDefaultConfig(__dirname);
const H = path.join(__dirname, 'harness');
const map = {
  'expo-sqlite': 'sqlite.js',
  'react-native-purchases': 'purchases-sdk.js',
  'expo-notifications': 'notifications.js',
  'expo-store-review': 'stubs.js',
  'expo-print': 'stubs.js',
  'expo-sharing': 'stubs.js',
  'expo-file-system': 'stubs.js',
  'expo-haptics': 'stubs.js',
  '@react-native-community/datetimepicker': 'picker.js',
  'react-native-safe-area-context': 'safearea.js',
};
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const from = context.originModulePath || '';
  if (map[moduleName] && !from.startsWith(H)) return { type: 'sourceFile', filePath: path.join(H, map[moduleName]) };
  if (/^\.\.?\/(\.\.\/)?purchases$/.test(moduleName) && from.includes(`${path.sep}src${path.sep}`)) return { type: 'sourceFile', filePath: path.join(H, 'app-purchases.js') };
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
