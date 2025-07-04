import { Direction } from "./types"

export type UnitName =
  | "empty_horse"
  | "full_horse"
  | "empty_raft"
  | "full_raft"
  | "empty_ship"
  | "full_ship"
  | "knight"
  | "thief"

export interface UnitDefinition {
  name: UnitName
  icons: {
    [key in Direction]: {
      prefix: string
      frames?: number
    }
  }
}

interface UnitDefinitions {
  units: UnitDefinition[]
}

export default {
  units: [
    {
      name: "empty_horse",
      icons: {
        north: { prefix: "empty_horse_east" },
        east: { prefix: "empty_horse_east" },
        south: { prefix: "empty_horse_west" },
        west: { prefix: "empty_horse_west" },
      },
    },
    {
      name: "full_horse",
      icons: {
        north: { prefix: "full_horse_east" },
        east: { prefix: "full_horse_east" },
        south: { prefix: "full_horse_west" },
        west: { prefix: "full_horse_west" },
      },
    },
    {
      name: "empty_raft",
      icons: {
        north: { prefix: "empty_raft" },
        east: { prefix: "empty_raft" },
        south: { prefix: "empty_raft" },
        west: { prefix: "empty_raft" },
      },
    },
    {
      name: "full_raft",
      icons: {
        north: { prefix: "full_raft" },
        east: { prefix: "full_raft" },
        south: { prefix: "full_raft" },
        west: { prefix: "full_raft" },
      },
    },
    {
      name: "empty_ship",
      icons: {
        north: { prefix: "empty_ship_north" },
        east: { prefix: "empty_ship_east" },
        south: { prefix: "empty_ship_south" },
        west: { prefix: "empty_ship_west" },
      },
    },
    {
      name: "full_ship",
      icons: {
        north: { prefix: "full_ship_north" },
        east: { prefix: "full_ship_east" },
        south: { prefix: "full_ship_south" },
        west: { prefix: "full_ship_west" },
      },
    },
    {
      name: "knight",
      icons: {
        north: { prefix: "knight" },
        east: { prefix: "knight" },
        south: { prefix: "knight" },
        west: { prefix: "knight" },
      },
    },
    {
      name: "thief",
      icons: {
        north: { prefix: "thief_west" },
        east: { prefix: "thief_east" },
        south: { prefix: "thief_east" },
        west: { prefix: "thief_west" },
      },
    },
  ],
} as const satisfies UnitDefinitions
