/**
 * Color Palette Definitions for Timeboxxer
 * 
 * Ported from timespace project.
 * Each palette has 12 colors for task color_index (0-11).
 * User's current_palette_id in profiles determines which palette is active.
 */

export interface Palette {
  id: string;
  name: string;
  category: 'vibrant' | 'muted';
  background: string;  // Suggested app background
  border: string;      // Suggested accent/border color
  colors: string[];    // 12 colors for tasks
}

export const PALETTES: Palette[] = [
  {
    id: 'ocean-bold',
    name: 'Ocean Bold',
    category: 'vibrant',
    background: '#0F4C5C',
    border: '#E36414',
    colors: [
      '#0F4C5C', '#1B6B7C', '#27899C', '#E36414',
      '#FB8B24', '#FAA307', '#083D4A', '#5FA8D3',
      '#9E2A2B', '#06303A', '#84D2F6', '#FFBA08'
    ]
  },
  {
    id: 'sunset',
    name: 'Sunset',
    category: 'vibrant',
    background: '#9A3412',
    border: '#CA8A04',
    colors: [
      '#9A3412', '#C2410C', '#EA580C', '#CA8A04',
      '#EAB308', '#FACC15', '#7F1D1D', '#F97316',
      '#FDE047', '#991B1B', '#FDBA74', '#FEF08A'
    ]
  },
  {
    id: 'emerald',
    name: 'Emerald',
    category: 'vibrant',
    background: '#047857',
    border: '#CA8A04',
    colors: [
      '#047857', '#059669', '#10B981', '#CA8A04',
      '#EAB308', '#FACC15', '#065F46', '#34D399',
      '#D97706', '#064E3B', '#6EE7B7', '#FEF08A'
    ]
  },
  {
    id: 'berry-pop',
    name: 'Berry',
    category: 'vibrant',
    background: '#BE185D',
    border: '#D97706',
    colors: [
      '#BE185D', '#DB2777', '#EC4899', '#D97706',
      '#F59E0B', '#FBBF24', '#9D174D', '#F472B6',
      '#EA580C', '#831843', '#FBCFE8', '#FDE68A'
    ]
  },
  {
    id: 'cobalt',
    name: 'Cobalt',
    category: 'vibrant',
    background: '#1D4ED8',
    border: '#C2410C',
    colors: [
      '#1D4ED8', '#2563EB', '#3B82F6', '#C2410C',
      '#EA580C', '#F97316', '#1E40AF', '#60A5FA',
      '#DC2626', '#1E3A8A', '#93C5FD', '#FFEDD5'
    ]
  },
  {
    id: 'sage-clay',
    name: 'Sage & Clay',
    category: 'muted',
    background: '#A3B18A',
    border: '#BC6C25',
    colors: [
      '#A3B18A', '#B5C49C', '#C7D7AE', '#BC6C25',
      '#D4915F', '#DDA15E', '#8B9F6F', '#DAE4C8',
      '#E9C46A', '#6B7F54', '#ECF0E3', '#FEFAE0'
    ]
  },
  {
    id: 'dusty-rose',
    name: 'Dusty Rose',
    category: 'muted',
    background: '#E8B4B8',
    border: '#A26769',
    colors: [
      '#E8B4B8', '#F0C8CB', '#F5D5D7', '#A26769',
      '#B87D7F', '#C99495', '#D9A0A3', '#EFD5D7',
      '#8B5658', '#FAE5E7', '#F8DCDE', '#C4A0A2'
    ]
  },
  {
    id: 'ocean-mist',
    name: 'Ocean Mist',
    category: 'muted',
    background: '#B8C5D6',
    border: '#5A6F7E',
    colors: [
      '#B8C5D6', '#C8D3E1', '#D8E1EC', '#5A6F7E',
      '#6E8394', '#8297AA', '#A4B5C8', '#E4EAF2',
      '#47596A', '#F0F4F8', '#D0DCE8', '#96ABC0'
    ]
  },
  {
    id: 'sand-dune',
    name: 'Sand Dune',
    category: 'muted',
    background: '#D5C4A1',
    border: '#5D4E37',
    colors: [
      '#D5C4A1', '#E2D4B8', '#EFE4CF', '#5D4E37',
      '#7A6B52', '#97886D', '#C1AE8B', '#F5EDE0',
      '#4A3E2C', '#FAF6F0', '#E9DCC8', '#B4A488'
    ]
  },
  {
    id: 'lavender',
    name: 'Lavender',
    category: 'muted',
    background: '#C4B7D2',
    border: '#6B5B7A',
    colors: [
      '#C4B7D2', '#D4C9E2', '#E4DBF2', '#6B5B7A',
      '#7F7090', '#9485A6', '#B3A5C4', '#EFE8F8',
      '#574867', '#F8F5FC', '#DDD2EC', '#A899BC'
    ]
  },
  {
    id: 'nordic',
    name: 'Nordic',
    category: 'muted',
    background: '#F5F1EB',
    border: '#3D7A7A',
    colors: [
      '#F5F1EB', '#EAE4DC', '#DFD7CD', '#3D7A7A',
      '#4D9494', '#5DAEAE', '#E8E2DA', '#D4CCC2',
      '#2D6A6A', '#C9C1B7', '#B8AEA4', '#6DC8C8'
    ]
  }
];

export const DEFAULT_PALETTE_ID = 'ocean-bold';

/**
 * Get a palette by ID, falling back to default if not found
 */
export function getPalette(paletteId: string): Palette {
  return PALETTES.find(p => p.id === paletteId) 
    ?? PALETTES.find(p => p.id === DEFAULT_PALETTE_ID)!;
}

/**
 * Get a specific color from a palette by index
 */
export function getColor(paletteId: string, colorIndex: number): string {
  const palette = getPalette(paletteId);
  const safeIndex = Math.abs(colorIndex) % palette.colors.length;
  return palette.colors[safeIndex];
}

/**
 * Get the next available color index that isn't heavily used
 * @param usedIndices - Array of color indices already in use
 * @returns The least-used color index
 */
export function getNextAvailableColorIndex(usedIndices: number[]): number {
  // Count usage of each index
  const counts = new Array(12).fill(0);
  usedIndices.forEach(idx => {
    const safeIdx = Math.abs(idx) % 12;
    counts[safeIdx]++;
  });
  
  // Find the index with lowest count
  let minCount = Infinity;
  let minIndex = 0;
  counts.forEach((count, idx) => {
    if (count < minCount) {
      minCount = count;
      minIndex = idx;
    }
  });
  
  return minIndex;
}

/**
 * Get all palettes grouped by category
 */
export function getPalettesByCategory(): Record<string, Palette[]> {
  return PALETTES.reduce((acc, palette) => {
    if (!acc[palette.category]) {
      acc[palette.category] = [];
    }
    acc[palette.category].push(palette);
    return acc;
  }, {} as Record<string, Palette[]>);
}
