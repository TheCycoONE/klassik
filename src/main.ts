/** @format */

import {
  Direction,
  VehicleType,
  Tile,
  TileProperties,
  Unit,
  MapCoordinate,
  Player,
  Vehicle,
  MapOverlay,
  EntityType,
} from "./types"
import { getElemByIdOrThrow } from "./util"
import tile_defs from "./tiles.json" with { type: "json" }
import unit_defs from "./units.json" with { type: "json" }
import * as SaveManager from "./save-manager"
import * as Intro from "./intro"
import * as Game from "./game"

interface UnitDefinition {
  name: string
  icons: {
    [key in Direction]: {
      prefix: string
      frames?: number
    }
  }
}

interface MapDefinition {
  name: string
  src: string
  entities: Vehicle[]
}

interface TileDefinition {
  index: string
  name: string
  default?: boolean
  properties: TileProperties
}

const player_start_x = 200
const player_start_y = 150

const loading_div = getElemByIdOrThrow("loading", HTMLDivElement)

// Tiles
const tiles: Map<string, Tile> = new Map()
const units: Map<string, Unit> = new Map()

let mapBitmap: HTMLImageElement
let mapOverlay: MapOverlay | undefined

const player: Player = new Player()
SaveManager.registerPersitable(player)

function loadImageResource(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image()
    img.addEventListener("load", () => {
      console.log("Loaded: " + source)
      resolve(img)
    })
    img.src = source
  })
}

async function loadTile(tileDef: TileDefinition) {
  const img = await loadImageResource(`tiles/${tileDef.name}.png`)

  const tile: Tile = {
    icon: img,
    name: tileDef.name,
    properties: tileDef.properties,
  }

  tiles.set(tileDef.index, tile)
  if (tileDef.default) {
    tiles.set("default", tile)
  }
}

async function loadUnit(unitDef: UnitDefinition) {
  // Read all direction icons asyncronously
  const icons = Object.fromEntries(
    await Promise.all(
      Object.values(Direction).map(async (direction) => [
        // entry key (Direction)
        direction,

        // entry value (HTMLImageElement[])
        [
          await loadImageResource(
            `units/${unitDef.icons[direction].prefix}.png`,
          ),
        ],
      ]),
    ),
  )

  const unit: Unit = {
    name: unitDef.name,
    icons,
  }

  units.set(unit.name, unit)
}

async function loadMap(mapDef: MapDefinition) {
  const img = await loadImageResource(mapDef.src)
  mapBitmap = img

  mapOverlay = new MapOverlay(mapDef.name, mapDef.entities)
  SaveManager.registerPersitable(mapOverlay)
}

async function loadTiles() {
  const loadTilePromises = []
  for (const tileDef of tile_defs.tiles) {
    loadTilePromises.push(loadTile(tileDef))
  }

  await Promise.all(loadTilePromises)
}

async function loadUnits() {
  const loadUnitPromises = []
  for (const unitDef of unit_defs.units) {
    loadUnitPromises.push(loadUnit(unitDef))
  }

  await Promise.all(loadUnitPromises)
}

function onIntroClosed(action: Intro.IntroCloseAction): void {
  if (mapOverlay === undefined) {
    throw new Error("mapOverlay should be loaded")
  }

  if (action === Intro.IntroCloseAction.LOAD) {
    SaveManager.load()
  }

  Game.initGame({ player, mapBitmap, mapOverlay, tiles, units })
}

function afterLoad() {
  loading_div.setAttribute("hidden", "")

  Intro.initIntro(player)
  Intro.registerCloseAction(onIntroClosed)

  player.position = new MapCoordinate(player_start_x, player_start_y)
}

// init
Promise.all([
  loadTiles(),
  loadUnits(),
  loadMap({
    name: "world",
    src: "maps/world.png",
    entities: [
      {
        type: EntityType.Vehicle,
        id: "ship_1",
        position: new MapCoordinate(214, 150),
        direction: Direction.West,
        vehicleType: VehicleType.Ship,
      },
      {
        type: EntityType.Vehicle,
        id: "horse_1",
        position: new MapCoordinate(194, 154),
        direction: Direction.East,
        vehicleType: VehicleType.Horse,
      },
      {
        type: EntityType.Vehicle,
        id: "raft_1",
        position: new MapCoordinate(130, 275),
        direction: Direction.North,
        vehicleType: VehicleType.Raft,
      },
    ],
  }),
]).then(afterLoad)
