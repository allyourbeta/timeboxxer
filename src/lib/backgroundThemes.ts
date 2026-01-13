export const themes = {
  dark: {
    name: 'Dark',
    bgPrimary: '#111827',      // gray-900
    bgSecondary: '#1f2937',    // gray-800
    bgTertiary: '#374151',     // gray-700
    textPrimary: '#ffffff',
    textSecondary: '#9ca3af',  // gray-400
    borderColor: '#374151',    // gray-700
  },
  light: {
    name: 'Light',
    bgPrimary: '#ffffff',
    bgSecondary: '#f3f4f6',    // gray-100
    bgTertiary: '#e5e7eb',     // gray-200
    textPrimary: '#111827',    // gray-900
    textSecondary: '#6b7280',  // gray-500
    borderColor: '#d1d5db',    // gray-300
  },
} as const

export type Theme = keyof typeof themes