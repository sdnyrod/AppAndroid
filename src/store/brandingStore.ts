import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "@/services/api";

const BRANDING_CACHE_KEY = "crew_tenant_branding";

export interface TenantBranding {
  id: number;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  businessType: string;
  tagline: string | null;
}

// Generate tonal palette from a hex color (for Material Expressive)
function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function generateTonalPalette(hex: string) {
  const [h, s] = hexToHsl(hex);
  return {
    // Surface tones (dark mode)
    surface: hslToHex(h, Math.min(s, 20), 8),
    surfaceContainer: hslToHex(h, Math.min(s, 25), 12),
    surfaceContainerHigh: hslToHex(h, Math.min(s, 25), 16),
    surfaceContainerHighest: hslToHex(h, Math.min(s, 25), 20),
    // Primary tones
    primary: hex,
    primaryContainer: hslToHex(h, Math.min(s, 40), 20),
    onPrimaryContainer: hslToHex(h, Math.min(s, 80), 80),
    // Muted/subtle
    outline: hslToHex(h, Math.min(s, 15), 30),
    outlineVariant: hslToHex(h, Math.min(s, 10), 20),
    // Glass tint (for iOS)
    glassTint: `${hex}18`, // 10% opacity
    glassBorder: `${hex}30`, // 19% opacity
    glassHighlight: `${hex}40`, // 25% opacity
  };
}

interface BrandingStore {
  branding: TenantBranding | null;
  palette: ReturnType<typeof generateTonalPalette> | null;
  isLoading: boolean;
  fetchBranding: () => Promise<void>;
  reset: () => void;
}

const DEFAULT_BRANDING: TenantBranding = {
  id: 0,
  name: "CREW",
  logoUrl: null,
  primaryColor: "#3B82F6",
  secondaryColor: "#1E40AF",
  accentColor: "#10B981",
  businessType: "general_construction",
  tagline: null,
};

export const useBrandingStore = create<BrandingStore>((set, get) => ({
  branding: null,
  palette: null,
  isLoading: true,

  fetchBranding: async () => {
    set({ isLoading: true });
    
    // Try cache first for instant display
    try {
      const cached = await AsyncStorage.getItem(BRANDING_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as TenantBranding;
        set({
          branding: parsed,
          palette: generateTonalPalette(parsed.primaryColor),
          isLoading: false,
        });
      }
    } catch {
      // Cache miss, continue to API
    }

    // Fetch fresh from API
    try {
      const tenant = await apiClient.get<any>("tenants.getCurrent");
      if (tenant) {
        const branding: TenantBranding = {
          id: tenant.id,
          name: tenant.name || "CREW",
          logoUrl: tenant.logoUrl || null,
          primaryColor: tenant.primaryColor || "#3B82F6",
          secondaryColor: tenant.secondaryColor || "#1E40AF",
          accentColor: tenant.accentColor || "#10B981",
          businessType: tenant.businessType || "general_construction",
          tagline: tenant.tagline || null,
        };
        set({
          branding,
          palette: generateTonalPalette(branding.primaryColor),
          isLoading: false,
        });
        // Cache for next launch
        await AsyncStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(branding));
      } else {
        set({ branding: DEFAULT_BRANDING, palette: generateTonalPalette(DEFAULT_BRANDING.primaryColor), isLoading: false });
      }
    } catch {
      // If API fails and no cache, use defaults
      if (!get().branding) {
        set({ branding: DEFAULT_BRANDING, palette: generateTonalPalette(DEFAULT_BRANDING.primaryColor), isLoading: false });
      }
    }
  },

  reset: () => {
    set({ branding: null, palette: null, isLoading: true });
    AsyncStorage.removeItem(BRANDING_CACHE_KEY).catch(() => {});
  },
}));
