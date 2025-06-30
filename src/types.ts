/** @format */

export type VehicleType = "none" | "raft" | "ship" | "horse"

export type Direction = "north" | "south" | "east" | "west"

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
  icons: {
    [key in Direction]: HTMLImageElement[]
  }
}

export type EntityType = "vehicle" | "monster"

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
  x: number
  y: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
  }

  clone(): MapCoordinate {
    return new MapCoordinate(this.x, this.y)
  }

  equals(o: MapCoordinate): boolean {
    return this.x === o.x && this.y === o.y
  }
}

export type Sex = "male" | "female"

export class Player implements Persistable, CombatParticipant {
  static readonly LVL_TABLE = [
    { xp: 0, maxHp: 100 },
    { xp: 100, maxHp: 110 },
    { xp: 200, maxHp: 130 },
    { xp: 300, maxHp: 150 },
    { xp: 500, maxHp: 170 },
    { xp: 800, maxHp: 200 },
    { xp: 1300, maxHp: 250 },
    { xp: 2000, maxHp: 300 },
    { xp: 3300, maxHp: 500 },
    { xp: 5400, maxHp: 800 },
    { xp: 8800, maxHp: 999 },
  ]

  readonly saveId = "player"
  position: MapCoordinate = new MapCoordinate(0, 0)
  vehicle: VehicleType = "none"
  lastMoveDirection: Direction = "south"

  name: string = "Player"
  sex: Sex = "male"

  // stats
  hp: number = 100
  xp: number = 0
  level: number = 1
  strength: number = 10
  agility: number = 10
  intelligence: number = 10
  luck: number = 10

  get maxHp(): number {
    return Player.LVL_TABLE[this.level - 1].maxHp
  }

  canLevelUp(): boolean {
    if (this.level === Player.LVL_TABLE.length - 1) {
      // max level
      return false
    }
    return this.xp >= Player.LVL_TABLE[this.level + 1].xp
  }

  serialize(): string {
    return JSON.stringify(this)
  }

  deserialize(input: string): void {
    const obj = JSON.parse(input)
    this.position.x = obj.position.x
    this.position.y = obj.position.y
    this.lastMoveDirection = obj.lastMoveDirection
    this.vehicle = obj.vehicle

    this.name = obj.name
    this.sex = obj.sex

    this.hp = obj.hp
    this.xp = obj.xp
    this.level = obj.level
    this.strength = obj.strength
    this.agility = obj.agility
    this.intelligence = obj.intelligence
    this.luck = obj.luck
  }

  attack(target: CombatParticipant): void {
    target.defend(this.strength)
  }

  defend(damage: number): void {
    this.hp -= damage
    if (this.hp < 0) this.hp = 0
  }
}

export interface CombatParticipant {
  attack(target: CombatParticipant): void
  defend(damage: number): void
}

export type DeserializedMapEntity = Omit<MapEntity, "position"> & {
  position: { x: number; y: number }
}
