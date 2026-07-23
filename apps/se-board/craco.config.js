const { CracoAliasPlugin } = require("react-app-alias-ex");

module.exports = {
  plugins: [
    {
      plugin: CracoAliasPlugin,
      options: {
        source: "tsconfig",
        baseUrl: ".",
        tsConfigPath: "./tsconfig.paths.json",
      },
    },
  ],
  webpack: {
    configure: (webpackConfig) => {
      const scopePluginIndex = webpackConfig.resolve.plugins.findIndex(
        ({ constructor }) =>
          constructor && constructor.name === "ModuleScopePlugin"
      );

      webpackConfig.resolve.plugins.splice(scopePluginIndex, 1);

      const eslintPlugin = webpackConfig.plugins.find(
        ({ constructor }) =>
          constructor && constructor.name === "ESLintWebpackPlugin"
      );

      if (eslintPlugin) {
        eslintPlugin.options.cache = false;
      }

      return webpackConfig;
    },
  },
};
