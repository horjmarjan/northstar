export const colors = {
  bg: '#F2EBE0',           // warm cream
  card: '#FFFFFF',          // clean white cards
  cardBorder: '#E0ECEC',   // soft teal-tinted border
  primary: '#5E9BA0',      // dusty teal
  primaryDim: '#E8F4F5',   // very soft teal tint
  blue: '#6B8FD4',         // soft periwinkle — sub-goals & links
  teal: '#4AABA8',         // slightly brighter teal — accents
  text: '#1A1714',         // near-black warm tone
  muted: '#A09890',        // warm gray
  success: '#52B788',      // sage green
  danger: '#8B6B4A',       // warm brown — destructive actions, no red
  inputBg: '#F7F2EC',      // warm light input background
};

// Gradient pairs — use with expo-linear-gradient
export const gradients = {
  primary: ['#5E9BA0', '#7EC5BF'] as const,   // teal → seafoam (horizontal, for buttons)
  focus:   ['#4A8A90', '#5E9BA0'] as const,   // deeper teal → dusty teal (for banners)
  card:    ['#EAF6F6', '#F2FAFA'] as const,   // whisper teal tint (for subtle card headers)
};

export const spacing = {
  xs: 4,
  sm: 10,
  md: 18,
  lg: 28,
  xl: 40,
  xxl: 56,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
