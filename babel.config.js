module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@/modules': './modules',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
