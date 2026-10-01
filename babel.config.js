module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Lets Drizzle's generated migrations/migrations.js import raw .sql files.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
