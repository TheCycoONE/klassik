import { getElemByIdOrThrow, throwExpr } from "./util"
import {
  Direction,
  MapCoordinate,
  Player,
  Unit,
  Tile,
  VehicleType,
} from "./types"
import { Vehicle } from "./vehicles"
import type { UnitName } from "./units"
import * as SaveManager from "./save-manager"
import { playAttackSound, playWalkSound, playGallopSound } from "./sounds"
import { Monster } from "./monsters"
import { MapOverlay } from "./map-overlay"

class GameGridCoordinate {
  x: number
  y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
}

const tile_width = 48
const tile_height = 48
const map_view_width_px = 672
const map_view_height_px = 480
const max_log_lines = 100

const game_div = getElemByIdOrThrow("game", HTMLDivElement)
const game_log_div = getElemByIdOrThrow("game-log", HTMLDivElement)
const map_view = getElemByIdOrThrow("map-view", HTMLDivElement)
const mini_map_view = getElemByIdOrThrow("mini-map", HTMLCanvasElement)
const player_name_span = getElemByIdOrThrow("player-name", HTMLSpanElement)
const hp_span = getElemByIdOrThrow("hp", HTMLSpanElement)
const maxHp_span = getElemByIdOrThrow("maxHp", HTMLSpanElement)
const xp_span = getElemByIdOrThrow("xp", HTMLSpanElement)
const level_span = getElemByIdOrThrow("level", HTMLSpanElement)
const strength_span = getElemByIdOrThrow("strength", HTMLSpanElement)
const agility_span = getElemByIdOrThrow("agility", HTMLSpanElement)
const intelligence_span = getElemByIdOrThrow("intelligence", HTMLSpanElement)
const luck_span = getElemByIdOrThrow("luck", HTMLSpanElement)

const game_grid_width = map_view_width_px / tile_width
const game_grid_height = map_view_height_px / tile_height

let game_grid_left = 0
let game_grid_top = 0

let turn = 0;

// DOM nodes making the game view window
const game_grid_elements: HTMLElement[][] = []

// Tile definitions for the game view area
const game_grid_tiles: Tile[][] = []

let mapBitmap: HTMLImageElement | undefined
let mapOverlay: MapOverlay | undefined
let player: Player
let debug = false
let tiles: Map<string, Tile>
let units: Map<UnitName, Unit>
let attackMode = false
let monsterActionPhase = false

export interface GameInitParams {
  player: Player
  mapBitmap: HTMLImageElement
  mapOverlay: MapOverlay
  tiles: Map<string, Tile>
  units: Map<UnitName, Unit>
}

export function initGame(params: GameInitParams) {
  player = params.player
  mapBitmap = params.mapBitmap
  mapOverlay = params.mapOverlay
  tiles = params.tiles
  units = params.units

  game_div.removeAttribute("hidden")
  document.addEventListener("keydown", action)

  setupGameView()
  updateStats()
  updateMapView()
}

function setupGameView() {
  for (let y = 0; y < game_grid_height; y++) {
    game_grid_elements[y] = []
    game_grid_tiles[y] = []
    for (let x = 0; x < game_grid_width; x++) {
      const elm = document.createElement("div")
      elm.className = "game-grid-tile"

      game_grid_elements[y].push(elm)
      map_view.appendChild(elm)
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

function updateMapView() {
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
    if (entity.type === "vehicle") {
      icon = getVehicleUnit((entity as Vehicle).vehicleType, false)?.icons[
        entity.direction
      ][0]
    } else if (entity.type === "monster") {
      const monster = entity as Monster
      const unit = units.get(monster.monsterType)
      if (unit) {
        icon = unit.icons[monster.direction][0]
      }
    }
    if (icon) {
      game_grid_elements[entity.position.y - game_grid_top][
        entity.position.x - game_grid_left
      ].appendChild(icon)
    }
  }

  // Draw player
  game_grid_elements[player.position.y - game_grid_top][
    player.position.x - game_grid_left
  ].appendChild(getPlayerIcon())
}

function updateStats() {
  player_name_span.textContent = player.name
  hp_span.textContent = "" + player.hp
  maxHp_span.textContent = "" + player.maxHp
  xp_span.textContent = "" + player.xp
  level_span.textContent = "" + player.level
  strength_span.textContent = "" + player.strength
  agility_span.textContent = "" + player.agility
  intelligence_span.textContent = "" + player.intelligence
  luck_span.textContent = "" + player.luck
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

function appendToLastAction(line: string) {
  const lastLine = game_log_div.lastElementChild
  if (lastLine) {
    lastLine.textContent += " " + line
  }
}

function canPass(mapCoord: MapCoordinate, withVehicle: VehicleType) {
  const props =
    game_grid_tiles[mapCoord.y - game_grid_top]?.[mapCoord.x - game_grid_left]
      ?.properties
  if (!props) {
    // Tile is not found / out of bounds.
    return false;
  }

  const entity = mapOverlay?.entityAt(mapCoord)
  if (entity?.type === "monster") {
    return false
  }
  if (withVehicle === "none") {
    if (props.passible_on_foot) {
      return true
    }
    if (entity?.type === "vehicle") {
      return true
    }
    return false
  } else if (withVehicle === "horse") {
    return props.passible_on_horse
  } else if (withVehicle === "raft") {
    return props.passible_on_raft
  } else if (withVehicle === "ship") {
    return props.passible_on_ship
  }
  return true
}

function board() {
  if (player.vehicle === "none") {
    const entity = mapOverlay?.entityAt(player.position)
    if (!entity || entity.type !== "vehicle") {
      appendActionToLog("Board: Nothing here")
      return
    }

    entity.destroyed = true
    player.vehicle = (entity as Vehicle).vehicleType
    appendActionToLog("Board: OK")
  } else {
    const ve: Vehicle = {
      id: player.vehicle + "_" + window.crypto.randomUUID(),
      type: "vehicle",
      position: player.position.clone(),
      direction: player.lastMoveDirection,
      vehicleType: player.vehicle,
    }
    mapOverlay?.entities.push(ve)
    player.vehicle = "none"

    appendActionToLog("Unboard")
  }
}

async function move(dir: Direction) {
  const newPosition = player.position.clone()

  switch (dir) {
    case "north":
      newPosition.y--
      break
    case "south":
      newPosition.y++
      break
    case "west":
      newPosition.x--
      break
    case "east":
      newPosition.x++
      break
  }

  if (canPass(newPosition, player.vehicle)) {
    if (player.vehicle === "none") {
      await playWalkSound()
    } else if (player.vehicle === "horse") {
      await playGallopSound()
    }
    appendActionToLog(`Move ${dir}: OK`)

    player.position = newPosition
    player.lastMoveDirection = dir
  } else {
    appendActionToLog(`Move ${dir}: Blocked`)
  }
}

async function attackEffect(targetPos: MapCoordinate) {
  await playAttackSound()
  const gridX = targetPos.x - game_grid_left
  const gridY = targetPos.y - game_grid_top
  const tileElem = game_grid_elements[gridY]?.[gridX]
  if (tileElem) {
    tileElem.classList.add("attack-effect")
    setTimeout(() => tileElem.classList.remove("attack-effect"), 120)
  }
}

async function handleAttack(dir: Direction, targetPos: MapCoordinate) {
  const entity = mapOverlay?.entityAt(targetPos)
  if (entity?.type === "monster") {
    await attackEffect(entity.position)
    const monster = entity as Monster
    player.attack(monster)
    // Mark monster as destroyed if its hp is 0 or less
    if (monster.hp <= 0) {
      monster.destroyed = true
      appendToLastAction(`${dir}: Monster defeated!`)
    } else {
      appendToLastAction(`${dir}: Monster HP: ${monster.hp}/${monster.maxHp}`)
    }
  } else {
    appendToLastAction(`${dir}: Nothing there.`)
  }
}

async function monstersAction() {
  if (!mapOverlay) return
  monsterActionPhase = true

  const gridTopLeft = new MapCoordinate(game_grid_left, game_grid_top)
  const gridBottomRight = new MapCoordinate(
    game_grid_left + game_grid_width - 1,
    game_grid_top + game_grid_height - 1,
  )

  const monsters = (
    mapOverlay.entitiesInRect(gridTopLeft, gridBottomRight) as Monster[]
  ).filter((e) => e.type === "monster" && !e.destroyed)
  for (const monster of monsters) {
    await monsterAction(monster as Monster)
  }
  monsterActionPhase = false
}

async function monsterAction(monster: Monster) {
  if (!mapOverlay) return

  const directions: Direction[] = ["north", "south", "east", "west"]
  const deltas = {
    north: { x: 0, y: -1 },
    south: { x: 0, y: 1 },
    west: { x: -1, y: 0 },
    east: { x: 1, y: 0 },
  }

  let attack: boolean = false
  let bestDir: Direction | undefined
  if (monster.mood === "aggressive") {
    // Move toward player
    let minDist =
      Math.abs(monster.position.x - player.position.x) +
      Math.abs(monster.position.y - player.position.y)
    for (const dir of directions) {
      const dx = deltas[dir].x
      const dy = deltas[dir].y
      const newPos = new MapCoordinate(
        monster.position.x + dx,
        monster.position.y + dy,
      )
      // Only move if passable and not occupied
      if (canPass(newPos, "none") && !mapOverlay.entityAt(newPos)) {
        const dist =
          Math.abs(newPos.x - player.position.x) +
          Math.abs(newPos.y - player.position.y)
        if (dist < minDist) {
          minDist = dist
          bestDir = dir
        }
      }
    }
    if (minDist === 0) {
      attack = true
    }
  } else if (monster.mood === "frightened") {
    let maxDist =
      Math.abs(monster.position.x - player.position.x) +
      Math.abs(monster.position.y - player.position.y)
    for (const dir of directions) {
      const dx = deltas[dir].x
      const dy = deltas[dir].y
      const newPos = new MapCoordinate(
        monster.position.x + dx,
        monster.position.y + dy,
      )
      if (canPass(newPos, "none") && !mapOverlay.entityAt(newPos)) {
        const dist =
          Math.abs(newPos.x - player.position.x) +
          Math.abs(newPos.y - player.position.y)
        if (dist > maxDist) {
          maxDist = dist
          bestDir = dir
        }
      }
    }
  } else if (monster.mood === "neutral") {
    const shuffled = directions.slice().sort(() => Math.random() - 0.5)
    for (const dir of shuffled) {
      const dx = deltas[dir].x
      const dy = deltas[dir].y
      const newPos = new MapCoordinate(
        monster.position.x + dx,
        monster.position.y + dy,
      )
      if (canPass(newPos, "none") && !mapOverlay.entityAt(newPos)) {
        bestDir = dir
        break
      }
    }
  }
  if (attack) {
    monster.attack(player)
    appendActionToLog(`The ${monster.monsterType} attacks you!`)
    await attackEffect(player.position)
    await new Promise((resolve) => setTimeout(resolve, 500))
  } else if (bestDir && !monster.sentinel) {
    monster.position.x += deltas[bestDir].x
    monster.position.y += deltas[bestDir].y
    monster.direction = bestDir
    updateMapView()
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
}

async function action(evt: KeyboardEvent) {
  if (evt.defaultPrevented) {
    return
  }
  if (monsterActionPhase) {
    evt.preventDefault()
    return
  }

  let playerTurnEnded = false

  if (attackMode) {
    let dir: Direction | undefined
    const targetPos = player.position.clone()
    switch (evt.key) {
      case "ArrowDown":
        dir = "south"
        targetPos.y++
        break
      case "ArrowUp":
        dir = "north"
        targetPos.y--
        break
      case "ArrowLeft":
        dir = "west"
        targetPos.x--
        break
      case "ArrowRight":
        dir = "east"
        targetPos.x++
        break
      default:
        attackMode = false
        appendToLastAction("cancelled.")
        return
    }
    await handleAttack(dir, targetPos)
    attackMode = false
    playerTurnEnded = true
  } else {
    switch (evt.key) {
      case "a":
        appendActionToLog("Attack")
        attackMode = true
        break
      case "ArrowDown":
        playerTurnEnded = true
        await move("south")
        break
      case "ArrowUp":
        playerTurnEnded = true
        await move("north")
        break
      case "ArrowLeft":
        playerTurnEnded = true
        await move("west")
        break
      case "ArrowRight":
        playerTurnEnded = true
        await move("east")
        break
      case "b":
        playerTurnEnded = true
        board()
        break
      case " ":
        playerTurnEnded = true
        appendActionToLog("Wait")
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
          updateStats()
          appendActionToLog("Loaded")
        } else {
          appendActionToLog("No save data available")
        }
        break
      default:
        console.log(`Unmapped key: ${evt.key}`)
    }
  }
  updateMapView()
  if (playerTurnEnded) {
    await monstersAction()
    updateStats()
    turn++;
  }
}

function getVehicleUnitName(
  vehicle: VehicleType,
  inUse: boolean,
): UnitName | undefined {
  switch (vehicle) {
    case "none":
      return "knight"
    case "raft":
      return inUse ? "full_raft" : "empty_raft"
    case "ship":
      return inUse ? "full_ship" : "empty_ship"
    case "horse":
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
