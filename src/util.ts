/** @format */

export function throwExpr(s: string): never {
  throw new Error(s)
}

export function getElemByIdOrThrow<T extends HTMLElement>(
  elementId: string,
  clazz: { new (): T },
): T {
  const elm = document.getElementById(elementId)
  if (elm === null) {
    throw new Error(`Expected element with id ${elementId} but got null`)
  }
  if (!(elm instanceof clazz)) {
    throw new Error(
      `Expected element with id ${elementId} is not of type ${clazz.name}.`,
    )
  }
  return elm
}
