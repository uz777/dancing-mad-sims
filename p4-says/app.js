(() => {
  "use strict";

  const RESET_DELAY = 3000;
  const STORAGE_KEY = "p4-says-reverse-order";

  const debuffs = {
    juso: {
      name: "呪詛",
      asset: "juso.png",
      group: "grand-cross",
      result: { true: "みない", false: "みる" },
    },
    light: {
      name: "ライト",
      asset: "light.png",
      group: "grand-cross",
      result: { true: "さんかい", false: "あたま" },
    },
    mizu: {
      name: "水圧縮",
      asset: "mizu.png",
      group: "grand-cross",
      result: { true: "あたま", false: "さんかい" },
    },
    kasokudo: {
      name: "加速度",
      asset: "kasokudo.png",
      group: "grand-cross",
      result: { true: "とまる", false: "うごく" },
    },
    honoh: {
      name: "ほのお",
      asset: "honoh.png",
      group: "elements",
      result: { true: "タケノコ", false: "ドーナツ" },
    },
    tsunami: {
      name: "つなみ",
      asset: "tsunami.png",
      group: "elements",
      result: { true: "ドーナツ", false: "タケノコ" },
    },
  };

  const normalGroups = [
    { id: "elements", items: ["honoh", "tsunami"] },
    { id: "grand-cross", items: ["juso", "light", "mizu", "kasokudo"] },
  ];

  const selections = {
    "grand-cross": null,
    elements: null,
  };

  const resetTimers = {
    "grand-cross": null,
    elements: null,
  };

  const results = {};
  const groupsRoot = document.querySelector("#groups");
  const reverseInput = document.querySelector("#reverse-order");
  const resetButton = document.querySelector("#reset-all");
  const toast = document.querySelector("#toast");
  let toastTimer = null;

  function getStoredReversePreference() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  }

  function storeReversePreference(value) {
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // The app also works when local storage is unavailable.
    }
  }

  function displayGroups() {
    if (!reverseInput.checked) return normalGroups;

    return normalGroups.map((group) => ({
      ...group,
      items: [...group.items].reverse(),
    }));
  }

  function truthButton(groupId, value, label, asset) {
    const selected = selections[groupId] === value;
    return `
      <button
        class="truth-button"
        type="button"
        data-action="select-truth"
        data-group="${groupId}"
        data-value="${value}"
        aria-pressed="${selected}"
        aria-label="${label}を選択"
      >
        <img src="assets/${asset}" alt="" draggable="false">
        <span>${label}</span>
      </button>`;
  }

  function debuffCell(id) {
    const debuff = debuffs[id];
    const result = results[id] || "";
    const confirmed = Boolean(result);
    const importantClass = result === "さんかい" ? " is-important" : "";
    const confirmedClass = confirmed ? " is-confirmed" : "";
    const resultClass = confirmed ? " has-result" : "";

    return `
      <div class="debuff-cell${confirmedClass}">
        <output class="result${resultClass}${importantClass}" data-result-for="${id}" aria-live="polite">${result}</output>
        <button
          class="debuff-button${confirmedClass}"
          type="button"
          data-action="select-debuff"
          data-debuff="${id}"
          aria-label="${debuff.name}${result ? `、${result}` : ""}"
        >
          <img src="assets/${debuff.asset}" alt="" draggable="false">
        </button>
        <span class="debuff-name">${debuff.name}</span>
      </div>`;
  }

  function render() {
    groupsRoot.innerHTML = displayGroups()
      .map(
        (group) => `
          <section class="debuff-group" data-group-panel="${group.id}" aria-label="${group.id === "grand-cross" ? "グランドクロス" : "ほのお・つなみ"}グループ">
            <div class="choice-row">
              ${truthButton(group.id, "true", "ほんと", "honto.png")}
            </div>
            <div class="debuff-list" style="--count: ${group.items.length}">
              ${group.items.map(debuffCell).join("")}
            </div>
            <div class="choice-row">
              ${truthButton(group.id, "false", "うそ", "uso.png")}
            </div>
          </section>`,
      )
      .join("");
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1600);
  }

  function clearSelection(groupId) {
    selections[groupId] = null;
    window.clearTimeout(resetTimers[groupId]);
    resetTimers[groupId] = null;

    document
      .querySelectorAll(`[data-action="select-truth"][data-group="${groupId}"]`)
      .forEach((button) => button.setAttribute("aria-pressed", "false"));
  }

  function selectTruth(groupId, value) {
    window.clearTimeout(resetTimers[groupId]);
    resetTimers[groupId] = null;
    selections[groupId] = value;

    document
      .querySelectorAll(`[data-action="select-truth"][data-group="${groupId}"]`)
      .forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.value === value));
      });
  }

  function scheduleSelectionReset(groupId) {
    window.clearTimeout(resetTimers[groupId]);
    resetTimers[groupId] = window.setTimeout(() => clearSelection(groupId), RESET_DELAY);
  }

  function selectDebuff(id, button) {
    const debuff = debuffs[id];
    const selectedTruth = selections[debuff.group];

    if (selectedTruth === null) {
      showToast("先に「ほんと」か「うそ」を選んでください");
      const panel = button.closest(".debuff-group");
      panel.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-5px)" },
          { transform: "translateX(5px)" },
          { transform: "translateX(0)" },
        ],
        { duration: 180 },
      );
      return;
    }

    const result = debuff.result[selectedTruth];
    results[id] = result;

    const output = document.querySelector(`[data-result-for="${id}"]`);
    output.textContent = result;
    output.classList.add("has-result");
    output.classList.toggle("is-important", result === "さんかい");
    button.setAttribute("aria-label", `${debuff.name}、${result}`);
    button.classList.add("is-confirmed");
    button.closest(".debuff-cell").classList.add("is-confirmed");

    button.classList.remove("is-hit");
    requestAnimationFrame(() => {
      button.classList.add("is-hit");
      window.setTimeout(() => button.classList.remove("is-hit"), 130);
    });

    scheduleSelectionReset(debuff.group);
  }

  function resetAll() {
    Object.keys(results).forEach((key) => delete results[key]);
    Object.keys(selections).forEach(clearSelection);
    render();
    showToast("すべてリセットしました");
  }

  groupsRoot.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    if (button.dataset.action === "select-truth") {
      selectTruth(button.dataset.group, button.dataset.value);
      return;
    }

    selectDebuff(button.dataset.debuff, button);
  });

  reverseInput.addEventListener("change", () => {
    storeReversePreference(reverseInput.checked);
    render();
  });

  resetButton.addEventListener("click", resetAll);

  reverseInput.checked = getStoredReversePreference();
  render();
})();
