export const backgroundThemes = {
  midnight: {
    name: 'Midnight',
    bgPrimary: '#111827',
    bgSecondary: '#1f2937',
    bgTertiary: '#374151',
  },
  slate: {
    name: 'Slate',
    bgPrimary: '#0f172a',
    bgSecondary: '#1e293b',
    bgTertiary: '#334155',
  },
  ocean: {
    name: 'Ocean',
    bgPrimary: '#0c1929',
    bgSecondary: '#152238',
    bgTertiary: '#1e3a5f',
  },
  paper: {
    name: 'Paper',
    bgPrimary: '#faf7f2',
    bgSecondary: '#f0ebe3',
    bgTertiary: '#e6e0d4',
  },
  snow: {
    name: 'Snow',
    bgPrimary: '#ffffff',
    bgSecondary: '#f8fafc',
    bgTertiary: '#f1f5f9',
  },
} as const

export type BackgroundTheme = keyof typeof backgroundThemes