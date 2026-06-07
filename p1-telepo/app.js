const ARROWS = ["up", "down", "left", "right"];
const ARROW_GLYPH = {
  up: "⬆",
  down: "⬇",
  left: "⬅",
  right: "➡",
};

const STATUS = {
  IDLE: "idle",
  PLAYING: "playing",
  REVIEW: "review",
  BETWEEN: "between",
};

const TIME_LIMITS = [7, 10];
const NEXT_SET_DELAY_MS = 760;

const CELLS = [
  { id: "r1c1", label: "01", row: 1, col: 1, arrow: "down", limited: true },
  { id: "r1c2", label: "02", row: 1, col: 2, arrow: "left", limited: false },
  { id: "r1c4", label: "03", row: 1, col: 4, arrow: "left", limited: true },
  { id: "r1c5", label: "04", row: 1, col: 5, arrow: "left", limited: true },
  { id: "r2c1", label: "05", row: 2, col: 1, arrow: "down", limited: true },
  { id: "r2c2", label: "06", row: 2, col: 2, arrow: "up", limited: false },
  { id: "r2c4", label: "07", row: 2, col: 4, arrow: "right", limited: false },
  { id: "r2c5", label: "08", row: 2, col: 5, arrow: "up", limited: false },
  { id: "r4c1", label: "09", row: 4, col: 1, arrow: "down", limited: false },
  { id: "r4c2", label: "10", row: 4, col: 2, arrow: "left", limited: false },
  { id: "r4c4", label: "11", row: 4, col: 4, arrow: "down", limited: false },
  { id: "r4c5", label: "12", row: 4, col: 5, arrow: "up", limited: true },
  { id: "r5c1", label: "13", row: 5, col: 1, arrow: "right", limited: true },
  { id: "r5c2", label: "14", row: 5, col: 2, arrow: "right", limited: true },
  { id: "r5c4", label: "15", row: 5, col: 4, arrow: "right", limited: false },
  { id: "r5c5", label: "16", row: 5, col: 5, arrow: "up", limited: true },
];

const CELL_BY_ID = new Map(CELLS.map((cell) => [cell.id, cell]));

const state = {
  status: STATUS.IDLE,
  round: 0,
  hand: [],
  displayOrder: [],
  placed: [],
  roundScore: 0,
  currentStreak: 0,
  currentStreakScore: 0,
  bestStreak: 0,
  bestStreakScore: 0,
  timerId: null,
  stepEndsAt: [0, 0],
  remaining: [0, 0],
  usedHands: new Set(),
  revealCells: new Set(),
  revealSolution: [],
  helperCells: new Set(),
};

const el = {
  board: document.querySelector("#board"),
  hand: document.querySelector("#hand"),
  scoreText: document.querySelector("#scoreText"),
  roundText: document.querySelector("#roundText"),
  phaseText: document.querySelector("#phaseText"),
  historyList: document.querySelector("#historyList"),
  startButton: document.querySelector("#startButton"),
  nextButton: document.querySelector("#nextButton"),
};

const VALID_HANDS = buildValidHands();

function buildValidHands() {
  const hands = [];
  ARROWS.forEach((first) => {
    ARROWS.forEach((second) => {
      const hand = [first, second];
      if (validSolutions(hand).length > 0) hands.push(hand);
    });
  });
  return hands;
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function handKey(hand) {
  return hand.join("-");
}

function formatScore(value) {
  return value.toFixed(1);
}

function cellById(id) {
  return CELL_BY_ID.get(id);
}

function activeStep() {
  return state.placed.length;
}

function nextArrow() {
  return state.hand[activeStep()];
}

function isSameHand(hand = state.hand) {
  return hand[0] === hand[1];
}

function isAdjacent(first, second) {
  return Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;
}

function canUseCell(cell, arrow, hand = state.hand) {
  return cell.arrow === arrow && (!cell.limited || hand[0] === hand[1]);
}

function validSolutions(hand = state.hand) {
  const [firstArrow, secondArrow] = hand;
  const firstCells = CELLS.filter((cell) => canUseCell(cell, firstArrow, hand));
  const secondCells = CELLS.filter((cell) => canUseCell(cell, secondArrow, hand));
  const solutions = [];

  firstCells.forEach((first) => {
    secondCells.forEach((second) => {
      if (first.id !== second.id && isAdjacent(first, second)) {
        solutions.push([first.id, second.id]);
      }
    });
  });

  return solutions;
}

function nextHand() {
  const unusedHands = VALID_HANDS.filter((hand) => !state.usedHands.has(handKey(hand)));
  if (unusedHands.length === 0) {
    state.usedHands = new Set();
    return shuffle(VALID_HANDS)[0];
  }
  return shuffle(unusedHands)[0];
}

function makeDisplayOrder(hand) {
  return shuffle([
    { arrow: hand[0], order: 1 },
    { arrow: hand[1], order: 2 },
  ]);
}

function resetRun() {
  stopTimer();
  state.status = STATUS.PLAYING;
  state.round = 0;
  state.roundScore = 0;
  state.currentStreak = 0;
  state.currentStreakScore = 0;
  state.bestStreak = 0;
  state.bestStreakScore = 0;
  state.usedHands = new Set();
  state.revealCells = new Set();
  state.revealSolution = [];
  state.helperCells = new Set();
  nextRound();
}

function nextRound() {
  stopTimer();
  state.round += 1;
  state.hand = nextHand();
  state.usedHands.add(handKey(state.hand));
  state.displayOrder = makeDisplayOrder(state.hand);
  state.placed = [];
  state.roundScore = 0;
  state.revealCells = new Set();
  state.revealSolution = [];
  state.status = STATUS.PLAYING;
  render();
  startTimer();
}

function failRound() {
  if (state.status === STATUS.PLAYING) updateRemaining();
  stopTimer();

  const answer = validSolutions()[0] || [];
  state.revealSolution = answer;
  state.revealCells = new Set(answer);
  answer.forEach((id) => state.helperCells.add(id));

  state.currentStreak = 0;
  state.currentStreakScore = 0;
  state.status = STATUS.REVIEW;
  render();
}

function commitRound() {
  stopTimer();
  state.currentStreak += 1;
  state.currentStreakScore += state.roundScore;
  updateBestStreak();
  state.status = STATUS.BETWEEN;
  render();
  setTimeout(nextRound, NEXT_SET_DELAY_MS);
}

function updateBestStreak() {
  const betterCount = state.currentStreak > state.bestStreak;
  const sameCountBetterScore = state.currentStreak === state.bestStreak && state.currentStreakScore > state.bestStreakScore;
  if (betterCount || sameCountBetterScore) {
    state.bestStreak = state.currentStreak;
    state.bestStreakScore = state.currentStreakScore;
  }
}

function stopTimer() {
  if (!state.timerId) return;
  clearInterval(state.timerId);
  state.timerId = null;
}

function startTimer() {
  stopTimer();
  const now = performance.now();
  state.remaining = [...TIME_LIMITS];
  state.stepEndsAt = TIME_LIMITS.map((limit) => now + limit * 1000);
  renderHand();
  state.timerId = setInterval(tickTimer, 80);
}

function updateRemaining() {
  const now = performance.now();
  state.remaining = state.stepEndsAt.map((endsAt) => Math.max(0, (endsAt - now) / 1000));
}

function tickTimer() {
  updateRemaining();
  renderHand();
  if (state.remaining[activeStep()] <= 0) failRound();
}

function chooseCell(id) {
  if (state.status !== STATUS.PLAYING) return;

  const cell = cellById(id);
  const arrow = nextArrow();
  if (!cell || !arrow) return;

  if (!isValidChoice(cell, arrow)) {
    failRound();
    return;
  }

  const gained = state.remaining[activeStep()];
  if (gained <= 0) {
    failRound();
    return;
  }

  state.helperCells.delete(cell.id);
  state.roundScore += gained;
  state.placed.push({ id, arrow, gained });

  if (state.placed.length === 1) {
    render();
    return;
  }

  if (isCurrentPlacementCorrect()) {
    commitRound();
    return;
  }

  failRound();
}

function isValidChoice(cell, arrow) {
  if (state.placed.some((placed) => placed.id === cell.id)) return false;
  if (!canUseCell(cell, arrow)) return false;
  if (state.placed.length === 0) return true;
  return isAdjacent(cellById(state.placed[0].id), cell);
}

function isCurrentPlacementCorrect() {
  const placement = state.placed.map((item) => item.id).join(",");
  return validSolutions().some((solution) => solution.join(",") === placement);
}

function cardRemaining(order) {
  if (!state.hand.length) return TIME_LIMITS[order - 1] || 0;

  const placed = state.placed[order - 1];
  if (placed) return placed.gained;
  if (state.status === STATUS.PLAYING || state.status === STATUS.REVIEW) return state.remaining[order - 1] || 0;
  return TIME_LIMITS[order - 1];
}

function render() {
  renderScoreSummary();
  renderBoard();
  renderHand();
  renderScorePanel();
  renderControls();
}

function renderScoreSummary() {
  el.roundText.textContent = `${state.currentStreak} / ${formatScore(state.currentStreakScore)}`;
  el.scoreText.textContent = `${state.bestStreak} / ${formatScore(state.bestStreakScore)}`;
  el.phaseText.textContent = state.status === STATUS.PLAYING ? "配置中" : "待機中";
}

function renderControls() {
  el.startButton.disabled = state.status === STATUS.PLAYING || state.status === STATUS.REVIEW;
  el.nextButton.classList.toggle("hidden", state.status !== STATUS.REVIEW);
}

function renderScorePanel() {
  el.historyList.innerHTML = `
    <div class="score-line">
      <span>現在</span>
      <strong>${state.currentStreak}</strong>
      <b>${formatScore(state.currentStreakScore)}</b>
    </div>
    <div class="score-line best">
      <span>ベスト</span>
      <strong>${state.bestStreak}</strong>
      <b>${formatScore(state.bestStreakScore)}</b>
    </div>
  `;
}

function renderHand() {
  el.hand.innerHTML = "";
  state.displayOrder.forEach((card) => {
    const node = document.createElement("div");
    node.className = "card";
    node.innerHTML = `
      <span class="card-arrow">${ARROW_GLYPH[card.arrow]}</span>
      <span class="card-time">${formatScore(cardRemaining(card.order))}</span>
    `;
    el.hand.appendChild(node);
  });
}

function renderBoard() {
  el.board.innerHTML = "";
  for (let row = 1; row <= 5; row += 1) {
    for (let col = 1; col <= 5; col += 1) {
      const cell = CELLS.find((candidate) => candidate.row === row && candidate.col === col);
      el.board.appendChild(cell ? renderPlayableCell(cell) : renderEmptyCell(row, col));
    }
  }
}

function renderEmptyCell(row, col) {
  const node = document.createElement("div");
  node.className = "cell empty";
  node.style.gridRow = String(row);
  node.style.gridColumn = String(col);
  return node;
}

function renderPlayableCell(cell) {
  const node = document.createElement("button");
  const placedIndex = state.placed.findIndex((item) => item.id === cell.id);
  const answerIndex = state.revealSolution.findIndex((id) => id === cell.id);
  const showsAnswer = state.revealCells.has(cell.id);
  const showsHelper = !showsAnswer && state.helperCells.has(cell.id);

  node.type = "button";
  node.className = "cell playable";
  node.style.gridRow = String(cell.row);
  node.style.gridColumn = String(cell.col);
  node.textContent = showsAnswer || showsHelper ? ARROW_GLYPH[cell.arrow] : "";
  node.disabled = state.status !== STATUS.PLAYING;
  node.setAttribute("aria-label", `配置マス ${cell.label}`);
  node.addEventListener("click", () => chooseCell(cell.id));

  if (showsAnswer) node.classList.add("correct-flash");
  if (showsHelper) node.classList.add("helper-arrow");

  if (answerIndex >= 0) {
    appendBadge(node, answerIndex + 1, "answer-badge");
  } else if (placedIndex >= 0) {
    node.classList.add(placedIndex === 0 ? "placed-first" : "placed-second");
    appendBadge(node, placedIndex + 1);
  }

  return node;
}

function appendBadge(node, label, extraClass = "") {
  const badge = document.createElement("span");
  badge.className = `badge${extraClass ? ` ${extraClass}` : ""}`;
  badge.textContent = String(label);
  node.appendChild(badge);
}

el.startButton.addEventListener("click", resetRun);
el.nextButton.addEventListener("click", nextRound);

render();
