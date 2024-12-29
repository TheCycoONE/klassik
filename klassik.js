"use strict"

const debug = true

const tile_width = 48
const tile_height = 48

const max_log_lines = 100

const game_view = document.getElementById("game-view")
const stats_view = document.getElementById("stats")
const mini_map_view = document.getElementById("mini-map")
const game_log_div = document.createElement('div')

const game_grid_width = game_view.clientWidth / tile_width
const game_grid_height = game_view.clientHeight / tile_height

// Maps
const worldMap = Symbol("worldMap")

// Tiles
const tileIcons = new Map()
const grassTile = Symbol("grassTile")
const deepWaterTile = Symbol("deepWaterTile")
const shallowWaterTile = Symbol("shallowWaterTile")

// Chars
const charIcons = new Map()
const knightChar = Symbol("knightChar")

const game_grid = [];

let currentMap = worldMap
let mapBitmap

let playerIcon
let playerX
let playerY

function loadImageResource(source) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => {
      console.log("Loaded: " + source)
      resolve(img)
    })
    //img.crossOrigin = "anonymous"
    img.src = source
  })
}

async function loadTile(tileDef) {
  const img = await loadImageResource(tileDef.src)
  tileIcons.set(tileDef.idx, img)
}

async function loadChar(charDef) {
  const img = await loadImageResource(charDef.src)
  charIcons.set(charDef.idx, img)
}

async function loadMap(mapDef) {
  const img = await loadImageResource(mapDef.src)
  mapBitmap = img
}

function loadTiles() {
  const tiles = [
    { idx: grassTile, src: "tiles/grass.png" },
    { idx: deepWaterTile, src: "tiles/deep_water.png" },
    { idx: shallowWaterTile, src: "tiles/shallow_water.png" },
  ]

  return Promise.all(tiles.map(loadTile))
}

function loadChars() {
  const chars = [
    { idx: knightChar, src: "chars/knight.png" },
  ]

  return Promise.all(chars.map(loadChar))
}

function setupGameView() {
  for (let y = 0; y < game_grid_height; y++) {
    game_grid[y] = []
    for (let x = 0; x < game_grid_width; x++) {
      const tile = document.createElement('div')
      tile.style.position = "relative"
      tile.style.width = "48px"
      tile.style.height = "48px"
      game_grid[y].push(tile)
      game_view.appendChild(tile)
    }
  }
}

function tileAt(x, y, imgData) {
  const offset = (y * imgData.width * 4) + (x * 4)
  const r = imgData.data[offset]
  const g = imgData.data[offset + 1]
  const b = imgData.data[offset + 2]
  const a = imgData.data[offset + 3]

  if (r === 0 && g === 255 && b === 0 && a === 255) {
    return tileIcons.get(grassTile)
  } else if (r === 0 && g === 0 && b === 255 && a === 255) {
    return tileIcons.get(deepWaterTile)
  } else if (r === 0 && g === 255 && b === 255 && a === 255) {
    return tileIcons.get(shallowWaterTile)
  } else {
    console.log(`Unknown tile at x:${x} y:${y} with r:${r} g:${g} b:${b} a:${a}`)
    return tileIcons.get(deepWaterTile)
  }
}

function updateGameView() {
  const mmCtx = mini_map_view.getContext('2d')
  mmCtx.drawImage(
    mapBitmap,
    playerX - mini_map_view.width / 2, playerY - mini_map_view.height / 2,
    mini_map_view.width, mini_map_view.height, 
    0, 0,
    mini_map_view.width, mini_map_view.height) 

  const player_tile_y = game_grid_height / 2
  const player_tile_x = game_grid_width / 2
  const view_top_y = playerY - player_tile_y
  const view_left_x = playerX - player_tile_x

  const gameGridMiniMapX = mini_map_view.width / 2 - game_grid_width / 2
  const gameGridMiniMapY = mini_map_view.height / 2 - game_grid_height / 2
  const viewImgData = mmCtx.getImageData(gameGridMiniMapX, gameGridMiniMapY, game_grid_width, game_grid_height)

  mmCtx.beginPath()
  mmCtx.lineWidth = "2"
  mmCtx.strokeStyle = "#eee"
  mmCtx.rect(gameGridMiniMapX, gameGridMiniMapY, game_grid_width, game_grid_height)
  mmCtx.stroke()

  for (let y = 0; y < game_grid_height; y++) {
    for (let x = 0; x < game_grid_width; x++) {
      const tile = tileAt(x, y, viewImgData)
      game_grid[y][x].replaceChildren(tile.cloneNode())

      if (debug) {
        const dbgElm = document.createElement('div')
        dbgElm.style.position = "absolute"
        dbgElm.style.top = "0"
        dbgElm.style.left = "0"
        dbgElm.style.fontSize = "8pt"
        dbgElm.style.color = "#fff"
        dbgElm.innerHTML = "x:" + x + " y:" + y
        game_grid[y][x].appendChild(dbgElm)
      }
    }
  }
}

function appendActionToLog(line) {
  const line_div = document.createElement('div')
  line_div.appendChild(document.createTextNode(line))
  game_log_div.appendChild(line_div)
  if (game_log_div.children.length > max_log_lines) {
    game_log_div.removeChild(game_log_div.firstElementChild)
  }
  game_log_div.scrollTop = game_log_div.scrollHeight
}

function move(dir) {
  let newX = playerX
  let newY = playerY

  switch(dir) {
    case "North":
      newY--
      break
    case "South":
      newY++
      break
    case "West":
      newX--
      break
    case "East":
      newX++
      break
  }

  // TODO: Check passible
  
  appendActionToLog(`Move ${dir}: OK`)

  playerX = newX
  playerY = newY
}

function action(evt) {
  if (evt.defaultPrevented) {
    return
  }

  switch (evt.key) {
    case "ArrowDown":
      move("South")
      break
    case "ArrowUp":
      move("North")
      break
    case "ArrowLeft":
      move("West")
      break
    case "ArrowRight":
      move("East")
      break
  }

  updateGameView()
}

function afterLoad() {
  playerX = 100
  playerY = 100
  mini_map_view.appendChild(mapBitmap)

  game_log_div.style.overflowY = "scroll"
  stats_view.appendChild(game_log_div)

  setupGameView()
  updateGameView()

  document.addEventListener('keydown', action)
}

// init
Promise.all([loadTiles(), loadChars(), loadMap({ idx: worldMap, src: "maps/world.png" })]).then(afterLoad)

