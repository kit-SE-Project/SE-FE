module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_PUBLIC_SEBOARD_SSO_ENABLED === 'true' ? '/allday' : '',
  },
});
