import { Platform, type ColorValue } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import Ionicons from "@expo/vector-icons/Ionicons";

export type PlatformIconProps = {
  /** SF Symbol name, used on iOS. */
  sf: SymbolViewProps["name"];
  /** Ionicons name, used on web and Android. */
  ion: keyof typeof Ionicons.glyphMap;
  size?: number;
  color: ColorValue;
};

/**
 * Real icons per platform: SF Symbols on iOS, `@expo/vector-icons` everywhere
 * else. The previous build shipped literal text glyphs as icons — see
 * blueprint/06 section 5.
 */
export function PlatformIcon({ sf, ion, size = 24, color }: PlatformIconProps) {
  if (Platform.OS === "ios") {
    return <SymbolView name={sf} size={size} tintColor={color as string} />;
  }
  return <Ionicons name={ion} size={size} color={color as string} />;
}
