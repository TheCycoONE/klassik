/** @format */

import { Tile, Unit, MapCoordinate, Player, Vehicle, MapOverlay } from "./types"
import { getElemByIdOrThrow } from "./util"
import TileDefs, { TileDefinition } from "./tiles"
import UnitDefs, { UnitDefinition, UnitName } from "./units"
import * as SaveManager from "./save-manager"
import * as Intro from "./intro"
import * as Game from "./game"

interface MapDefinition {
  name: string
  src: string
  entities: Vehicle[]
}

const player_start_x = 200
const player_start_y = 150

const loading_div = getElemByIdOrThrow("loading", HTMLDivElement)

// Tiles
const tiles: Map<string, Tile> = new Map()
const units: Map<UnitName, Unit> = new Map()

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
      (["north", "east", "south", "west"] as const).map(async (direction) => [
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
    icons,
  }

  units.set(unitDef.name, unit)
}

async function loadMap(mapDef: MapDefinition) {
  const img = await loadImageResource(mapDef.src)
  mapBitmap = img

  mapOverlay = new MapOverlay(mapDef.name, mapDef.entities)
  SaveManager.registerPersitable(mapOverlay)
}

async function loadTiles() {
  const loadTilePromises = []
  for (const tileDef of TileDefs.tiles) {
    loadTilePromises.push(loadTile(tileDef))
  }

  await Promise.all(loadTilePromises)
}

async function loadUnits() {
  const loadUnitPromises = []
  for (const unitDef of UnitDefs.units) {
    loadUnitPromises.push(loadUnit(unitDef))
  }

  await Promise.all(loadUnitPromises)
}

function onIntroClosed(action: Intro.IntroCloseAction): void {
  if (mapOverlay === undefined) {
    throw new Error("mapOverlay should be loaded")
  }

  if (action === "load") {
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
        type: "vehicle",
        id: "ship_1",
        position: new MapCoordinate(214, 150),
        direction: "west",
        vehicleType: "ship",
      },
      {
        type: "vehicle",
        id: "horse_1",
        position: new MapCoordinate(194, 154),
        direction: "east",
        vehicleType: "horse",
      },
      {
        type: "vehicle",
        id: "raft_1",
        position: new MapCoordinate(130, 275),
        direction: "north",
        vehicleType: "raft",
      },
    ],
  }),
]).then(afterLoad)
