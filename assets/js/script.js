const metersEl = document.getElementById("meters");
const sceneLabelEl = document.getElementById("sceneLabel");
const sceneTitleEl = document.getElementById("sceneTitle");
const sceneImageEl = document.getElementById("sceneImage");
const sceneTextEl = document.getElementById("sceneText");
const choicesEl = document.getElementById("choices");
const logListEl = document.getElementById("logList");
const restartBtn = document.getElementById("restartBtn");
const cluesBtn = document.getElementById("cluesBtn");
const backBtn = document.getElementById("backBtn");
const saveSlotsEl = document.getElementById("saveSlots");

let story = window.storyData;

async function loadStory() {
  const storyResp = await fetch("data/story.json", { cache: "no-store" });
  if (!storyResp.ok) {
    throw new Error("Could not load data/story.json");
  }
  const storyData = await storyResp.json();

  const endingsResp = await fetch("data/endings.json", { cache: "no-store" });
  if (endingsResp.ok) {
    const endings = await endingsResp.json();
    storyData.endings = Array.isArray(endings) ? endings : [];
  } else {
    storyData.endings = [];
  }

  return storyData;
}

window.setStory = (nextStory) => {
  story = nextStory;
  if (sceneLabelEl) {
    resetGame();
  }
};

window.getStory = () => JSON.parse(JSON.stringify(story));

async function startGame() {
  if (!sceneLabelEl || !sceneTitleEl || !sceneTextEl || !choicesEl || !metersEl) {
    return;
  }

  try {
    story = await loadStory();
  } catch (error) {
    sceneTitleEl.textContent = "Story Not Loaded";
    sceneTextEl.textContent =
      "Could not load data/story.json. Please run a local server (python server.py) or ensure data/story.json is available when deployed.";
    return;
  }
  const state = {
    meters: JSON.parse(JSON.stringify(story.meters)),
    currentScene: story.start,
    log: [],
    showClues: false,
    chosenChoicesByScene: {},
    history: [],
  };

  function clamp(value, min = 0, max = 100) {
    return Math.max(min, Math.min(max, value));
  }

  function renderMeters() {
    metersEl.innerHTML = "";
    const meterTypes = Object.keys(state.meters);
    meterTypes.forEach((type) => {
      const group = document.createElement("div");
      group.className = "meter-group";

      const label = document.createElement("div");
      label.className = "meter-group__label";
      label.textContent = type;
      group.appendChild(label);

      const bars = document.createElement("div");
      bars.className = "meter-group__bars";

      story.characters.forEach((character) => {
        const value = state.meters[type]?.[character.id] ?? 0;
        const row = document.createElement("div");
        row.className = "meter-mini-row";

        const icon = document.createElement("div");
        icon.className = "meter-mini__icon";
        icon.textContent = character.icon || character.name.slice(0, 1);
        icon.setAttribute("aria-label", character.name);
        icon.style.borderColor = character.color;

        const mini = document.createElement("div");
        mini.className = "meter-mini";
        mini.setAttribute("aria-label", `${character.name} ${type}`);

        const fill = document.createElement("div");
        fill.className = "meter-mini__fill";
        fill.style.width = `${value}%`;
        fill.style.background = character.color;

        mini.appendChild(fill);
        row.appendChild(icon);
        row.appendChild(mini);
        bars.appendChild(row);
      });

      group.appendChild(bars);
      metersEl.appendChild(group);
    });
  }

  function setCluesVisible(isVisible) {
    state.showClues = isVisible;
    if (cluesBtn) {
      cluesBtn.textContent = isVisible ? "Hide Clues" : "Show Clues";
    }
    showScene(state.currentScene);
  }

  function cluesVisible() {
    return state.showClues;
  }

  function logEntry(text) {
    state.log.push(text);
    if (!logListEl) return;
    const item = document.createElement("li");
    item.textContent = text;
    logListEl.appendChild(item);
  }

  function applyEffects(effects) {
    Object.entries(effects).forEach(([meterType, changes]) => {
      if (!state.meters[meterType]) return;
      Object.entries(changes || {}).forEach(([characterId, delta]) => {
        const current = state.meters[meterType]?.[characterId] ?? 0;
        state.meters[meterType][characterId] = clamp(current + delta);
      });
    });
  }

  function getSortedMeters(meterType = "affection") {
    return Object.entries(state.meters[meterType] || {})
      .map(([id, value]) => ({ id, value }))
      .sort((a, b) => b.value - a.value);
  }

  function getTopCharacter(meterType = "affection") {
    const sorted = getSortedMeters(meterType);
    const topId = sorted[0]?.id;
    return story.characters.find((c) => c.id === topId) || null;
  }

  function meetsCondition(cond, meters) {
    if (!cond || !cond.type) return true;
    const meterType = cond.meter || "affection";
    const meterMap = meters[meterType] || {};
    switch (cond.type) {
      case "min":
        return (meterMap[cond.character] ?? 0) >= cond.value;
      case "diff_greater":
        return (meterMap[cond.a] ?? 0) > (meterMap[cond.b] ?? 0) + cond.value;
      case "diff_abs_lte":
        return Math.abs((meterMap[cond.a] ?? 0) - (meterMap[cond.b] ?? 0)) <= cond.value;
      case "max_ge": {
        const max = Math.max(...Object.values(meterMap));
        return max >= cond.value;
      }
      case "max_le": {
        const max = Math.max(...Object.values(meterMap));
        return max <= cond.value;
      }
      case "top_diff_gte": {
        const sorted = getSortedMeters(meterType);
        const top = sorted[0]?.value ?? 0;
        const second = sorted[1]?.value ?? 0;
        return top - second >= cond.value;
      }
      case "top_is": {
        const sorted = getSortedMeters(meterType);
        return sorted[0]?.id === cond.character;
      }
      case "top_diff_lte": {
        const sorted = getSortedMeters(meterType);
        const top = sorted[0]?.value ?? 0;
        const second = sorted[1]?.value ?? 0;
        return top - second <= cond.value;
      }
      case "total_min": {
        const total = Object.values(meterMap).reduce((sum, val) => sum + val, 0);
        return total >= cond.value;
      }
      case "total_max": {
        const total = Object.values(meterMap).reduce((sum, val) => sum + val, 0);
        return total <= cond.value;
      }
      default:
        return true;
    }
  }

  function findEnding() {
    return story.endings.find((ending) =>
      (ending.conditions || []).every((cond) => meetsCondition(cond, state.meters))
    );
  }

  function showScene(sceneId) {
    const scene = story.scenes[sceneId];
    if (!scene) return;

    state.currentScene = sceneId;
    sceneLabelEl.textContent = scene.label;
    sceneTitleEl.textContent = scene.title;
    sceneTextEl.innerHTML = formatTextWithIcons(scene.text);
    if (sceneImageEl) {
      if (scene.image) {
        sceneImageEl.src = scene.image;
        sceneImageEl.style.display = "block";
        sceneImageEl.alt = scene.title;
      } else {
        sceneImageEl.removeAttribute("src");
        sceneImageEl.style.display = "none";
      }
    }

    choicesEl.innerHTML = "";
    renderMeters();

    if (scene.ending) {
      const ending = findEnding();
      if (ending.id.startsWith("true_partner_")) {
        sceneTitleEl.textContent = ending.title;
        sceneTextEl.innerHTML = formatTextWithIcons(ending.text);
      } else {
        sceneTitleEl.textContent = ending.title;
        sceneTextEl.innerHTML = formatTextWithIcons(ending.text);
      }

      const restartBtnInline = document.createElement("button");
      restartBtnInline.className = "btn";
      restartBtnInline.textContent = "Play Again";
      restartBtnInline.type = "button";
      restartBtnInline.addEventListener("click", resetGame);
      choicesEl.appendChild(restartBtnInline);
      return;
    }

    const hideChosen =
      scene.hideChosenChoicesOnReturn ??
      story.settings?.hideChosenChoicesOnReturn ??
      false;
    const chosenSet = state.chosenChoicesByScene[sceneId] || new Set();

    scene.choices.forEach((choice, index) => {
      if (hideChosen && chosenSet.has(index)) {
        return;
      }
      const btn = document.createElement("button");
      btn.className = "choice";
      btn.type = "button";
      btn.innerHTML = formatTextWithIcons(choice.text);

      if (cluesVisible()) {
        const meta = document.createElement("div");
        meta.className = "choice__meta";
        const effects = Object.entries(choice.effects || {})
          .map(([meterType, changes]) => {
            const parts = Object.entries(changes || {})
              .map(([id, delta]) => {
                const character = story.characters.find((c) => c.id === id);
                if (!character) return null;
                const sign = delta >= 0 ? "+" : "";
                return `${character.name} ${sign}${delta}`;
              })
              .filter(Boolean)
              .join(", ");
            return parts ? `${meterType}: ${parts}` : null;
          })
          .filter(Boolean)
          .join(" | ");
        meta.textContent = effects ? effects : "";
        if (effects) btn.appendChild(meta);
      }

      btn.addEventListener("click", () => {
        state.history.push(snapshotState());
        if (hideChosen) {
          if (!state.chosenChoicesByScene[sceneId]) {
            state.chosenChoicesByScene[sceneId] = new Set();
          }
          state.chosenChoicesByScene[sceneId].add(index);
        }
        applyEffects(choice.effects || {});
        logEntry(choice.text);
        const autoEndingsEnabled =
          scene.autoEndings ??
          story.settings?.autoEndingsGlobal ??
          false;
        if (autoEndingsEnabled) {
          const ending = findEnding();
          if (ending) {
            showScene("ending");
            return;
          }
        }
        showScene(choice.next);
      });

      choicesEl.appendChild(btn);
    });
  }

  function resetGame() {
    state.meters = JSON.parse(JSON.stringify(story.meters));
    state.log = [];
    state.chosenChoicesByScene = {};
    state.history = [];
    if (logListEl) {
      logListEl.innerHTML = "";
    }
    showScene(story.start);
  }

  function snapshotState() {
    return {
      meters: JSON.parse(JSON.stringify(state.meters)),
      currentScene: state.currentScene,
      log: [...state.log],
      chosenChoicesByScene: Object.fromEntries(
        Object.entries(state.chosenChoicesByScene).map(([key, value]) => [
          key,
          Array.from(value),
        ])
      ),
    };
  }

  function restoreState(snapshot) {
    state.meters = JSON.parse(JSON.stringify(snapshot.meters));
    state.currentScene = snapshot.currentScene;
    state.log = [...snapshot.log];
    state.chosenChoicesByScene = Object.fromEntries(
      Object.entries(snapshot.chosenChoicesByScene || {}).map(([key, value]) => [
        key,
        new Set(value),
      ])
    );
    if (logListEl) {
      logListEl.innerHTML = "";
      state.log.forEach((entry) => {
        const item = document.createElement("li");
        item.textContent = entry;
        logListEl.appendChild(item);
      });
    }
    showScene(state.currentScene);
  }

  function handleBack() {
    const snapshot = state.history.pop();
    if (snapshot) {
      restoreState(snapshot);
    }
  }

  function handleSave(slot) {
    const payload = snapshotState();
    try {
      payload.savedAt = new Date().toISOString();
      localStorage.setItem(`novelChoicesSaveSlot${slot}`, JSON.stringify(payload));
    } catch (error) {
      // ignore
    }
    updateSlotUI(slot, payload.savedAt);
  }

  function handleLoad(slot) {
    try {
      const raw = localStorage.getItem(`novelChoicesSaveSlot${slot}`);
      if (!raw) return;
      const payload = JSON.parse(raw);
      restoreState(payload);
    } catch (error) {
      // ignore
    }
  }

  function handleClear(slot) {
    try {
      localStorage.removeItem(`novelChoicesSaveSlot${slot}`);
    } catch (error) {
      // ignore
    }
    const slotEl = saveSlotsEl?.querySelector(`.save-slot:nth-child(${slot})`);
    const timeEl = saveSlotsEl?.querySelector(`[data-slot-time="${slot}"]`);
    if (slotEl) {
      slotEl.classList.remove("is-saved");
    }
    if (timeEl) {
      timeEl.textContent = "Empty";
    }
  }

  function updateSlotUI(slot, savedAt) {
    const slotEl = saveSlotsEl?.querySelector(`.save-slot:nth-child(${slot})`);
    const timeEl = saveSlotsEl?.querySelector(`[data-slot-time="${slot}"]`);
    if (slotEl) {
      slotEl.classList.add("is-saved");
    }
    if (timeEl && savedAt) {
      const date = new Date(savedAt);
      timeEl.textContent = isNaN(date) ? "Saved" : date.toLocaleString();
    }
  }

  function hydrateSlotUI() {
    if (!saveSlotsEl) return;
    [1, 2, 3].forEach((slot) => {
      const raw = localStorage.getItem(`novelChoicesSaveSlot${slot}`);
      if (!raw) return;
      try {
        const payload = JSON.parse(raw);
        updateSlotUI(slot, payload.savedAt);
      } catch (error) {
        // ignore
      }
    });
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTextWithIcons(text) {
    if (!text) return "";
    let output = escapeHtml(text);
    const characters = [...story.characters].sort(
      (a, b) => b.name.length - a.name.length
    );
    characters.forEach((character) => {
      const icon = character.icon || character.name.slice(0, 1);
      const name = character.name;
      const pattern = new RegExp(`\\b${name.replace(/[-/\\\\^$*+?.()|[\\]{}]/g, "\\\\$&")}\\b`, "g");
      output = output.replace(
        pattern,
        `<span class="name-pill"><span class="name-pill__icon">${escapeHtml(
          icon
        )}</span>${escapeHtml(name)}</span>`
      );
    });
    return output.replace(/\n/g, "<br />");
  }

  if (restartBtn) {
    restartBtn.addEventListener("click", resetGame);
  }

  if (cluesBtn) {
    setCluesVisible(false);
    cluesBtn.addEventListener("click", () => {
      setCluesVisible(!cluesVisible());
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", handleBack);
  }

  if (saveSlotsEl) {
    saveSlotsEl.addEventListener("click", (event) => {
      const saveSlot = event.target.getAttribute("data-save-slot");
      const loadSlot = event.target.getAttribute("data-load-slot");
      const clearSlot = event.target.getAttribute("data-clear-slot");
      if (saveSlot) {
        handleSave(saveSlot);
      }
      if (loadSlot) {
        handleLoad(loadSlot);
      }
      if (clearSlot) {
        handleClear(clearSlot);
      }
    });
    hydrateSlotUI();
  }

  showScene(story.start);
}

startGame();
