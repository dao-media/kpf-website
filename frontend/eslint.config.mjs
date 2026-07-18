import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "public/**"],
  },
  ...nextCoreWebVitals,
];

export default eslintConfig;
