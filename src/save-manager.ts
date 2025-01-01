/** @format */

import { Persistable } from "./types"

const persistables: Persistable[] = []

export function registerPersitable(persistable: Persistable) {
  persistables.push(persistable)
}

export function save() {
  const data = Object.create({})
  for (const p of persistables) {
    data[p.saveId] = p.serialize()
  }
  localStorage.setItem("saveData", JSON.stringify(data))
}

export function load(): boolean {
  const dataStr = localStorage.getItem("saveData")
  if (dataStr === null) {
    return false
  }

  const data = JSON.parse(dataStr)
  for (const p of persistables) {
    if (data[p.saveId]) {
      p.deserialize(data[p.saveId])
    }
  }

  return true
}
