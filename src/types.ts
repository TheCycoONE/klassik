export enum Vehicle {
  None = "none",
  Raft = "raft",
  Ship = "ship",
}

export enum Direction {
  North = "North",
  South = "South",
  East = "East",
  West = "West",
}

export interface TileProperties {
  passible_on_foot?: boolean
  passible_on_raft?: boolean
  passible_on_ship?: boolean
}

export interface Tile {
  name: string
  icon: HTMLImageElement
  properties: TileProperties
}

export interface Persistable {
  readonly saveId: string
  serialize(): string
  deserialize(input: string): void
}

export class MapCoordinate {
  x: number
  y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }
}

export class Player implements Persistable {
  readonly saveId = "player"
  position: MapCoordinate = new MapCoordinate(0, 0)
  vehicle: Vehicle = Vehicle.None

  serialize(): string {
    return JSON.stringify(this)
  }

  deserialize(input: string): void {
    const obj = JSON.parse(input)
    this.position.x = obj.position.x
    this.position.y = obj.position.y
    this.vehicle = obj.vehicle
  }
}
