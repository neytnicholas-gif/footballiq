import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    files: [
      'app/username/page.tsx',
      'components/career-path-game.tsx',
      'components/choice-quiz.tsx',
      'components/daily-challenge.tsx',
      'components/duel-quiz.tsx',
      'components/higher-lower-game.tsx',
      'components/scout-game.tsx',
      'components/who-am-i-game.tsx',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])