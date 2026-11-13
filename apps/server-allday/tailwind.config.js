module.exports = {
  content: ['./App.jsx', './src/**/*.{js,jsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: { colors: { canvas: '#f7f9fc', ink: '#111b2e', muted: '#71839c', line: '#dfe7f2', brand: '#2563eb', success: '#059669' } } },
  plugins: [],
};
