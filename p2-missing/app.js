const roles = ["MT", "ST", "H1", "H2", "D1", "D2", "D3", "D4"];
const guideAfterTowerRounds = [2, 4, 6, 8];
const guideRounds = guideAfterTowerRounds.map((round) => round + 1);

const pairs = [
  ["MT", "H1"],
  ["ST", "H2"],
  ["D1", "D3"],
  ["D2", "D4"],
];

const methodPairs = {
  lean: [
    ["MT", "ST"],
    ["H1", "H2"],
    ["D1", "D2"],
    ["D3", "D4"],
  ],
  yarn: pairs,
};

const pairPriority = {
  MT: 1,
  ST: 2,
  H1: 1,
  H2: 2,
  D1: 1,
  D2: 2,
  D3: 1,
  D4: 2,
};

const debuffs = {
  share: "頭割り",
  circle: "円AoE",
  fan: "扇AoE",
};

const debuffShort = {
  share: "頭",
  circle: "円",
  fan: "扇",
};

const groupNames = {
  A: "1238組",
  B: "4567組",
};

const groupTowerRoundMap = {
  A: [1, 2, 3, 8],
  B: [4, 5, 6, 7],
};

function cropCoord(value) {
  return (value - 25) * 2;
}

const markers = {
  leftTowerStack: { x: 42, y: 58, short: "1頭", label: "左塔: 頭割り担当" },
  leftTowerFan: { x: 37, y: 63, short: "1扇", label: "左塔: 扇担当", type: "fan" },
  rightTowerStack: { x: 57, y: 57, short: "2頭", label: "右塔: 頭割り担当" },
  rightTowerCircle: { x: 65, y: 65, short: "2円", label: "右塔: 円担当", type: "circle" },
  leftTowerCircle: { x: 35, y: 65, short: "1円", label: "左塔: 円担当", type: "circle" },
  leftTowerFanEven: { x: 44, y: 56, short: "1扇", label: "左塔: 扇担当 + 手前左の過去/未来", type: "fan" },
  rightTowerFanEven: { x: 56, y: 56, short: "2扇", label: "右塔: 扇担当 + 手前右の過去/未来", type: "fan" },
  rightTowerCircleEven: { x: 65, y: 65, short: "2円", label: "右塔: 円担当", type: "circle" },
  shareAssistLeft: { x: 46, y: 54, short: "補TH", label: "左塔頭割り補助TH" },
  shareAssistCenter: { x: 52, y: 54, short: "補D", label: "右塔頭割り補助DPS 左" },
  shareAssistRight: { x: 54, y: 54, short: "補D", label: "右塔頭割り補助DPS 右" },
  oddFanBait: { x: 34, y: 66, short: "誘TH", label: "頭割りあり回: 扇誘導TH" },
  evenHGuide: { x: 34, y: 50, short: "H", label: "偶数回上4人: H 扇誘導" },
  evenTankFuture: { x: 41, y: 41, short: "T", label: "偶数回上4人: T 過去/未来" },
  evenMeleeFuture: { x: 59, y: 41, short: "近D", label: "偶数回上4人: 近D 過去/未来" },
  evenRangedGuide: { x: 66, y: 50, short: "遠D", label: "偶数回上4人: 遠D 扇誘導" },
  pastGuide: { x: 50, y: 58, short: "過去", label: "過去誘導: 下側ターゲットサークル上" },
  futureGuide: { x: 50, y: 42, short: "未来", label: "未来誘導: 上側ターゲットサークル上" },
};

const state = {
  screen: "setup",
  selectedRole: "MT",
  groupingMethod: "lean",
  mode: "study",
  round: 1,
  phase: "tower",
  party: [],
  memories: {},
  mistakes: [],
  selectedPosition: null,
  timerId: null,
  secondsLeft: 8,
  groupSecondsLeft: 8,
  answeredSteps: {},
  roundPulse: false,
  markerPulse: false,
  timedOutSteps: {},
  groupTimerId: null,
  groupSelection: null,
  trialSelections: {},
};

const el = {
  methodSelect: document.querySelector("#methodSelect"),
  roleSelect: document.querySelector("#roleSelect"),
  modeSelect: document.querySelector("#modeSelect"),
  newRunButton: document.querySelector("#newRunButton"),
  controls: document.querySelector(".controls"),
  setupPanel: document.querySelector("#setupPanel"),
  groupPanel: document.querySelector("#groupPanel"),
  groupQuestion: document.querySelector("#groupQuestion"),
  groupDebuffs: document.querySelector("#groupDebuffs"),
  chooseGroupA: document.querySelector("#chooseGroupA"),
  chooseGroupB: document.querySelector("#chooseGroupB"),
  groupFeedback: document.querySelector("#groupFeedback"),
  groupTimerBar: document.querySelector("#groupTimerBar"),
  mainGrid: document.querySelector(".main-grid"),
  arenaPanel: document.querySelector(".arena-panel"),
  arenaHead: document.querySelector(".arena-head"),
  actionRow: document.querySelector(".action-row"),
  resultPanel: document.querySelector("#resultPanel"),
  resultText: document.querySelector("#resultText"),
  againButton: document.querySelector("#againButton"),
  debuffBadge: document.querySelector("#debuffBadge"),
  castLabel: document.querySelector("#castLabel"),
  timerBar: document.querySelector("#timerBar"),
  taskTitle: document.querySelector("#taskTitle"),
  taskText: document.querySelector("#taskText"),
  arena: document.querySelector("#arena"),
  feedback: document.querySelector("#feedback"),
  nextButton: document.querySelector("#nextButton"),
  roundTrack: document.querySelector("#roundTrack"),
  partyGroups: document.querySelector("#partyGroups"),
  mistakeLog: document.querySelector("#mistakeLog"),
};

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function initSelectors() {
  el.roleSelect.innerHTML = roles.map((role) => `<option value="${role}">${role}</option>`).join("");
  el.roleSelect.value = state.selectedRole;
  el.methodSelect.value = state.groupingMethod;
  el.setupPanel.appendChild(el.controls);
  el.setupPanel.appendChild(document.querySelector(".tool-info"));
  el.arenaPanel.prepend(el.resultPanel);
  el.arenaPanel.prepend(el.groupPanel);
  el.arenaPanel.prepend(el.setupPanel);
}

function makeInitialDebuffs() {
  const initial = {};
  // TH/DPSそれぞれに「頭 + 同一マーカー3人」を配る。両ロール群の非頭マーカーは逆にする。
  const thOther = Math.random() > 0.5 ? "circle" : "fan";
  const dpsOther = thOther === "circle" ? "fan" : "circle";
  [
    { roles: ["MT", "ST", "H1", "H2"], other: thOther },
    { roles: ["D1", "D2", "D3", "D4"], other: dpsOther },
  ].forEach(({ roles: roleSet, other }) => {
    const shuffled = shuffle(roleSet);
    const shareRole = shuffled[0];
    roleSet.forEach((role) => {
      initial[role] = role === shareRole ? "share" : other;
    });
  });
  return initial;
}

function assignYarnGroups(initial) {
  const groupA = new Set();
  methodPairs.yarn.forEach((pair) => {
    if (pair.some((role) => initial[role] === "share")) {
      pair.forEach((role) => groupA.add(role));
    }
  });
  return Object.fromEntries(roles.map((role) => [role, groupA.has(role) ? "A" : "B"]));
}

function assignLeanGroups(initial) {
  const result = {};
  const unresolved = [];

  // リーン式は「頭本人が1238、ペア相手が4567」を先に確定させる。
  methodPairs.lean.forEach((pair) => {
    const shareRole = pair.find((role) => initial[role] === "share");
    if (shareRole) {
      result[shareRole] = "A";
      pair.filter((role) => role !== shareRole).forEach((role) => {
        result[role] = "B";
      });
      return;
    }
    unresolved.push(pair);
  });

  const targetA = { circle: 1, fan: 1 };
  roles.forEach((role) => {
    if (result[role] === "A" && initial[role] !== "share") targetA[initial[role]] -= 1;
  });

  unresolved.forEach((pair) => {
    const [first, second] = [...pair].sort((a, b) => pairPriority[a] - pairPriority[b]);
    let chosen = first;
    if (initial[first] !== initial[second]) {
      const needed = [first, second].find((role) => targetA[initial[role]] > 0);
      chosen = needed || first;
    }
    result[chosen] = "A";
    result[pair.find((role) => role !== chosen)] = "B";
    targetA[initial[chosen]] -= 1;
  });

  return result;
}

function newParty() {
  const initial = makeInitialDebuffs();
  const groups = state.groupingMethod === "yarn" ? assignYarnGroups(initial) : assignLeanGroups(initial);

  state.party = roles.map((role) => ({
    role,
    initial: initial[role],
    group: groups[role],
  }));
}

function newMemories() {
  [2, 4, 6, 8].forEach((round) => {
    state.memories[round] = Math.random() > 0.5 ? "past" : "future";
  });
}

function player() {
  return state.party.find((member) => member.role === state.selectedRole);
}

function roundGroup(round) {
  return groupTowerRoundMap.A.includes(round) ? "A" : "B";
}

function groupTowerRounds(group) {
  return groupTowerRoundMap[group];
}

function towerStepStatus(round) {
  return state.answeredSteps[`${round}-tower`];
}

function isTowerStepOk(round) {
  return towerStepStatus(round) === "ok";
}

function isTowerStepResolvedForDisplay(round, referenceRound) {
  const status = towerStepStatus(round);
  return round < referenceRound ? Boolean(status) : status === "ok";
}

function hasFinishedTowerMarkers(group, referenceRound) {
  return groupTowerRounds(group).every((round) => isTowerStepResolvedForDisplay(round, referenceRound));
}

function nextTowerRoundForGroup(group, currentRound) {
  return groupTowerRounds(group).find((round) => round > currentRound) || null;
}

function groupName(group) {
  return groupNames[group];
}

function groupClass(group) {
  return group === "A" ? "group-1238" : "group-4567";
}

function stepKey(round = state.round, phase = state.phase) {
  return `${round}-${phase}`;
}

function isActive(member, round) {
  return member.group === roundGroup(round);
}

function groupMembers(group) {
  return state.party.filter((member) => member.group === group);
}

function activeMembers(round) {
  return groupMembers(roundGroup(round));
}

function ordered(members) {
  const order = { MT: 1, H1: 2, ST: 3, H2: 4, D1: 5, D3: 6, D2: 7, D4: 8 };
  return [...members].sort((a, b) => order[a.role] - order[b.role]);
}

function isTank(member) {
  return member.role === "MT" || member.role === "ST";
}

function isHealer(member) {
  return member.role === "H1" || member.role === "H2";
}

function currentPattern(round) {
  return round % 2 === 1 ? "head" : "nohead";
}

function debuffFor(member, round) {
  if (!isActive(member, round)) return member.initial;
  if (currentPattern(round) === "head") return headPatternDebuff(member, round);
  return noHeadPatternDebuff(member, round);
}

function headPatternDebuff(member, round) {
  if (round === 1) return member.initial;
  const members = activeMembers(round);
  const noHead = ordered(members.filter((candidate) => candidate.initial !== "share"));
  const heads = ordered(members.filter((candidate) => candidate.initial === "share"));
  // 初期頭割りがない組は、次の頭割りあり回で頭2/円1/扇1になるように正規化する。
  if (heads.length === 0) {
    const keepCircle = noHead.find((candidate) => candidate.initial === "circle");
    const keepFan = noHead.find((candidate) => candidate.initial === "fan");
    if (member.role === keepCircle?.role) return "circle";
    if (member.role === keepFan?.role) return "fan";
    return "share";
  }
  if (noHead.some((candidate) => candidate.role === member.role)) return "share";
  return heads.findIndex((candidate) => candidate.role === member.role) === 0 ? "fan" : "circle";
}

function noHeadPatternDebuff(member, round) {
  const members = activeMembers(round);
  const shares = ordered(members.filter((candidate) => candidate.initial === "share"));
  if (member.initial !== "share") return member.initial;
  return shares.findIndex((candidate) => candidate.role === member.role) === 0 ? "fan" : "circle";
}

function nextPatternLabel(round) {
  return round % 2 === 1 ? "円AoE/扇AoE" : "頭割り/円AoE/扇AoE";
}

function sameDebuffIndex(member, round, debuff) {
  const same = ordered(activeMembers(round).filter((candidate) => debuffFor(candidate, round) === debuff));
  return same.findIndex((candidate) => candidate.role === member.role);
}

function inactiveOddPosition(member, round) {
  if (member.role.startsWith("D")) {
    return member.role === "D1" || member.role === "D3" ? "shareAssistCenter" : "shareAssistRight";
  }
  if (member.role.startsWith("H")) return "oddFanBait";
  return "shareAssistLeft";
}

function inactiveEvenPosition(member) {
  if (isHealer(member)) return "evenHGuide";
  if (isTank(member)) return "evenTankFuture";
  if (member.role === "D1" || member.role === "D2") return "evenMeleeFuture";
  return "evenRangedGuide";
}

function expectedTowerPosition(member, round) {
  const active = isActive(member, round);
  const debuff = debuffFor(member, round);

  if (!active) {
    const key = round % 2 === 0 ? inactiveEvenPosition(member) : inactiveOddPosition(member, round);
    return {
      key,
      reason:
        round % 2 === 0
          ? "踏まない組です。ロール固定で上2隅の過去/未来、または左右真横の扇誘導を担当します。"
          : "踏まない組です。塔側で頭割り補助、または左右真横で扇誘導を担当します。",
    };
  }

  if (currentPattern(round) === "head") {
    if (debuff === "share") {
      return {
        key: sameDebuffIndex(member, round, "share") === 0 ? "leftTowerStack" : "rightTowerStack",
        reason: "頭割りあり回です。頭割り2人は左塔/右塔へ分かれて踏みます。",
      };
    }
    if (debuff === "fan") {
      return {
        key: "leftTowerFan",
        reason: "頭割りあり回の扇担当は左塔に入り、頭割り1と重なりつつ扇を外へ誘導します。",
      };
    }
    return {
      key: "rightTowerCircle",
      reason: "頭割りあり回の円担当は右塔を踏み、頭割りから離れて右外へ円を捨てます。",
    };
  }

  if (debuff === "fan") {
    return {
      key: sameDebuffIndex(member, round, "fan") === 0 ? "leftTowerFanEven" : "rightTowerFanEven",
      reason: "頭割りなし回です。扇担当は塔の内側に入り、手前2隅の過去/未来も同時に受けます。",
    };
  }

  return {
    key: sameDebuffIndex(member, round, "circle") === 0 ? "leftTowerCircle" : "rightTowerCircleEven",
    reason: "頭割りなし回です。円担当は各塔の外側へ入り、味方を巻き込まない位置で受けます。",
  };
}

function expectedGuidePosition(round) {
  const memory = state.memories[round - 1];
  return {
    key: memory === "past" ? "pastGuide" : "futureGuide",
    reason:
      memory === "past"
        ? "前回は過去です。下側のターゲットサークル上で8人誘導し、確定後に塔側へ移動します。"
        : "前回は未来です。上側のターゲットサークル上で8人誘導し、確定後に上半面から下へ抜けます。",
  };
}

function isGuideRound(round) {
  return guideRounds.includes(round);
}

function expectedPosition() {
  if (state.phase === "guide") return expectedGuidePosition(state.round);
  return expectedTowerPosition(player(), state.round);
}

function pairedTowerPositions(member, round) {
  if (!isActive(member, round)) return null;
  const debuff = debuffFor(member, round);
  if (currentPattern(round) === "head" && debuff === "share") return ["leftTowerStack", "rightTowerStack"];
  if (currentPattern(round) === "nohead" && debuff === "fan") return ["leftTowerFanEven", "rightTowerFanEven"];
  if (currentPattern(round) === "nohead" && debuff === "circle") return ["leftTowerCircle", "rightTowerCircleEven"];
  return null;
}

function acceptedPositionKeys() {
  const answer = expectedPosition();
  const member = player();
  const inactiveOddDps = state.phase === "tower" && !isActive(member, state.round) && state.round % 2 === 1 && member.role.startsWith("D");
  if (inactiveOddDps) {
    return ["shareAssistCenter", "shareAssistRight"];
  }
  if (state.phase !== "tower" || !isActive(member, state.round)) return [answer.key];
  // 優先度判断そのものは練習対象外なので、同一マーカーで分岐する左右は両方正解にする。
  const paired = pairedTowerPositions(member, state.round);
  if (paired) return paired;
  return [answer.key];
}

function positionName(key) {
  if (!key) return "未選択";
  return markers[key]?.short || markers[key]?.label || key;
}

function positionHint(key) {
  if (!key) return "時間内に選択できませんでした。";
  const hints = {
    leftTowerStack: "左塔の頭割り担当の立ち位置です。",
    rightTowerStack: "右塔の頭割り担当の立ち位置です。",
    leftTowerFan: "左塔の扇AoE担当の立ち位置です。",
    rightTowerCircle: "右塔の円AoE担当の立ち位置です。",
    leftTowerCircle: "左塔外側の円AoE担当の立ち位置です。",
    leftTowerFanEven: "左塔内側の扇AoE担当の立ち位置です。",
    rightTowerFanEven: "右塔内側の扇AoE担当の立ち位置です。",
    rightTowerCircleEven: "右塔外側の円AoE担当の立ち位置です。",
    shareAssistLeft: "頭割り補助のTH側立ち位置です。",
    shareAssistCenter: "頭割り補助の近接DPS側立ち位置です。",
    shareAssistRight: "頭割り補助の遠隔DPS側立ち位置です。",
    oddFanBait: "扇誘導担当の立ち位置です。",
    evenHGuide: "ヒーラーの扇誘導立ち位置です。",
    evenTankFuture: "タンクの過去/未来誘導立ち位置です。",
    evenMeleeFuture: "近接DPSの過去/未来誘導立ち位置です。",
    evenRangedGuide: "遠隔DPSの扇誘導立ち位置です。",
    pastGuide: "過去誘導の立ち位置です。",
    futureGuide: "未来誘導の立ち位置です。",
  };
  return hints[key] || "別担当の立ち位置です。";
}

function phaseName(round = state.round, phase = state.phase) {
  return phase === "guide" ? `${round}回目前 誘導` : `${round}回目`;
}

function recordMistake(selection) {
  state.mistakes.push(`${phaseName()}: ${positionName(selection)} - ${positionHint(selection)}`);
}

function resetPracticeProgress() {
  state.selectedPosition = null;
  state.answeredSteps = {};
  state.timedOutSteps = {};
  state.trialSelections = {};
}

function availableSpotKeys() {
  if (state.phase === "guide") return ["pastGuide", "futureGuide"];
  if (state.round % 2 === 1) {
    return [
      "leftTowerStack",
      "leftTowerFan",
      "rightTowerStack",
      "rightTowerCircle",
      "shareAssistLeft",
      "shareAssistCenter",
      "shareAssistRight",
      "oddFanBait",
    ];
  }
  return [
    "leftTowerCircle",
    "leftTowerFanEven",
    "rightTowerFanEven",
    "rightTowerCircleEven",
    "evenHGuide",
    "evenTankFuture",
    "evenMeleeFuture",
    "evenRangedGuide",
  ];
}

function roundDescription() {
  if (state.phase === "guide") {
    return "前の偶数回で付いた過去/未来の2段階目です。8人でターゲットサークル上に重なって向きを誘導します。";
  }
  if (state.round % 2 === 1) {
    return state.round === 1
      ? "頭割りあり回。1回目だけ半面AoEはありません。"
      : "頭割りあり回。直前の過去/未来から続く上半面AoEを避け、塔側で処理します。";
  }
  return `頭割りなし回。塔処理と過去/未来1段階目を同時に処理します。今回の詠唱: ${state.memories[state.round] === "past" ? "過去" : "未来"}`;
}

function taskTitle() {
  if (state.phase === "guide") return `${state.round}回目前: 過去/未来誘導`;
  return `${state.round}回目: ${roundGroup(state.round)}組処理`;
}

function renderArena() {
  document.querySelectorAll(".spot").forEach((node) => node.remove());
  el.arena.classList.toggle("has-half", state.phase === "tower" && [3, 5, 7].includes(state.round));
  el.arena.classList.toggle("guide-phase", state.phase === "guide");
  el.arena.classList.toggle("study-mode", state.mode === "study");
  el.arena.classList.toggle("check-mode", state.mode === "check");
  el.arena.classList.toggle("trial-mode", state.mode === "trial");
  el.castLabel.textContent = "";
  el.castLabel.className = "cast-label";

  const castMemoryRound =
    state.phase === "tower" && state.round % 2 === 0
      ? state.round
      : state.mode === "study" && state.phase === "guide"
        ? state.round - 1
        : null;
  if (castMemoryRound && state.memories[castMemoryRound]) {
    el.castLabel.className = "cast-label visible";
    el.castLabel.textContent = state.memories[castMemoryRound] === "past" ? "詠唱：過去" : "詠唱：未来";
  }

  const acceptedKeys = acceptedPositionKeys();
  const shouldShowAnswer =
    state.mode === "study" ||
    ((state.mode === "check" || state.mode === "trial") && state.answeredSteps[stepKey()] === "miss");
  availableSpotKeys().forEach((key) => {
    const data = markers[key];
    const spot = document.createElement("button");
    spot.className = `spot selectable ${data.type || ""}`;
    spot.type = "button";
    spot.dataset.key = key;
    spot.style.left = `${cropCoord(data.x)}%`;
    spot.style.top = `${cropCoord(data.y)}%`;
    spot.removeAttribute("title");
    spot.setAttribute("aria-label", "立ち位置");

    if (shouldShowAnswer && acceptedKeys.includes(key)) spot.classList.add("answer");
    if (state.mode === "trial" && !shouldShowAnswer) spot.classList.add("invisible-hit");
    if (state.selectedPosition === key) spot.classList.add(acceptedKeys.includes(key) ? "correct" : "wrong");

    spot.addEventListener("click", () => choosePosition(key));
    el.arena.appendChild(spot);
  });

}

function renderStatus() {
  const me = player();
  const debuff = displayDebuffFor(me);
  el.debuffBadge.className = `debuff-badge ${groupClass(me.group)}`;
  el.debuffBadge.innerHTML = debuffBadgeHtml(debuff, groupName(me.group), true);
  el.debuffBadge.classList.toggle("marker-pulse", state.markerPulse);
  if (state.markerPulse) {
    setTimeout(() => {
      el.debuffBadge.classList.remove("marker-pulse");
      state.markerPulse = false;
    }, 620);
  }
  el.taskTitle.textContent = taskTitle();
  el.taskText.textContent = roundDescription();
  el.nextButton.hidden = true;
  el.nextButton.textContent = "次へ";
}

function renderRoundTrack() {
  el.roundTrack.innerHTML = "";
  for (let round = 1; round <= 8; round += 1) {
    const pill = document.createElement("div");
    const towerResult = towerStepStatus(round);
    pill.className = "round-pill";
    if (state.phase === "tower" && round === state.round) pill.classList.add("current");
    if (state.phase === "tower" && round === state.round && state.roundPulse) pill.classList.add("round-pulse");
    if (towerResult === "ok") pill.classList.add("done");
    if (towerResult === "miss") pill.classList.add("missed");
    const group = roundGroup(round);
    pill.classList.add(groupClass(group));
    pill.textContent = round;
    el.roundTrack.appendChild(pill);

    if (guideAfterTowerRounds.includes(round)) {
      const guideRound = round + 1;
      const guideResult = state.answeredSteps[`${guideRound}-guide`];
      const guidePill = document.createElement("div");
      guidePill.className = "round-pill guide-pill";
      if (state.phase === "guide" && state.round === guideRound) guidePill.classList.add("current");
      if (state.phase === "guide" && state.round === guideRound && state.roundPulse) guidePill.classList.add("round-pulse");
      if (guideResult === "ok") guidePill.classList.add("done");
      if (guideResult === "miss") guidePill.classList.add("missed");
      guidePill.textContent = "?";
      el.roundTrack.appendChild(guidePill);
    }
  }
}

function displayDebuffFor(member) {
  const referenceRound = state.phase === "guide" ? state.round - 1 : state.round;
  if (hasFinishedTowerMarkers(member.group, referenceRound)) return null;

  const towerRounds = groupTowerRounds(member.group);
  const latestResolvedRound = [...towerRounds]
    .reverse()
    .find((round) => round <= referenceRound && isTowerStepResolvedForDisplay(round, referenceRound));
  if (latestResolvedRound) return nextDebuffAfterTower(member, latestResolvedRound);

  const upcomingRound = towerRounds.find((round) => round >= referenceRound) || towerRounds[0];
  return debuffFor(member, upcomingRound);
}

function nextDebuffAfterTower(member, round) {
  const nextRound = nextTowerRoundForGroup(member.group, round);
  return nextRound ? debuffFor(member, nextRound) : null;
}

function debuffIconHtml(type) {
  const icons = {
    share: "fa-solid fa-arrows-to-dot",
    circle: "fa-regular fa-circle",
    fan: "fa-solid fa-caret-down",
    guide: "fa-solid fa-arrows-up-down",
  };
  return `<span class="aura aura-${type}" aria-hidden="true"><i class="${icons[type] || ""}"></i></span>`;
}

function clearMarkerFloat() {
  document.querySelectorAll(".marker-float").forEach((node) => node.remove());
}

function spawnMarkerFloat(type, spotKey) {
  if (!type || !markers[spotKey]) return;
  const marker = markers[spotKey];
  const effect = document.createElement("div");
  effect.className = `marker-float aura-${type}`;
  effect.style.left = `${cropCoord(marker.x)}%`;
  effect.style.top = `${cropCoord(marker.y)}%`;
  effect.innerHTML = debuffIconHtml(type);
  effect.addEventListener("animationend", () => effect.remove(), { once: true });
  el.arena.appendChild(effect);
}

function towerFloatPositionMap(round, selectedSpotKey = null) {
  const positions = new Map(activeMembers(round).map((member) => [member.role, expectedTowerPosition(member, round).key]));
  const me = player();
  const pair = pairedTowerPositions(me, round);
  if (!selectedSpotKey || !pair?.includes(selectedSpotKey)) return positions;

  const sameDebuffMembers = ordered(activeMembers(round).filter((member) => debuffFor(member, round) === debuffFor(me, round)));
  positions.set(me.role, selectedSpotKey);
  const remainingPositions = pair.filter((positionKey) => positionKey !== selectedSpotKey);
  sameDebuffMembers
    .filter((member) => member.role !== me.role)
    .forEach((member, index) => {
      if (remainingPositions[index]) positions.set(member.role, remainingPositions[index]);
    });
  return positions;
}

function spawnTowerMarkerFloats(round, selectedSpotKey = null) {
  clearMarkerFloat();
  const positions = towerFloatPositionMap(round, selectedSpotKey);
  activeMembers(round).forEach((member) => {
    spawnMarkerFloat(nextDebuffAfterTower(member, round), positions.get(member.role));
  });
}

function markPositionStepOk(selectedSpotKey = null) {
  state.answeredSteps[stepKey()] = "ok";
  if (state.phase === "tower") {
    if (isActive(player(), state.round)) state.markerPulse = true;
    spawnTowerMarkerFloats(state.round, selectedSpotKey);
    return;
  }
  clearMarkerFloat();
}

function debuffBadgeHtml(type, sub = "", large = false) {
  if (!type) {
    return `
      <span class="debuff-text">
        <strong>-</strong>
        ${sub ? `<small>${sub}</small>` : ""}
      </span>
    `;
  }
  const label = type === "guide" ? "誘導" : debuffs[type];
  const display = large ? label : type === "guide" ? "誘" : debuffShort[type];
  return `
    ${debuffIconHtml(type)}
    <span class="debuff-text">
      <strong>${display}</strong>
      ${sub ? `<small>${sub}</small>` : ""}
    </span>
  `;
}

function renderParty() {
  el.partyGroups.innerHTML = "";
  ["A", "B"].forEach((group) => {
    const section = document.createElement("section");
    section.className = `party-group ${groupClass(group)}`;
    section.innerHTML = `<h3>${groupName(group)}</h3>`;

    const list = document.createElement("div");
    list.className = "party-list";
    groupMembers(group).forEach((member) => {
      const currentType = displayDebuffFor(member);
      const row = document.createElement("div");
      row.className = `party-row${member.role === state.selectedRole ? " me" : ""}`;
      row.innerHTML = `
        <strong>${member.role}</strong>
        <span class="mini-debuff">${debuffBadgeHtml(currentType)}</span>
      `;
      list.appendChild(row);
    });
    section.appendChild(list);
    el.partyGroups.appendChild(section);
  });
}

function renderMistakes() {
  if (state.mistakes.length === 0) {
    el.mistakeLog.textContent = "まだありません。";
    return;
  }
  el.mistakeLog.innerHTML = state.mistakes.map((mistake) => `<div class="mistake-item">${mistake}</div>`).join("");
}

function renderEmptyParty() {
  el.partyGroups.innerHTML = ["A", "B"]
    .map(
      (group) => `
        <section class="party-group ${groupClass(group)}">
          <h3>${groupName(group)}</h3>
          <div class="party-list">
            ${roles
              .slice(group === "A" ? 0 : 4, group === "A" ? 4 : 8)
              .map(
                (role) => `
                  <div class="party-row empty">
                    <strong>${role}</strong>
                    <span class="mini-debuff">-</span>
                  </div>
                `,
              )
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");
}

function renderUnknownParty() {
  el.partyGroups.innerHTML = ["A", "B"]
    .map(
      (group) => `
        <section class="party-group ${groupClass(group)}">
          <h3>${groupName(group)}</h3>
          <div class="party-list">
            ${Array.from({ length: 4 })
              .map(
                () => `
                  <div class="party-row empty">
                    <strong>?</strong>
                    <span class="mini-debuff">?</span>
                  </div>
                `,
              )
              .join("")}
          </div>
        </section>
      `,
    )
    .join("");
}

function renderFeedback(message = "正しい立ち位置マーカーをクリックしてください。") {
  el.feedback.className = "feedback";
  if (state.mode === "study") {
    el.feedback.textContent = "正解位置を確認してクリックしてください。";
    return;
  }
  el.feedback.textContent = message;
}

function showScreen(screen) {
  state.screen = screen;
  el.mainGrid.classList.remove("hidden");
  el.setupPanel.classList.toggle("hidden", screen !== "setup");
  el.groupPanel.classList.toggle("hidden", screen !== "grouping");
  el.resultPanel.classList.toggle("hidden", screen !== "result");
  const practice = screen === "practice";
  el.arenaHead.classList.toggle("hidden", !practice);
  el.arena.classList.toggle("hidden", !practice);
  el.feedback.classList.toggle("hidden", !practice);
  el.actionRow.classList.toggle("hidden", !practice);
}

function renderSetup() {
  stopTimer();
  stopGroupTimer();
  showScreen("setup");
  renderEmptyParty();
  el.mistakeLog.textContent = "-";
}

function renderGrouping() {
  stopTimer();
  stopGroupTimer();
  showScreen("grouping");
  const me = player();
  state.groupSelection = null;
  el.groupQuestion.textContent = `${state.selectedRole} はどちらの組ですか？`;
  el.groupDebuffs.innerHTML = methodPairs[state.groupingMethod]
    .map((pair) => {
      const cards = pair
        .map((role) => {
          const member = state.party.find((candidate) => candidate.role === role);
          const meClass = role === state.selectedRole ? " me" : "";
          return `
            <div class="group-debuff-card${meClass}">
              <strong>${role}</strong>
              <span class="mini-debuff">${debuffBadgeHtml(member.initial)}</span>
            </div>
          `;
        })
        .join("");
      return `<div class="group-pair">${cards}</div>`;
    })
    .join("");
  el.groupFeedback.className = "feedback";
  el.groupFeedback.textContent = `${state.groupingMethod === "lean" ? "リーン式" : "ヤーン式"}で判定してください。`;
  el.chooseGroupA.disabled = false;
  el.chooseGroupB.disabled = false;
  el.chooseGroupA.classList.remove("selected");
  el.chooseGroupB.classList.remove("selected");
  el.chooseGroupA.classList.toggle("answer", state.mode === "study" && me.group === "A");
  el.chooseGroupB.classList.toggle("answer", state.mode === "study" && me.group === "B");
  if (state.mode === "study") {
    el.chooseGroupA.disabled = me.group !== "A";
    el.chooseGroupB.disabled = me.group !== "B";
    el.groupFeedback.textContent = "学習: 正解の組を確認して押してください。";
  }
  el.groupPanel.classList.toggle("timer-active", state.mode === "trial");
  if (state.mode === "trial") startGroupTimer();
  renderUnknownParty();
  return me;
}

function renderResult() {
  stopTimer();
  stopGroupTimer();
  showScreen("result");
  renderEmptyParty();
  renderMistakes();
  const missCount = state.mistakes.length;
  if (state.mode === "study") {
    el.resultText.textContent = "学習を最後まで確認しました。";
    return;
  }
  el.resultText.textContent = missCount ? `通し終了。ミスは${missCount}件です。` : "通し終了。全問正解です。";
}

function render() {
  state.screen = "practice";
  showScreen("practice");
  renderStatus();
  renderArena();
  renderRoundTrack();
  renderParty();
  renderMistakes();
  renderFeedback();
  resetTimer();
}

function choosePosition(key) {
  const answer = expectedPosition();
  const acceptedKeys = acceptedPositionKeys();
  state.selectedPosition = key;
  const ok = acceptedKeys.includes(key);
  const timedOut = state.timedOutSteps[stepKey()] === true;

  // 実践モードでは正誤を即時表示せず、選択内容だけ保持してタイマー終了時に判定する。
  if (state.mode === "trial" && !timedOut) {
    clearMarkerFloat();
    state.trialSelections[stepKey()] = { key, ok };
    el.feedback.className = "feedback";
    el.feedback.textContent = `選択済み: ${positionName(key)}`;
    renderArena();
    return;
  }

  if (ok) {
    if (!timedOut) markPositionStepOk(key);
    else state.answeredSteps[stepKey()] = "miss";
    el.feedback.className = "feedback ok";
    if (state.mode === "study" || state.mode === "check" || state.mode === "trial") {
      stopTimer();
      advanceStep();
      return;
    }
    const rewrite =
      state.phase === "tower" && isActive(player(), state.round)
        ? `塔処理後、自分の表示は次の${nextPatternLabel(state.round)}パターンへ張り替わります。`
        : "";
    el.feedback.textContent = `正解。${answer.reason}${rewrite}`;
  } else {
    state.answeredSteps[stepKey()] = "miss";
    if (state.mode === "study") {
      el.feedback.className = "feedback bad";
      el.feedback.textContent = "正解位置を確認してクリックしてください。";
      renderArena();
      return;
    }
    recordMistake(key);
    el.feedback.className = "feedback bad";
    el.feedback.textContent = `${phaseName()}: ${positionName(key)}`;
  }

  stopTimer();
  renderArena();
  renderRoundTrack();
  renderStatus();
  renderParty();
  renderMistakes();
}

function chooseGroup(group) {
  const me = player();
  // 組分けも実践では即時判定しない。選択済み表示だけ行い、制限時間終了時に進行する。
  if (state.mode === "trial") {
    state.groupSelection = group;
    el.chooseGroupA.classList.toggle("selected", group === "A");
    el.chooseGroupB.classList.toggle("selected", group === "B");
    el.groupFeedback.className = "feedback";
    el.groupFeedback.textContent = `選択済み: ${groupName(group)}`;
    return;
  }

  stopGroupTimer();
  if (me.group === group) {
    el.groupFeedback.className = "feedback ok";
    el.groupFeedback.textContent = `正解。${state.selectedRole} は${groupName(group)}です。`;
    el.chooseGroupA.disabled = true;
    el.chooseGroupB.disabled = true;
    state.round = 1;
    state.phase = "tower";
    resetPracticeProgress();
    setTimeout(() => render(), 360);
    return;
  }

  el.groupFeedback.className = "feedback bad";
  el.groupFeedback.textContent = `不正解。${state.selectedRole} のデバフと${state.groupingMethod === "lean" ? "リーン式" : "ヤーン式"}のペアを確認してください。`;
  state.mistakes.push(`組分け: ${state.selectedRole} ${groupName(group)}`);
  renderMistakes();
}

function advanceStep() {
  if (state.mode === "study" && state.answeredSteps[stepKey()] !== "ok") {
    state.selectedPosition = expectedPosition().key;
    state.answeredSteps[stepKey()] = "ok";
    if (state.phase === "tower" && isActive(player(), state.round)) {
      state.markerPulse = true;
      renderStatus();
      renderParty();
    }
  }

  if (state.phase === "guide") {
    if (state.round === 9) {
      state.screen = "result";
      renderResult();
      return;
    }
    state.phase = "tower";
    state.roundPulse = true;
    state.selectedPosition = null;
    render();
    state.roundPulse = false;
    return;
  }

  state.round += 1;
  state.phase = isGuideRound(state.round) ? "guide" : "tower";
  state.roundPulse = true;
  state.selectedPosition = null;
  render();
  state.roundPulse = false;
}

function startNewRun() {
  stopTimer();
  stopGroupTimer();
  state.screen = "grouping";
  state.selectedRole = el.roleSelect.value;
  state.groupingMethod = el.methodSelect.value;
  state.mode = el.modeSelect.value;
  state.round = 1;
  state.phase = "tower";
  state.mistakes = [];
  resetPracticeProgress();
  state.memories = {};
  newParty();
  newMemories();
  renderGrouping();
  renderMistakes();
}

function stopTimer() {
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  el.timerBar.style.width = state.mode === "trial" ? `${(state.secondsLeft / 8) * 100}%` : "100%";
}

function stopGroupTimer() {
  if (state.groupTimerId) {
    clearInterval(state.groupTimerId);
    state.groupTimerId = null;
  }
  if (el.groupTimerBar) el.groupTimerBar.style.width = state.mode === "trial" ? `${(state.groupSecondsLeft / 8) * 100}%` : "100%";
}

function startGroupTimer() {
  stopGroupTimer();
  state.groupSecondsLeft = 8;
  el.groupTimerBar.style.width = "100%";
  state.groupTimerId = setInterval(() => {
    state.groupSecondsLeft -= 1;
    el.groupTimerBar.style.width = `${Math.max(0, (state.groupSecondsLeft / 8) * 100)}%`;
    if (state.groupSecondsLeft <= 0) {
      stopGroupTimer();
      const me = player();
      const selectedGroup = state.groupSelection;
      // 正解を選択済みなら、制限時間終了時点で練習画面へ進む。
      if (selectedGroup === me.group) {
        state.round = 1;
        state.phase = "tower";
        resetPracticeProgress();
        render();
        return;
      }

      if (selectedGroup) {
        state.mistakes.push(`組分け: ${state.selectedRole} ${groupName(selectedGroup)}`);
      } else {
        state.mistakes.push(`組分け: ${state.selectedRole} 未選択`);
      }
      el.groupFeedback.className = "feedback bad";
      el.groupFeedback.textContent = `時間切れ。正解は${groupName(me.group)}です。`;
      el.chooseGroupA.classList.toggle("answer", me.group === "A");
      el.chooseGroupB.classList.toggle("answer", me.group === "B");
      renderMistakes();
    }
  }, 1000);
}

function resetTimer() {
  stopTimer();
  el.arena.classList.toggle("timer-active", state.mode === "trial");
  if (state.mode !== "trial") {
    el.timerBar.style.width = "100%";
    return;
  }
  state.secondsLeft = 8;
  el.timerBar.style.width = "100%";
  state.timerId = setInterval(() => {
    state.secondsLeft -= 1;
    el.timerBar.style.width = `${Math.max(0, (state.secondsLeft / 8) * 100)}%`;
    if (state.secondsLeft <= 0) {
      stopTimer();
      const selection = state.trialSelections[stepKey()];
      state.timedOutSteps[stepKey()] = true;
      if (selection?.ok) {
        markPositionStepOk(selection.key);
        advanceStep();
        return;
      }
      recordMistake(selection?.key);
      state.answeredSteps[stepKey()] = "miss";
      el.feedback.className = "feedback bad";
      el.feedback.textContent = `${phaseName()}: ${positionName(selection?.key)}`;
      renderRoundTrack();
      renderMistakes();
      renderStatus();
      renderParty();
      renderArena();
    }
  }, 1000);
}

el.roleSelect.addEventListener("change", (event) => {
  state.selectedRole = event.target.value;
});

el.modeSelect.addEventListener("change", () => {});

el.newRunButton.addEventListener("click", startNewRun);
el.nextButton.addEventListener("click", advanceStep);
el.chooseGroupA.addEventListener("click", () => chooseGroup("A"));
el.chooseGroupB.addEventListener("click", () => chooseGroup("B"));
el.againButton.addEventListener("click", () => {
  state.screen = "setup";
  renderSetup();
});

initSelectors();
renderSetup();
