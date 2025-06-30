import {
  MapEntity,
  Persistable,
  MapCoordinate,
  DeserializedMapEntity,
} from "./types"
import { hydrateMonster, DeserializedMonster } from "./monsters"
import { hydrateVehicle, DeserializedVehicle } from "./vehicles"

export class MapOverlay implements Persistable {
  readonly saveId: string
  entities: MapEntity[]

  constructor(mapName: string, entities: MapEntity[]) {
    this.saveId = mapName + "-mapOverlay"
    this.entities = entities
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
    this.entities = (obj.entities as DeserializedMapEntity[]).map((e) => {
      if (e.type === "monster") {
        return hydrateMonster(e as DeserializedMonster)
      } else if (e.type === "vehicle") {
        return hydrateVehicle(e as DeserializedVehicle)
      }
      return {
        ...e,
        position: new MapCoordinate(e.position.x, e.position.y),
      } as MapEntity
    })
  }
}
