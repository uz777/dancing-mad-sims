const MARKERS = [
  { angle: -90, label: "A" },
  { angle: -45, label: "2" },
  { angle: 0, label: "B" },
  { angle: 45, label: "3" },
  { angle: 90, label: "C" },
  { angle: 135, label: "4" },
  { angle: 180, label: "D" },
  { angle: 225, label: "1" },
];

const DIRECTIONS = {
  cw: { label: "時計回り", attackStep: 1, numberingStep: -1 },
  ccw: { label: "反時計回り", attackStep: -1, numberingStep: 1 },
};

const DICE_PATTERNS = {
  1: { cols: 1, rows: [[1]] },
  2: { cols: 2, rows: [[1, 2]] },
  3: { cols: 3, rows: [[2], [1, 3]] },
  4: { cols: 2, rows: [[1, 2], [1, 2]] },
  5: { cols: 3, rows: [[1, 2, 3], [2, 3]] },
  6: { cols: 4, rows: [[1, 3, 4], [1, 2, 4]] },
  7: { cols: 4, rows: [[1, 3, 4], [1, 2, 3, 4]] },
  8: { cols: 4, rows: [[1, 2, 3, 4], [1, 2, 3, 4]] },
};

const CONFIG = {
  attackCount: 4,
  attackDelayMs: 2000,
  attackStartDelayMs: 350,
  beforeAnswerDelayMs: 220,
  markerRadius: 48.5,
};

const els = {
  attackLine: document.querySelector("#attackLine"),
  calloutNumber: document.querySelector("#calloutNumber"),
  diceCallout: document.querySelector("#diceCallout"),
  diceValue: document.querySelector("#diceValue"),
  directionLabel: document.querySelector("#directionLabel"),
  field: document.querySelector("#field"),
  markerLayer: document.querySelector("#markerLayer"),
  phaseLabel: document.querySelector("#phaseLabel"),
  resultBox: document.querySelector("#resultBox"),
  retryButton: document.querySelector("#retryButton"),
  slotLayer: document.querySelector("#slotLayer"),
};

const markerAngles = MARKERS.map((marker) => marker.angle);
const slotAngles = markerAngles.map((angle) => normalizeAngle(angle + 22.5));

const state = {
  acceptingAnswers: false,
  markers: [],
  roundToken: 0,
  scenario: null,
  slots: [],
};

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function angleDelta(a, b) {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(diff, 360 - diff);
}

function pointAt(angle, radius) {
  const rad = (angle * Math.PI) / 180;
  return {
    x: 50 + Math.cos(rad) * radius,
    y: 50 + Math.sin(rad) * radius,
  };
}

function randomInt(maxExclusive) {
  return Math.floor(Math.random() * maxExclusive);
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function createPositionedElement(tagName, className, angle, radius) {
  const element = document.createElement(tagName);
  const point = pointAt(angle, radius);
  element.className = className;
  element.style.left = `${point.x}%`;
  element.style.top = `${point.y}%`;
  return element;
}

function renderBoard() {
  els.markerLayer.replaceChildren();
  els.slotLayer.replaceChildren();

  state.markers = MARKERS.map((markerDef, index) => {
    const marker = createPositionedElement("div", "marker", markerDef.angle, CONFIG.markerRadius);
    marker.dataset.index = String(index);
    marker.textContent = markerDef.label;
    els.markerLayer.append(marker);
    return marker;
  });

  state.slots = slotAngles.map((angle, index) => {
    const slot = createPositionedElement("button", "slot", angle, CONFIG.markerRadius);
    slot.type = "button";
    slot.dataset.index = String(index);
    slot.disabled = true;
    slot.setAttribute("aria-label", `立ち位置候補 ${index + 1}`);
    slot.addEventListener("click", () => submitAnswer(index));
    els.slotLayer.append(slot);
    return slot;
  });
}

function buildScenario() {
  const baseIndex = randomInt(MARKERS.length);
  const rotation = Math.random() < 0.5 ? "cw" : "ccw";
  const dice = randomInt(MARKERS.length) + 1;
  const { numberingStep } = DIRECTIONS[rotation];
  const correctAngle = normalizeAngle(
    markerAngles[baseIndex] + numberingStep * (22.5 + 45 * (dice - 1)),
  );

  return {
    baseIndex,
    correctSlotIndex: slotAngles.findIndex((angle) => angleDelta(angle, correctAngle) < 0.1),
    dice,
    rotation,
  };
}

function setResult(text, stateName = "") {
  els.resultBox.className = `result-box${stateName ? ` ${stateName}` : ""}`;
  els.resultBox.textContent = text;
}

function setSlotsEnabled(enabled) {
  state.slots.forEach((slot) => {
    slot.disabled = !enabled;
  });
}

function clearAttackMarkers() {
  state.markers.forEach((marker) => {
    marker.classList.remove("is-active", "is-basis");
  });
}

function resetBoardState() {
  clearAttackMarkers();
  state.slots.forEach((slot) => {
    slot.classList.remove("is-selected", "is-correct", "is-wrong", "show-answer");
    slot.disabled = true;
  });
}

function setDicePlaceholder() {
  renderDiceMarker(els.diceValue, null);
  renderDiceMarker(els.calloutNumber, null);
  els.diceValue.classList.remove("is-dealt");
  els.diceCallout.hidden = true;
}

function renderDiceMarker(target, dice) {
  target.replaceChildren();
  target.className = "dice-marker";

  if (!dice) {
    target.classList.add("dice-placeholder");
    target.textContent = "-";
    target.setAttribute("aria-label", "未付与");
    return;
  }

  const pattern = DICE_PATTERNS[dice];
  const pips = document.createElement("div");
  pips.className = "dice-pips";
  pips.style.setProperty("--cols", String(pattern.cols));

  pattern.rows.forEach((row, rowIndex) => {
    row.forEach((column) => {
      const pip = document.createElement("span");
      pip.className = "dice-pip";
      pip.style.gridColumn = String(column);
      pip.style.gridRow = String(rowIndex + 1);
      pips.append(pip);
    });
  });

  target.classList.add(dice % 2 === 1 ? "dice-odd" : "dice-even");
  target.setAttribute("aria-label", `サイコロ ${dice}`);
  target.append(pips);
}

function revealDice(dice) {
  els.diceValue.classList.remove("is-dealt");
  els.diceCallout.classList.remove("is-dealt");
  renderDiceMarker(els.diceValue, dice);
  renderDiceMarker(els.calloutNumber, dice);
  els.diceCallout.hidden = false;
  void els.diceValue.offsetWidth;
  els.diceValue.classList.add("is-dealt");
  els.diceCallout.classList.add("is-dealt");
}

function showAttack(markerIndex, attackAngle, isBasis, skipRotationTransition = false) {
  clearAttackMarkers();

  const marker = state.markers[markerIndex];
  marker.classList.add("is-active");
  marker.classList.toggle("is-basis", isBasis);

  els.attackLine.classList.remove("is-firing");
  els.attackLine.classList.toggle("no-rotation-transition", skipRotationTransition);
  els.attackLine.style.setProperty("--attack-angle", `${attackAngle}deg`);
  void els.attackLine.offsetWidth;
  els.attackLine.classList.add("is-visible", "is-firing");

  if (skipRotationTransition) {
    window.requestAnimationFrame(() => {
      els.attackLine.classList.remove("no-rotation-transition");
    });
  }
}

function hideAttack() {
  els.attackLine.classList.remove("is-visible", "is-firing");
  clearAttackMarkers();
}

function beginQuestionPhase() {
  state.scenario = buildScenario();
  state.acceptingAnswers = false;

  els.field.dataset.phase = "question";
  els.phaseLabel.textContent = "出題中";
  els.directionLabel.textContent = DIRECTIONS[state.scenario.rotation].label;
  els.directionLabel.classList.remove("state-chip-muted");
  els.retryButton.disabled = false;

  setDicePlaceholder();
  hideAttack();
  resetBoardState();
  setResult("攻撃を確認中");
}

async function playAttackSequence(token) {
  const { attackStep } = DIRECTIONS[state.scenario.rotation];
  const baseAttackAngle = markerAngles[state.scenario.baseIndex];

  await sleep(CONFIG.attackStartDelayMs);

  for (let i = 0; i < CONFIG.attackCount; i += 1) {
    if (token !== state.roundToken) {
      return false;
    }

    const markerIndex = mod(state.scenario.baseIndex + attackStep * i, MARKERS.length);
    const attackAngle = baseAttackAngle + attackStep * 45 * i;
    showAttack(markerIndex, attackAngle, i === 0, i === 0);
    await sleep(CONFIG.attackDelayMs);
  }

  return token === state.roundToken;
}

function enterAnswerPhase() {
  els.field.dataset.phase = "answer";
  els.phaseLabel.textContent = "回答";
  revealDice(state.scenario.dice);
  setResult("立ち位置を選択");
  state.acceptingAnswers = true;
  setSlotsEnabled(true);
}

async function startRound() {
  state.roundToken += 1;
  const token = state.roundToken;

  beginQuestionPhase();

  if (!(await playAttackSequence(token))) {
    return;
  }

  hideAttack();
  await sleep(CONFIG.beforeAnswerDelayMs);

  if (token === state.roundToken) {
    enterAnswerPhase();
  }
}

function submitAnswer(slotIndex) {
  if (!state.acceptingAnswers || !state.scenario) {
    return;
  }

  state.acceptingAnswers = false;
  setSlotsEnabled(false);
  els.field.dataset.phase = "result";

  const selected = state.slots[slotIndex];
  const correct = state.slots[state.scenario.correctSlotIndex];
  const isCorrect = slotIndex === state.scenario.correctSlotIndex;

  selected.classList.add("is-selected", isCorrect ? "is-correct" : "is-wrong");
  correct.classList.add("is-correct", "show-answer");

  els.phaseLabel.textContent = isCorrect ? "成功" : "失敗";
  setResult(isCorrect ? "成功" : "失敗。正解位置を表示中", isCorrect ? "success" : "failure");

  els.retryButton.disabled = false;
  els.retryButton.focus({ preventScroll: true });
}

els.retryButton.addEventListener("click", startRound);
renderBoard();
startRound();
