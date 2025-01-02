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
import { getElemByIdOrThrow, throwExpr } from "./util"
import tile_defs from "./tiles.json" with { type: "json" }
import unit_defs from "./units.json" with { type: "json" }
import * as SaveManager from "./save-manager"

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

class GameGridCoordinate {
  x: number
  y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
}

let debug = false

const tile_width = 48
const tile_height = 48

const max_log_lines = 100

const player_start_x = 200
const player_start_y = 150

const game_view = getElemByIdOrThrow("game-view", HTMLDivElement)
const stats_view = getElemByIdOrThrow("stats", HTMLDivElement)
const mini_map_view = getElemByIdOrThrow("mini-map", HTMLCanvasElement)
const game_log_div = document.createElement("div")

const game_grid_width = game_view.clientWidth / tile_width
const game_grid_height = game_view.clientHeight / tile_height

// Tiles
const tiles: Map<string, Tile> = new Map()
const units: Map<string, Unit> = new Map()

let game_grid_left = 0
let game_grid_top = 0

// DOM nodes making the game view window
const game_grid_elements: HTMLElement[][] = []

// Tile definitions for the game view area
const game_grid_tiles: Tile[][] = []

let mapBitmap: HTMLImageElement | undefined
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

function setupGameView() {
  for (let y = 0; y < game_grid_height; y++) {
    game_grid_elements[y] = []
    game_grid_tiles[y] = []
    for (let x = 0; x < game_grid_width; x++) {
      const elm = document.createElement("div")
      elm.style.position = "relative"
      elm.style.width = "48px"
      elm.style.height = "48px"

      game_grid_elements[y].push(elm)
      game_view.appendChild(elm)
    }
  }
}

function tileAt(xy: GameGridCoordinate, imgData: ImageData): Tile {
  // rgba
  const offset = xy.y * imgData.width * 4 + xy.x * 4
  const r = imgData.data[offset]
  const g = imgData.data[offset + 1]
  const b = imgData.data[offset + 2]

  const tileIndex = `${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`

  let tile = tiles.get(tileIndex)

  if (tile === undefined) {
    console.log(`Unknown tile at x:${xy.x} y:${xy.y} with index ${tileIndex}`)
    tile = tiles.get("default")
    if (tile === undefined) {
      throw new Error("default tile is not defined")
    }
  }

  return tile
}

function updateGameView() {
  const mmCtx =
    mini_map_view.getContext("2d") ??
    throwExpr("Could not get context for mini-map")

  const mmLeft = player.position.x - mini_map_view.width / 2
  const mmTop = player.position.y - mini_map_view.height / 2

  if (mapBitmap) {
    mmCtx.drawImage(
      mapBitmap,
      mmLeft,
      mmTop,
      mini_map_view.width,
      mini_map_view.height,
      0,
      0,
      mini_map_view.width,
      mini_map_view.height,
    )
  } else {
    console.error("Something went wrong: mapBitmap is null")
  }

  const gameGridMiniMapX = mini_map_view.width / 2 - game_grid_width / 2
  const gameGridMiniMapY = mini_map_view.height / 2 - game_grid_height / 2
  const viewImgData = mmCtx.getImageData(
    gameGridMiniMapX,
    gameGridMiniMapY,
    game_grid_width,
    game_grid_height,
  )

  game_grid_left = mmLeft + gameGridMiniMapX
  game_grid_top = mmTop + gameGridMiniMapY

  mmCtx.beginPath()
  mmCtx.lineWidth = 2
  mmCtx.strokeStyle = "#eee"
  mmCtx.rect(
    gameGridMiniMapX,
    gameGridMiniMapY,
    game_grid_width,
    game_grid_height,
  )
  mmCtx.stroke()

  // Draw tiles
  for (let y = 0; y < game_grid_height; y++) {
    for (let x = 0; x < game_grid_width; x++) {
      const gridCoord = new GameGridCoordinate(x, y)

      const tile = tileAt(gridCoord, viewImgData)
      game_grid_tiles[y][x] = tile
      game_grid_elements[y][x].replaceChildren(tile.icon.cloneNode())

      if (debug) {
        const dbgElm = document.createElement("div")
        dbgElm.style.position = "absolute"
        dbgElm.style.top = "0"
        dbgElm.style.left = "0"
        dbgElm.style.fontSize = "8pt"
        dbgElm.style.color = "#fff"
        dbgElm.innerHTML =
          "x:" + (game_grid_left + x) + "<br>y:" + (game_grid_top + y)
        game_grid_elements[y][x].appendChild(dbgElm)
      }
    }
  }

  // Draw entities (vehicles, monsters, npcs, etc.)
  const gridTopLeft = new MapCoordinate(game_grid_left, game_grid_top)
  const gridBottomRight = new MapCoordinate(
    game_grid_left + game_grid_width - 1,
    game_grid_top + game_grid_height - 1,
  )
  for (const entity of mapOverlay?.entitiesInRect(
    gridTopLeft,
    gridBottomRight,
  ) ?? []) {
    let icon
    if (entity.type === EntityType.Vehicle) {
      icon = getVehicleUnit((entity as Vehicle).vehicleType, false)?.icons[
        entity.direction
      ][0]
    }
    if (icon) {
      game_grid_elements[entity.position.y - game_grid_top][
        entity.position.x - game_grid_left
      ].replaceChildren(icon)
    }
  }

  // Draw player
  game_grid_elements[player.position.y - game_grid_top][
    player.position.x - game_grid_left
  ].replaceChildren(getPlayerIcon())
}

function appendActionToLog(line: string) {
  const line_div = document.createElement("div")
  line_div.appendChild(document.createTextNode(line))
  game_log_div.appendChild(line_div)
  if (game_log_div.children.length > max_log_lines) {
    game_log_div.removeChild(game_log_div.children[0])
  }
  game_log_div.scrollTop = game_log_div.scrollHeight
}

function canPass(mapCoord: MapCoordinate, withVehicle: VehicleType) {
  const props =
    game_grid_tiles[mapCoord.y - game_grid_top][mapCoord.x - game_grid_left]
      .properties
  if (withVehicle === VehicleType.None) {
    if (props.passible_on_foot) {
      return true
    }
    if (mapOverlay?.entityAt(mapCoord)?.type === EntityType.Vehicle) {
      return true
    }
    return false
  } else if (withVehicle === VehicleType.Horse) {
    return props.passible_on_horse
  } else if (withVehicle === VehicleType.Raft) {
    return props.passible_on_raft
  } else if (withVehicle === VehicleType.Ship) {
    return props.passible_on_ship
  }
  return true
}

function board() {
  if (player.vehicle === VehicleType.None) {
    const entity = mapOverlay?.entityAt(player.position)
    if (!entity || entity.type !== EntityType.Vehicle) {
      appendActionToLog("Board: Nothing here")
      return
    }

    entity.destroyed = true
    player.vehicle = (entity as Vehicle).vehicleType
    appendActionToLog("Board: OK")
  } else {
    const ve: Vehicle = {
      id: player.vehicle + "_" + window.crypto.randomUUID(),
      type: EntityType.Vehicle,
      position: player.position.clone(),
      direction: player.lastMoveDirection,
      vehicleType: player.vehicle,
    }
    mapOverlay?.entities.push(ve)
    player.vehicle = VehicleType.None

    appendActionToLog("Unboard")
  }
}

function move(dir: Direction) {
  const newPosition = player.position.clone()

  switch (dir) {
    case Direction.North:
      newPosition.y--
      break
    case Direction.South:
      newPosition.y++
      break
    case Direction.West:
      newPosition.x--
      break
    case Direction.East:
      newPosition.x++
      break
  }

  // TODO: Check passible
  if (canPass(newPosition, player.vehicle)) {
    appendActionToLog(`Move ${dir}: OK`)

    player.position = newPosition
    player.lastMoveDirection = dir
  } else {
    appendActionToLog(`Move ${dir}: Blocked`)
  }
}

function action(evt: KeyboardEvent) {
  if (evt.defaultPrevented) {
    return
  }

  switch (evt.key) {
    case "ArrowDown":
      move(Direction.South)
      break
    case "ArrowUp":
      move(Direction.North)
      break
    case "ArrowLeft":
      move(Direction.West)
      break
    case "ArrowRight":
      move(Direction.East)
      break
    case "b":
      board()
      break
    case "\\":
      debug = !debug
      break
    case "s":
      SaveManager.save()
      appendActionToLog("Game Saved")
      break
    case "l":
      if (SaveManager.load()) {
        appendActionToLog("Loaded")
      } else {
        appendActionToLog("No save data available")
      }
      break
    default:
      console.log(`Unmapped key: ${evt.key}`)
  }

  updateGameView()
}

function getVehicleUnitName(
  vehicle: VehicleType,
  inUse: boolean,
): string | undefined {
  switch (vehicle) {
    case VehicleType.None:
      return "knight"
    case VehicleType.Raft:
      return inUse ? "full_raft" : "empty_raft"
    case VehicleType.Ship:
      return inUse ? "full_ship" : "empty_ship"
    case VehicleType.Horse:
      return inUse ? "full_horse" : "empty_horse"
  }
}

function getVehicleUnit(
  vehicle: VehicleType,
  inUse: boolean,
): Unit | undefined {
  const unitName = getVehicleUnitName(vehicle, inUse)
  if (!unitName) {
    return
  }
  return units.get(unitName)
}

function getPlayerIcon(): HTMLImageElement {
  const unit: Unit | undefined = getVehicleUnit(player.vehicle, true)

  if (unit === undefined) {
    throw new Error(
      `Expected player with vehicle ${player.vehicle} to have a unit`,
    )
  }

  return unit.icons[player.lastMoveDirection][0]
}

function afterLoad() {
  player.position = new MapCoordinate(player_start_x, player_start_y)

  game_log_div.style.overflowY = "scroll"
  stats_view.appendChild(game_log_div)

  setupGameView()
  updateGameView()

  document.addEventListener("keydown", action)
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
