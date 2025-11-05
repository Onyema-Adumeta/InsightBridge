# Update the postcss config file
@"
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
export default config;
"@ | Set-Content postcss.config.mjs