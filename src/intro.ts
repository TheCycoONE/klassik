import { getElemByIdOrThrow } from "./util"
import { Player, Sex } from "./types"

export enum IntroCloseAction {
  LOAD,
  NEW_GAME,
}

const pg1 = getElemByIdOrThrow("intro-page-1", HTMLDivElement)
const pg2 = getElemByIdOrThrow("intro-page-2", HTMLDivElement)

const intro = getElemByIdOrThrow("intro", HTMLDivElement)
const new_btn = getElemByIdOrThrow("intro-new-game", HTMLButtonElement)
const load_btn = getElemByIdOrThrow("intro-load-game", HTMLButtonElement)
const start_game_btn = getElemByIdOrThrow("intro-start-game", HTMLButtonElement)
const remaining_skill_points_span = getElemByIdOrThrow(
  "intro-remaining-skill-points",
  HTMLSpanElement,
)
const name_input = getElemByIdOrThrow("intro-player-name", HTMLInputElement)
const sex_input_male = getElemByIdOrThrow(
  "intro-player-sex-m",
  HTMLInputElement,
)
const str_input = getElemByIdOrThrow("intro-strength", HTMLInputElement)
const agi_input = getElemByIdOrThrow("intro-agility", HTMLInputElement)
const int_input = getElemByIdOrThrow("intro-intelligence", HTMLInputElement)
const lck_input = getElemByIdOrThrow("intro-luck", HTMLInputElement)
const skill_inputs = [str_input, agi_input, int_input, lck_input]

const notify_list: ((action: IntroCloseAction) => void)[] = []

const max_skill_points = 50

let _player: Player

export function initIntro(player: Player): void {
  _player = player
  intro.removeAttribute("hidden")

  onCreateCharacterUpdate()
}

export function registerCloseAction(
  fn: (action: IntroCloseAction) => void,
): void {
  notify_list.push(fn)
}

function onCreateCharacterUpdate() {
  let usedPoints = 0
  for (let i = 0; i < skill_inputs.length; i++) {
    usedPoints += parseInt(skill_inputs[i].value)
  }

  remaining_skill_points_span.textContent = "" + (max_skill_points - usedPoints)

  let invalid = false
  if (usedPoints > max_skill_points) {
    invalid = true
    remaining_skill_points_span.style.color = "#f00"
  } else {
    remaining_skill_points_span.style.color = ""
  }
  if (name_input.value === "") {
    invalid = true
  }
  if (invalid) {
    start_game_btn.setAttribute("disabled", "")
  } else {
    start_game_btn.removeAttribute("disabled")
  }
}

name_input.addEventListener("change", onCreateCharacterUpdate)
skill_inputs.forEach((x) =>
  x.addEventListener("change", onCreateCharacterUpdate),
)

new_btn.addEventListener("click", () => {
  pg1.setAttribute("hidden", "")
  pg2.removeAttribute("hidden")
})

load_btn.addEventListener("click", () => {
  intro.setAttribute("hidden", "")
  notify_list.forEach((f) => f(IntroCloseAction.LOAD))
})

start_game_btn.addEventListener("click", () => {
  intro.setAttribute("hidden", "")
  _player.name = name_input.value
  _player.sex = sex_input_male.checked ? Sex.MALE : Sex.FEMALE
  _player.strength = parseInt(str_input.value)
  _player.agility = parseInt(agi_input.value)
  _player.intelligence = parseInt(int_input.value)
  _player.luck = parseInt(lck_input.value)
  notify_list.forEach((f) => f(IntroCloseAction.NEW_GAME))
})
