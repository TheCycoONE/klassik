import {
  MapEntity,
  Direction,
  MapCoordinate,
  CombatParticipant,
  DeserializedMapEntity,
} from "./types"

export type MonsterType = "thief"
export type MonsterMood = "aggressive" | "neutral" | "frightened"

/**
 * Represents a monster or enemy in the game.
 */
export interface Monster extends MapEntity, CombatParticipant {
  monsterType: MonsterType
  hp: number
  maxHp: number
  strength: number
  agility: number

  /// If true the monster will not move
  sentinel: boolean
  mood: MonsterMood
}

export type DeserializedMonster = DeserializedMapEntity & {
  monsterType: MonsterType
  hp: number
  maxHp: number
  strength: number
  agility: number
  sentinel: boolean
  mood: MonsterMood
}

export function createThiefMonster(
  id: string,
  position: MapCoordinate,
  direction: Direction = "south",
  sentinel: boolean,
  mood: MonsterMood = "aggressive",
): Monster {
  return {
    id,
    type: "monster",
    position,
    direction,
    sentinel,
    mood,
    monsterType: "thief",
    hp: 30,
    maxHp: 30,
    strength: 12,
    agility: 15,
    attack(target: CombatParticipant): void {
      target.defend(this.strength)
    },
    defend(damage: number): void {
      this.hp -= damage
      if (this.hp < 0) this.hp = 0
    },
  }
}

export function hydrateMonster(e: DeserializedMonster): Monster {
  let monster: Monster
  if (e.monsterType === "thief") {
    monster = createThiefMonster(
      e.id,
      new MapCoordinate(e.position.x, e.position.y),
      e.direction,
      e.sentinel,
      e.mood ?? "aggressive",
    )
  } else {
    throw new Error(`Unknown monsterType: ${e.monsterType}`)
  }
  monster.hp = e.hp ?? monster.hp
  monster.maxHp = e.maxHp ?? monster.maxHp
  monster.strength = e.strength ?? monster.strength
  monster.agility = e.agility ?? monster.agility
  monster.destroyed = e.destroyed
  return monster
}
