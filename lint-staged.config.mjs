// ponytail: minimal lint-staged config — ESLint only, no prettier
const config = {
  "*.{ts,tsx,js,jsx,mjs}": ["eslint --fix --report-unused-disable-directives --max-warnings 0"],
};

export default config;
