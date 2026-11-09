import { Color, DataTexture, NearestFilter, RGBAFormat } from "three";

export type SoundKind = "stone" | "wood" | "glass" | "metal" | "soft" | "dirt";

export interface Material {
  name: string;
  color: Color;
  /** Multiplies the distance in blast tests: higher resists more. Infinity is indestructible. */
  hardness: number;
  /** Per-voxel brightness variation, 0 to 0.3. */
  jitter: number;
  /** Relative density used for rigid body mass (water = 1). */
  density: number;
  sound: SoundKind;
  emissive: number;
}

export const MATERIALS: Material[] = [];

function def(
  name: string,
  hex: number,
  hardness: number,
  jitter: number,
  density: number,
  sound: SoundKind,
  emissive = 0,
): number {
  const id = MATERIALS.length;
  MATERIALS.push({
    name,
    color: new Color(hex),
    hardness,
    jitter,
    density,
    sound,
    emissive,
  });
  return id;
}

/** Material ids. 0 is air. */
export const M = {
  AIR: def("air", 0x000000, 0, 0, 0, "soft"),
  BEDROCK: def("bedrock", 0x2b2b30, Number.POSITIVE_INFINITY, 0.15, 3, "stone"),
  DIRT: def("dirt", 0x6b4a2f, 1, 0.18, 1.5, "dirt"),
  GRASS: def("grass", 0x5fa83c, 1, 0.16, 1.4, "dirt"),
  GRASS_DARK: def("grass_dark", 0x4c9132, 1, 0.16, 1.4, "dirt"),
  GRAVEL: def("gravel", 0x9a9184, 1, 0.22, 1.6, "dirt"),
  SAND: def("sand", 0xd9c48f, 0.9, 0.12, 1.5, "dirt"),
  WATER: def("water", 0x3f88c5, 0.5, 0.06, 1, "soft"),
  ASPHALT: def("asphalt", 0x3d3f45, 1.4, 0.12, 2.2, "stone"),
  ROAD_LINE: def("road_line", 0xf2d24b, 1.4, 0.06, 2.2, "stone"),
  ROAD_WHITE: def("road_white", 0xeeeeea, 1.4, 0.05, 2.2, "stone"),
  SIDEWALK: def("sidewalk", 0xb9b6ad, 1.3, 0.08, 2.2, "stone"),
  CURB: def("curb", 0x8f8c84, 1.5, 0.08, 2.3, "stone"),
  CONCRETE: def("concrete", 0x9a978f, 1.6, 0.08, 2.4, "stone"),
  CONCRETE_DARK: def("concrete_dark", 0x6e6c67, 1.6, 0.08, 2.4, "stone"),
  STONE: def("stone", 0x85827b, 1.7, 0.18, 2.5, "stone"),
  MARBLE: def("marble", 0xe7e3dc, 1.5, 0.05, 2.6, "stone"),
  BRICK_A: def("brick_a", 0xa8432f, 1.2, 0.08, 1.9, "stone"),
  BRICK_B: def("brick_b", 0x8f3626, 1.2, 0.08, 1.9, "stone"),
  BRICK_C: def("brick_c", 0xb85a3a, 1.2, 0.08, 1.9, "stone"),
  BRICK_GREY: def("brick_grey", 0x7d7a76, 1.25, 0.1, 1.9, "stone"),
  MORTAR: def("mortar", 0xd8cfbf, 1.1, 0.05, 1.8, "stone"),
  PLASTER: def("plaster", 0xf1e6cc, 1.1, 0.04, 1.6, "stone"),
  PLASTER_BLUE: def("plaster_blue", 0x9cc3d9, 1.1, 0.04, 1.6, "stone"),
  PLASTER_YELLOW: def("plaster_yellow", 0xe9c873, 1.1, 0.04, 1.6, "stone"),
  PLASTER_PINK: def("plaster_pink", 0xe3a59a, 1.1, 0.04, 1.6, "stone"),
  PLASTER_GREEN: def("plaster_green", 0xa9c79a, 1.1, 0.04, 1.6, "stone"),
  WALLPAPER: def("wallpaper", 0xdfe8de, 1, 0.03, 1.4, "stone"),
  WALLPAPER_WARM: def("wallpaper_warm", 0xf0d9b8, 1, 0.03, 1.4, "stone"),
  TILE_WHITE: def("tile_white", 0xf2f2ee, 1.2, 0.03, 2, "stone"),
  TILE_BLACK: def("tile_black", 0x2e2e33, 1.2, 0.03, 2, "stone"),
  FRAME: def("frame", 0xf7f7f2, 0.9, 0.03, 0.8, "wood"),
  FRAME_DARK: def("frame_dark", 0x3a3d42, 1.2, 0.03, 2.7, "metal"),
  GLASS: def("glass", 0x9fd4ec, 0.35, 0.05, 2.5, "glass"),
  GLASS_DARK: def("glass_dark", 0x4f7f99, 0.35, 0.04, 2.5, "glass"),
  DOOR: def("door", 0x6e3f22, 1, 0.08, 0.7, "wood"),
  WOOD_LIGHT: def("wood_light", 0xd2a874, 0.9, 0.1, 0.6, "wood"),
  PLANKS: def("planks", 0xb4834f, 0.9, 0.1, 0.6, "wood"),
  PLANKS_DARK: def("planks_dark", 0x74502e, 0.9, 0.1, 0.7, "wood"),
  ROOF_A: def("roof_a", 0x7b2d26, 1, 0.08, 1.8, "stone"),
  ROOF_B: def("roof_b", 0x5e211d, 1, 0.08, 1.8, "stone"),
  ROOF_SLATE: def("roof_slate", 0x454b55, 1.1, 0.08, 2.2, "stone"),
  ROOF_TAR: def("roof_tar", 0x2f3034, 1.2, 0.1, 1.5, "stone"),
  TRUNK: def("trunk", 0x5b3d24, 1.1, 0.12, 0.8, "wood"),
  LEAVES_A: def("leaves_a", 0x3f8f35, 0.5, 0.2, 0.3, "soft"),
  LEAVES_B: def("leaves_b", 0x2f7a2c, 0.5, 0.2, 0.3, "soft"),
  LEAVES_C: def("leaves_c", 0xd98a2b, 0.5, 0.2, 0.3, "soft"),
  HEDGE: def("hedge", 0x2d6b2a, 0.6, 0.18, 0.4, "soft"),
  FLOWER_RED: def("flower_red", 0xe0303a, 0.4, 0.1, 0.3, "soft"),
  FLOWER_YELLOW: def("flower_yellow", 0xf5c731, 0.4, 0.1, 0.3, "soft"),
  FLOWER_PURPLE: def("flower_purple", 0x8e5cc7, 0.4, 0.1, 0.3, "soft"),
  FENCE: def("fence", 0xf4f1ea, 0.7, 0.04, 0.6, "wood"),
  METAL: def("metal", 0x3c4148, 1.8, 0.05, 7.8, "metal"),
  METAL_RED: def("metal_red", 0xb7322c, 1.8, 0.05, 7.8, "metal"),
  METAL_YELLOW: def("metal_yellow", 0xe0b22a, 1.8, 0.05, 7.8, "metal"),
  METAL_GREEN: def("metal_green", 0x2f6b4a, 1.8, 0.05, 7.8, "metal"),
  CHROME: def("chrome", 0xc9ced4, 1.6, 0.04, 7.8, "metal"),
  BRASS: def("brass", 0xd4a83a, 1.4, 0.05, 8.5, "metal"),
  LAMP: def("lamp", 0xfff2b0, 0.4, 0.02, 2.5, "glass", 1.4),
  NEON_PINK: def("neon_pink", 0xff4fa3, 0.4, 0.02, 2.5, "glass", 1.6),
  NEON_CYAN: def("neon_cyan", 0x47e5ff, 0.4, 0.02, 2.5, "glass", 1.6),
  TAIL_LIGHT: def("tail_light", 0xd8202a, 0.8, 0.04, 2.5, "glass", 0.8),
  SOFA: def("sofa", 0x3d6fa8, 0.6, 0.06, 0.4, "soft"),
  FABRIC_GREEN: def("fabric_green", 0x4f8a5b, 0.6, 0.06, 0.4, "soft"),
  FABRIC_YELLOW: def("fabric_yellow", 0xe8b93c, 0.6, 0.06, 0.4, "soft"),
  RUG: def("rug", 0xa8323e, 0.6, 0.1, 0.4, "soft"),
  BED: def("bed", 0xe9e4f0, 0.6, 0.04, 0.4, "soft"),
  PILLOW: def("pillow", 0xffffff, 0.5, 0.02, 0.2, "soft"),
  TABLE: def("table", 0x8a5a33, 0.9, 0.08, 0.7, "wood"),
  SHED: def("shed", 0x8c6239, 0.9, 0.08, 0.6, "wood"),
  PATH: def("path", 0x8f8a80, 1.3, 0.14, 2.3, "stone"),
  CAR_BLUE: def("car_blue", 0x2f7fd0, 1.5, 0.03, 3, "metal"),
  CAR_RED: def("car_red", 0xc8332b, 1.5, 0.03, 3, "metal"),
  CAR_YELLOW: def("car_yellow", 0xf0c12e, 1.5, 0.03, 3, "metal"),
  CAR_WHITE: def("car_white", 0xe8e8e4, 1.5, 0.03, 3, "metal"),
  TIRE: def("tire", 0x1d1d20, 1.4, 0.05, 1.2, "soft"),
  AWNING_RED: def("awning_red", 0xc8322f, 0.6, 0.04, 0.4, "soft"),
  AWNING_WHITE: def("awning_white", 0xf3efe6, 0.6, 0.04, 0.4, "soft"),
  SIGN_GREEN: def("sign_green", 0x1f7a4d, 1, 0.03, 1.5, "metal"),
  PRODUCT_RED: def("product_red", 0xe23b3b, 0.5, 0.15, 0.5, "soft"),
  PRODUCT_BLUE: def("product_blue", 0x3b6ee2, 0.5, 0.15, 0.5, "soft"),
  PRODUCT_ORANGE: def("product_orange", 0xf08a24, 0.5, 0.15, 0.5, "soft"),
  PRODUCT_GREEN: def("product_green", 0x5cc24a, 0.5, 0.15, 0.5, "soft"),
  BOOKS: def("books", 0x7a4a8c, 0.6, 0.25, 0.7, "wood"),
  RUBBER: def("rubber", 0x26272b, 1.2, 0.05, 1.2, "soft"),
  SIGNAL_GREEN: def("signal_green", 0x36d070, 0.4, 0.02, 2.5, "glass", 1.5),
  SIGNAL_AMBER: def("signal_amber", 0xf0a020, 0.4, 0.02, 2.5, "glass", 1.5),
  BARK_MULCH: def("bark_mulch", 0x5a3d26, 0.8, 0.3, 0.6, "dirt"),
  FLOWER_WHITE: def("flower_white", 0xf4f4f0, 0.4, 0.06, 0.3, "soft"),
  BIRCH_BARK: def("birch_bark", 0xe8e4dc, 1.1, 0.14, 0.8, "wood"),
  DUCK_GREEN: def("duck_green", 0x1f5a3a, 0.4, 0.05, 0.5, "soft"),
  MIRROR: def("mirror", 0xd9e2e8, 0.35, 0.02, 2.5, "glass"),
} as const;

/** 256 x 2 texture: row 0 holds sRGB color and jitter, row 1 the emissive strength. */
export function createPaletteTexture(): DataTexture {
  const data = new Uint8Array(256 * 2 * 4);
  MATERIALS.forEach((m, i) => {
    const c = m.color.clone().convertLinearToSRGB();
    data[i * 4] = Math.round(c.r * 255);
    data[i * 4 + 1] = Math.round(c.g * 255);
    data[i * 4 + 2] = Math.round(c.b * 255);
    data[i * 4 + 3] = Math.round(Math.min(1, m.jitter / 0.3) * 255);
    data[(256 + i) * 4] = Math.round(Math.min(1, m.emissive / 2) * 255);
  });
  const texture = new DataTexture(data, 256, 2, RGBAFormat);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.needsUpdate = true;
  return texture;
}
