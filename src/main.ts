import {getElemByIdOrThrow, throwExpr} from "./util.ts"
import tile_defs from "./tiles.json" with { type: "json" }

interface CharacterDefinition {
  idx: Symbol,
  src: string
}

interface MapDefinition {
  idx: Symbol,
  src: string
}

interface TileProperties {
  passible_on_foot?: boolean,
  passible_on_raft?: boolean,
  passible_on_ship?: boolean,
  [key: string]: any
}

interface TileDefinition {
  index: string,
  name: string,
  default?: boolean,
  properties: TileProperties
}

interface Tile {
  name: string,
  icon: HTMLImageElement,
  properties: TileProperties
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
const game_log_div = document.createElement('div')

const game_grid_width = game_view.clientWidth / tile_width
const game_grid_height = game_view.clientHeight / tile_height

// Maps
const worldMap = Symbol("worldMap")

// Tiles
const tiles: Map<string, Tile> = new Map()

// Chars
const charIcons: Map<Symbol, HTMLImageElement> = new Map()
const knightChar = Symbol("knightChar")

const VEHICLES = Object.freeze({
  NONE: "none",
  RAFT: "raft",
  SHIP: "ship",
})

enum Direction {
  North = "North",
  South = "South",
  East = "East",
  West = "West"
}

let game_grid_left = 0;
let game_grid_top = 0;

// DOM nodes making the game view window
const game_grid_elements: HTMLElement[][] = [];

// Tile definitions for the game view area
const game_grid_tiles: Tile[][] = [];

let mapBitmap: HTMLImageElement | undefined

let playerIcon: HTMLImageElement | undefined
let playerX: number
let playerY: number
let playerVehicle = VEHICLES.NONE

function loadImageResource(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, _reject) => {
    const img = new Image()
    img.addEventListener('load', () => {
      console.log("Loaded: " + source)
      resolve(img)
    })
    //img.crossOrigin = "anonymous"
    img.src = source
  })
}

async function loadTile(tileDef: TileDefinition) {
  const img = await loadImageResource(`tiles/${tileDef.name}.png`)

  const tile: Tile = {
    icon: img,
    name: tileDef.name,
    properties: tileDef.properties
  }

  tiles.set(tileDef.index, tile)
  if (tileDef.default) {
    tiles.set("default", tile)
  }
}

async function loadChar(charDef: CharacterDefinition) {
  const img = await loadImageResource(charDef.src)
  charIcons.set(charDef.idx, img)
}

async function loadMap(mapDef: MapDefinition) {
  const img = await loadImageResource(mapDef.src)
  mapBitmap = img
}

async function loadTiles() {
  const loadTilePromises = []
  for (let tileDef of tile_defs.tiles) {
     loadTilePromises.push(loadTile(tileDef))
  }
    
  await Promise.all(loadTilePromises)
}

function loadChars() {
  const chars = [
    { idx: knightChar, src: "chars/knight.png" },
  ]

  return Promise.all(chars.map(loadChar))
}

function setupGameView() {
  for (let y = 0; y < game_grid_height; y++) {
    game_grid_elements[y] = []
    game_grid_tiles[y] = []
    for (let x = 0; x < game_grid_width; x++) {
      const elm = document.createElement('div')
      elm.style.position = "relative"
      elm.style.width = "48px"
      elm.style.height = "48px"

      game_grid_elements[y].push(elm)
      game_view.appendChild(elm)
    }
  }
}

function tileAt(x: number, y: number, imgData: ImageData): Tile {
  // rgba
  const offset = (y * imgData.width * 4) + (x * 4)
  const r = imgData.data[offset]
  const g = imgData.data[offset + 1]
  const b = imgData.data[offset + 2]

  const tileIndex = `${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`

  let tile = tiles.get(tileIndex)

  if (tile === undefined) {
    console.log(`Unknown tile at x:${x} y:${y} with index ${tileIndex}`)
    tile = tiles.get("default")
    if (tile === undefined) {
      throw new Error("default tile is not defined")
    }
  }

  return tile
}

function updateGameView() {
  const mmCtx = mini_map_view.getContext('2d') ?? throwExpr("Could not get context for mini-map")

  const mmLeft = playerX - mini_map_view.width / 2
  const mmTop = playerY - mini_map_view.height / 2

  if (mapBitmap) {
    mmCtx.drawImage(
      mapBitmap,
      mmLeft, mmTop,
      mini_map_view.width, mini_map_view.height, 
      0, 0,
      mini_map_view.width, mini_map_view.height)
  } else {
    console.error("Something went wrong: mapBitmap is null")
  }

  const gameGridMiniMapX = mini_map_view.width / 2 - game_grid_width / 2
  const gameGridMiniMapY = mini_map_view.height / 2 - game_grid_height / 2
  const viewImgData = mmCtx.getImageData(gameGridMiniMapX, gameGridMiniMapY, game_grid_width, game_grid_height)

  game_grid_left = mmLeft + gameGridMiniMapX
  game_grid_top = mmTop + gameGridMiniMapY

  mmCtx.beginPath()
  mmCtx.lineWidth = 2
  mmCtx.strokeStyle = "#eee"
  mmCtx.rect(gameGridMiniMapX, gameGridMiniMapY, game_grid_width, game_grid_height)
  mmCtx.stroke()

  // Draw tiles
  for (let y = 0; y < game_grid_height; y++) {
    for (let x = 0; x < game_grid_width; x++) {
      const tile = tileAt(x, y, viewImgData)
      game_grid_tiles[y][x] = tile
      game_grid_elements[y][x].replaceChildren(tile.icon.cloneNode())

      if (debug) {
        const dbgElm = document.createElement('div')
        dbgElm.style.position = "absolute"
        dbgElm.style.top = "0"
        dbgElm.style.left = "0"
        dbgElm.style.fontSize = "8pt"
        dbgElm.style.color = "#fff"
        dbgElm.innerHTML = "x:" + x + " y:" + y
        game_grid_elements[y][x].appendChild(dbgElm)
      }
    }
  }

  // Draw player
  if (playerIcon) {
    game_grid_elements[playerY - game_grid_top][playerX - game_grid_left].replaceChildren(playerIcon)
  }
}

function appendActionToLog(line: string) {
  const line_div = document.createElement('div')
  line_div.appendChild(document.createTextNode(line))
  game_log_div.appendChild(line_div)
  if (game_log_div.children.length > max_log_lines) {
    game_log_div.removeChild(game_log_div.children[0])
  }
  game_log_div.scrollTop = game_log_div.scrollHeight
}

function canPass(x: number, y: number) {
  const props = game_grid_tiles[y - game_grid_top][x - game_grid_left].properties;
  if (playerVehicle === VEHICLES.NONE && !props.passible_on_foot) {
    return false
  }
  return true
}

function move(dir: Direction) {
  let newX = playerX
  let newY = playerY

  switch(dir) {
    case Direction.North:
      newY--
      break
    case Direction.South:
      newY++
      break
    case Direction.West:
      newX--
      break
    case Direction.East:
      newX++
      break
  }

  // TODO: Check passible
  if (canPass(newX, newY)) {
    appendActionToLog(`Move ${dir}: OK`)

    playerX = newX
    playerY = newY
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
    case "\\":
      debug = !debug
      break
    default:
      console.log(`Unmapped key: ${evt.key}`)
  }

  updateGameView()
}

function afterLoad() {
  playerX = player_start_x
  playerY = player_start_y

  game_log_div.style.overflowY = "scroll"
  stats_view.appendChild(game_log_div)

  playerIcon = charIcons.get(knightChar)

  setupGameView()
  updateGameView()

  document.addEventListener('keydown', action)
}

// init
Promise.all([loadTiles(), loadChars(), loadMap({ idx: worldMap, src: "maps/world.png" })]).then(afterLoad)
