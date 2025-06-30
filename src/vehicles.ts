import {
  MapEntity,
  Direction,
  MapCoordinate,
  DeserializedMapEntity,
} from "./types"

export type VehicleType = "none" | "raft" | "ship" | "horse"

export interface Vehicle extends MapEntity {
  type: "vehicle"
  vehicleType: Exclude<VehicleType, "none">
}

export type DeserializedVehicle = DeserializedMapEntity & {
  vehicleType: Vehicle["vehicleType"]
}

export function createVehicle(
  id: string,
  vehicleType: Vehicle["vehicleType"],
  position: MapCoordinate,
  direction: Direction,
): Vehicle {
  return {
    id,
    type: "vehicle",
    vehicleType,
    position,
    direction,
  }
}

export function hydrateVehicle(e: DeserializedVehicle): Vehicle {
  const vehicle = createVehicle(
    e.id,
    e.vehicleType,
    new MapCoordinate(e.position.x, e.position.y),
    e.direction,
  )
  vehicle.destroyed = e.destroyed
  return vehicle
}
