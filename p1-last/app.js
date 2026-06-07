const CONFIG = {
  roundSeconds: 5,
  gazePreviewMs: 1000,
  nextDelayMs: 700,
  dragThresholdPx: 20,
};

const STRIPES = {
  odd: "linear-gradient(to right, var(--pink) 0 25%, transparent 25% 50%, var(--pink) 50% 75%, transparent 75% 100%)",
  even: "linear-gradient(to right, transparent 0 25%, var(--pink) 25% 50%, transparent 50% 75%, var(--pink) 75% 100%)",
};

const ROLES = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"];
const GAZES = ["look", "avoid"];
const MECHANICS = ["spread", "stack"];

const patterns = [
  { id: "odd-right", parity: "odd", side: "right", stripe: "odd", rotation: "45deg" },
  { id: "odd-left", parity: "odd", side: "left", stripe: "odd", rotation: "-45deg" },
  { id: "even-right", parity: "even", side: "right", stripe: "even", rotation: "45deg" },
  { id: "even-left", parity: "even", side: "left", stripe: "even", rotation: "-45deg" },
];

const patternMap = new Map(patterns.map((pattern) => [pattern.id, pattern]));

const gazeStates = {
  look: {
    color: "var(--look)",
    mask: "url('assets/eye-slash-regular-full.svg')",
  },
  avoid: {
    color: "var(--avoid)",
    mask: "url('assets/eye-regular-full.svg')",
  },
};

const centerCues = [
  { id: "0-0", src: "assets/center-0-0.svg", flipMechanic: false, flipFloor: false },
  { id: "0-1", src: "assets/center-0-1.svg", flipMechanic: false, flipFloor: true },
  { id: "1-0", src: "assets/center-1-0.svg", flipMechanic: true, flipFloor: false },
  { id: "1-1", src: "assets/center-1-1.svg", flipMechanic: true, flipFloor: true },
];

const mechanicCues = {
  spread: { src: "assets/sankai.svg" },
  stack: { src: "assets/atama.svg" },
};

const positionSets = {
  "odd-right": {
    spread: {
      D4: { x: 62.77, y: 4.85 },
      ST: { x: 47.07, y: 20.87 },
      D2: { x: 24.07, y: 44.03 },
      H2: { x: 4.56, y: 63.53 },
      D3: { x: 96.71, y: 40.54 },
      H1: { x: 41.2, y: 97.16 },
      MT: { x: 58.8, y: 38.16 },
      D1: { x: 39.61, y: 56.87 },
    },
    stack: {
      DPS: { x: 58.8, y: 38.16 },
      TH: { x: 39.61, y: 56.87 },
    },
  },
  "even-right": {
    spread: {
      D4: { x: 58.64, y: 1.99 },
      ST: { x: 42.47, y: 17.22 },
      D2: { x: 19.94, y: 39.43 },
      H2: { x: 1.86, y: 58.78 },
      MT: { x: 62.45, y: 41.49 },
      D1: { x: 43.42, y: 60.68 },
      D3: { x: 92.74, y: 37.05 },
      H1: { x: 36.92, y: 92.4 },
    },
    stack: {
      DPS: { x: 62.45, y: 41.49 },
      TH: { x: 43.42, y: 60.68 },
    },
  },
  "odd-left": {
    spread: {
      D4: { x: 40.4, y: 2.95 },
      ST: { x: 57.85, y: 19.92 },
      D2: { x: 76.88, y: 39.58 },
      H2: { x: 96.07, y: 58.62 },
      MT: { x: 37.23, y: 41.49 },
      D1: { x: 56.11, y: 61.47 },
      D3: { x: 2.18, y: 42.12 },
      H1: { x: 57.38, y: 97.47 },
    },
    stack: {
      DPS: { x: 37.23, y: 41.49 },
      TH: { x: 56.11, y: 61.47 },
    },
  },
  "even-left": {
    spread: {
      D4: { x: 34.85, y: 5.64 },
      ST: { x: 53.41, y: 23.57 },
      D2: { x: 72.28, y: 43.55 },
      H2: { x: 92.27, y: 62.74 },
      MT: { x: 41.83, y: 37.36 },
      D1: { x: 61.34, y: 56.71 },
      D3: { x: 5.99, y: 36.41 },
      H1: { x: 63.4, y: 94.46 },
    },
    stack: {
      DPS: { x: 41.83, y: 37.36 },
      TH: { x: 61.34, y: 56.71 },
    },
  },
};

const state = {
  status: "idle",
  selectedRole: "MT",
  round: 0,
  streak: 0,
  score: 0,
  bestStreak: 0,
  bestScore: 0,
  secondsLeft: CONFIG.roundSeconds,
  startedAt: 0,
  timerId: null,
  revealTimerId: null,
  prompt: null,
  selectedKey: null,
  selectedGaze: null,
};

const el = {
  roleSelect: document.querySelector("#roleSelect"),
  startButton: document.querySelector("#startButton"),
  nextButton: document.querySelector("#nextButton"),
  field: document.querySelector("#field"),
  stripeLayer: document.querySelector("#stripeLayer"),
  gazeIcon: document.querySelector("#gazeIcon"),
  centerCue: document.querySelector("#centerCue"),
  mechanicCue: document.querySelector("#mechanicCue"),
  positionLayer: document.querySelector("#positionLayer"),
  dragGuide: document.querySelector("#dragGuide"),
  resultOverlay: document.querySelector("#resultOverlay"),
  currentScore: document.querySelector("#currentScore"),
  bestScore: document.querySelector("#bestScore"),
  timerText: document.querySelector("#timerText"),
  feedback: document.querySelector("#feedback"),
};

function pick(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function patternById(id) {
  return patternMap.get(id) || patterns[0];
}

function oppositeParity(parity) {
  return parity === "odd" ? "even" : "odd";
}

function oppositeMechanic(mechanic) {
  return mechanic === "spread" ? "stack" : "spread";
}

function isDps(role) {
  return role.startsWith("D");
}

function resolvePrompt(prompt) {
  const actualParity = prompt.centerCue.flipFloor
    ? oppositeParity(prompt.displayPattern.parity)
    : prompt.displayPattern.parity;
  const actualPattern =
    patterns.find((pattern) => pattern.parity === actualParity && pattern.side === prompt.displayPattern.side) ||
    prompt.displayPattern;
  const actualMechanic = prompt.centerCue.flipMechanic
    ? oppositeMechanic(prompt.displayMechanic)
    : prompt.displayMechanic;

  return { actualPattern, actualMechanic };
}

function answerKey(prompt, role = state.selectedRole) {
  const { actualPattern, actualMechanic } = resolvePrompt(prompt);
  if (actualMechanic === "stack") return `${actualPattern.id}-stack-${isDps(role) ? "DPS" : "TH"}`;
  return `${actualPattern.id}-spread-${role}`;
}

function isCorrectChoice(choiceKey, gazeAnswer, prompt) {
  return choiceKey.split("|").includes(answerKey(prompt)) && gazeAnswer === prompt.gaze;
}

function makePrompt() {
  return {
    gaze: pick(GAZES),
    displayMechanic: pick(MECHANICS),
    displayPattern: pick(patterns),
    centerCue: pick(centerCues),
  };
}

function startRun() {
  stopTimers();
  state.selectedRole = el.roleSelect.value;
  state.status = "cue";
  state.round = 0;
  state.streak = 0;
  state.score = 0;
  nextRound();
}

function nextRound() {
  stopTimers();
  state.status = "cue";
  state.round += 1;
  state.selectedKey = null;
  state.selectedGaze = null;
  state.prompt = makePrompt();
  state.secondsLeft = CONFIG.roundSeconds;
  hideResult();
  render();
  state.revealTimerId = setTimeout(startCountdown, CONFIG.gazePreviewMs);
}

function startCountdown() {
  state.status = "playing";
  state.secondsLeft = CONFIG.roundSeconds;
  state.startedAt = performance.now();
  render();
  state.timerId = setInterval(tickCountdown, 60);
}

function tickCountdown() {
  const elapsed = (performance.now() - state.startedAt) / 1000;
  state.secondsLeft = Math.max(0, CONFIG.roundSeconds - elapsed);
  renderScore();
  if (state.secondsLeft <= 0) failRound(true);
}

function stopTimers() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  if (state.revealTimerId) {
    clearTimeout(state.revealTimerId);
    state.revealTimerId = null;
  }
}

function choosePosition(key, gazeAnswer) {
  if (state.status !== "playing") return;

  state.selectedKey = key;
  state.selectedGaze = gazeAnswer;

  if (isCorrectChoice(key, gazeAnswer, state.prompt)) {
    clearRound();
    return;
  }

  failRound(false);
}

function clearRound() {
  stopTimers();
  const gained = Math.max(1, Math.round(state.secondsLeft * 100));
  state.streak += 1;
  state.score += gained;
  updateBestScore();
  state.status = "between";

  showFeedback("ok", `正解。残り時間ボーナス ${gained} 点`);
  showResult(`正解\n+${gained}点`);
  render();
  setTimeout(nextRound, CONFIG.nextDelayMs);
}

function failRound(timedOut) {
  if (state.status !== "playing") return;

  stopTimers();
  state.status = "review";
  state.streak = 0;
  state.score = 0;
  showFeedback("bad", timedOut ? "時間切れ。正解位置を表示しています。" : "不正解。正解位置を表示しています。");
  hideResult();
  render();
}

function updateBestScore() {
  const isNewBest = state.streak > state.bestStreak || (state.streak === state.bestStreak && state.score > state.bestScore);
  if (!isNewBest) return;
  state.bestStreak = state.streak;
  state.bestScore = state.score;
}

function showFeedback(kind, message) {
  el.feedback.className = kind ? `feedback ${kind}` : "feedback";
  el.feedback.textContent = message;
}

function showResult(message) {
  el.resultOverlay.className = "result-overlay success";
  el.resultOverlay.textContent = message;
}

function hideResult() {
  el.resultOverlay.className = "result-overlay hidden";
  el.resultOverlay.textContent = "";
}

function applyPattern(node, pattern) {
  node.style.setProperty("--stripe", STRIPES[pattern.stripe]);
  node.style.setProperty("--rotation", pattern.rotation);
}

function render() {
  renderScore();
  renderField();
  renderControls();
}

function renderScore() {
  el.currentScore.textContent = `${state.streak} / ${state.score}`;
  el.bestScore.textContent = `${state.bestStreak} / ${state.bestScore}`;
  el.timerText.textContent = state.status === "idle" ? "0.0" : state.secondsLeft.toFixed(1);
}

function renderControls() {
  el.startButton.disabled = state.status !== "idle";
  el.nextButton.classList.toggle("hidden", state.status !== "review");
}

function renderField() {
  el.field.className = `field-preview ${state.status}`;

  if (!state.prompt) {
    el.positionLayer.innerHTML = "";
    return;
  }

  applyPattern(el.stripeLayer, state.prompt.displayPattern);
  renderGazeIcon(state.prompt.gaze);

  if (state.status === "cue") {
    el.positionLayer.innerHTML = "";
    return;
  }

  el.mechanicCue.src = mechanicCues[state.prompt.displayMechanic].src;
  el.centerCue.src = state.prompt.centerCue.src;
  renderPositions();
}

function renderGazeIcon(gazeId) {
  const gaze = gazeStates[gazeId];
  el.gazeIcon.style.setProperty("--gaze-color", gaze.color);
  el.gazeIcon.style.setProperty("--gaze-mask", gaze.mask);
}

function renderPositions() {
  const choices = choicePointsForSide(state.prompt.displayPattern.side);
  const correctKey = answerKey(state.prompt);

  el.positionLayer.innerHTML = "";
  choices.forEach((choice) => {
    const marker = createPositionMarker(choice, correctKey);
    el.positionLayer.appendChild(marker);
  });
}

function createPositionMarker(choice, correctKey) {
  const key = choice.keys.join("|");
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = markerClasses(choice, key, correctKey);
  marker.style.left = `${choice.x}%`;
  marker.style.top = `${choice.y}%`;
  marker.setAttribute("aria-label", "choice");
  marker.disabled = state.status !== "playing";
  attachDragAnswer(marker, key);
  return marker;
}

function markerClasses(choice, key, correctKey) {
  const classes = ["position-marker"];
  if (state.status === "review" && choice.keys.includes(correctKey)) classes.push("answer");
  if (state.selectedKey === key) {
    const isCorrectGaze = state.selectedGaze === state.prompt.gaze;
    classes.push(choice.keys.includes(correctKey) && isCorrectGaze ? "correct" : "wrong");
  }
  return classes.join(" ");
}

function attachDragAnswer(marker, key) {
  let startY = 0;
  let pointerId = null;

  marker.addEventListener("pointerdown", (event) => {
    if (state.status !== "playing") return;
    pointerId = event.pointerId;
    startY = event.clientY;
    marker.setPointerCapture(pointerId);
    showDragGuide(marker, 0);
  });

  marker.addEventListener("pointermove", (event) => {
    if (state.status !== "playing" || pointerId !== event.pointerId) return;
    updateDragGuide(event.clientY - startY);
  });

  marker.addEventListener("pointerup", (event) => {
    if (state.status !== "playing" || pointerId !== event.pointerId) return;
    const deltaY = event.clientY - startY;
    pointerId = null;
    hideDragGuide();

    if (Math.abs(deltaY) < CONFIG.dragThresholdPx) {
      showFeedback("", "上にドラッグで見る、下にドラッグで見ない。");
      return;
    }

    choosePosition(key, deltaY < 0 ? "look" : "avoid");
  });

  marker.addEventListener("pointercancel", () => {
    pointerId = null;
    hideDragGuide();
  });
}

function showDragGuide(marker, deltaY) {
  const fieldRect = el.field.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();
  const x = markerRect.left + markerRect.width / 2 - fieldRect.left;
  const y = markerRect.top + markerRect.height / 2 - fieldRect.top;

  el.dragGuide.style.setProperty("--drag-x", `${x}px`);
  el.dragGuide.style.setProperty("--drag-y", `${y}px`);
  el.dragGuide.classList.remove("hidden");
  updateDragGuide(deltaY);
}

function updateDragGuide(deltaY) {
  const distance = Math.abs(deltaY);
  const direction = distance < 2 ? "neutral" : deltaY < 0 ? "up" : "down";
  const lineY = deltaY < 0 ? `-${distance}px` : "0px";
  const arrowY = deltaY < 0 ? `-${distance + 12}px` : `${distance}px`;

  el.dragGuide.classList.toggle("up", direction === "up");
  el.dragGuide.classList.toggle("down", direction === "down");
  el.dragGuide.classList.toggle("ready", distance >= CONFIG.dragThresholdPx);
  el.dragGuide.style.setProperty("--drag-distance", `${Math.max(distance, 8)}px`);
  el.dragGuide.style.setProperty("--drag-line-y", lineY);
  el.dragGuide.style.setProperty("--drag-arrow-y", arrowY);
}

function hideDragGuide() {
  el.dragGuide.classList.add("hidden");
  el.dragGuide.classList.remove("up", "down", "ready");
}

function choicePointsForSide(side) {
  const choices = new Map();
  Object.entries(positionSets).forEach(([patternId, set]) => {
    if (patternById(patternId).side !== side) return;
    addPositionGroup(choices, patternId, "spread", set.spread);
    addPositionGroup(choices, patternId, "stack", set.stack);
  });
  return [...choices.values()];
}

function addPositionGroup(choices, patternId, mechanic, points) {
  Object.entries(points).forEach(([label, point]) => {
    addChoice(choices, point, `${patternId}-${mechanic}-${label}`);
  });
}

function addChoice(choices, point, key) {
  const choiceKey = `${Math.round(point.x * 10) / 10},${Math.round(point.y * 10) / 10}`;
  if (!choices.has(choiceKey)) {
    choices.set(choiceKey, {
      x: point.x,
      y: point.y,
      keys: [],
    });
  }
  choices.get(choiceKey).keys.push(key);
}

function init() {
  el.roleSelect.innerHTML = ROLES.map((role) => `<option value="${role}">${role}</option>`).join("");
  el.roleSelect.value = state.selectedRole;
  el.startButton.addEventListener("click", startRun);
  el.nextButton.addEventListener("click", nextRound);
  el.roleSelect.addEventListener("change", (event) => {
    state.selectedRole = event.target.value;
  });
  render();
}

init();
