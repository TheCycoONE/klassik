/** @format */

export enum VehicleType {
  None = "none",
  Raft = "raft",
  Ship = "ship",
  Horse = "horse",
}

export enum Direction {
  North = "North",
  South = "South",
  East = "East",
  West = "West",
}

export interface TileProperties {
  passible_on_foot?: boolean
  passible_on_horse?: boolean
  passible_on_raft?: boolean
  passible_on_ship?: boolean
}

export interface Tile {
  name: string
  icon: HTMLImageElement
  properties: TileProperties
}

export interface Unit {
  name: string
  icons: {
    [key in Direction]: HTMLImageElement[]
  }
}

export enum EntityType {
  Vehicle,
}

export interface Vehicle extends MapEntity {
  type: EntityType.Vehicle
  vehicleType: VehicleType
}

export interface MapEntity {
  id: string
  type: EntityType
  position: MapCoordinate
  destroyed?: boolean
  direction: Direction
}

export interface Persistable {
  readonly saveId: string
  serialize(): string
  deserialize(input: string): void
}

export class MapCoordinate {
  constructor(
    public x: number,
    public y: number,
  ) {}

  clone(): MapCoordinate {
    return new MapCoordinate(this.x, this.y)
  }

  equals(o: MapCoordinate): boolean {
    return this.x === o.x && this.y === o.y
  }
}

export class Player implements Persistable {
  readonly saveId = "player"
  position: MapCoordinate = new MapCoordinate(0, 0)
  vehicle: VehicleType = VehicleType.None
  lastMoveDirection: Direction = Direction.South

  serialize(): string {
    return JSON.stringify(this)
  }

  deserialize(input: string): void {
    const obj = JSON.parse(input)
    this.position.x = obj.position.x
    this.position.y = obj.position.y
    this.lastMoveDirection = obj.lastMoveDirection
    this.vehicle = obj.vehicle
  }
}

export class MapOverlay implements Persistable {
  readonly saveId: string

  constructor(
    mapName: string,
    public entities: MapEntity[],
  ) {
    this.saveId = mapName + "-mapOverlay"
  }

  entityAt(mapCoord: MapCoordinate): MapEntity | undefined {
    for (const entity of this.entities) {
      if (mapCoord.equals(entity.position) && !entity.destroyed) {
        return entity
      }
    }
    return undefined
  }

  entitiesInRect(
    topLeft: MapCoordinate,
    bottomRight: MapCoordinate,
  ): MapEntity[] {
    return this.entities.filter(
      (e) =>
        !e.destroyed &&
        e.position.x >= topLeft.x &&
        e.position.y >= topLeft.y &&
        e.position.x <= bottomRight.x &&
        e.position.y <= bottomRight.y,
    )
  }

  serialize(): string {
    return JSON.stringify(this)
  }

  deserialize(input: string): void {
    const obj = JSON.parse(input)
    this.entities = obj.entities
  }
}
