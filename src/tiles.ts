import type { TileProperties } from "./types"

export interface TileDefinition {
  index: string
  name: string
  default?: boolean
  properties: TileProperties
}

interface TileDefinitions {
  tiles: TileDefinition[]
}

export default {
  tiles: [
    {
      name: "deep_water",
      index: "0000ff",
      default: true,
      properties: { passible_on_ship: true },
    },
    {
      name: "grass",
      index: "00ff00",
      properties: { passible_on_foot: true, passible_on_horse: true },
    },
    {
      name: "shallow_water",
      index: "00ffff",
      properties: { passible_on_raft: true },
    },
  ],
} as const satisfies TileDefinitions
