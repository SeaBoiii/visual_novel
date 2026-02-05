const sceneListEl = document.getElementById("sceneList");
const sceneIdInput = document.getElementById("sceneIdInput");
const sceneLabelInput = document.getElementById("sceneLabelInput");
const sceneTitleInput = document.getElementById("sceneTitleInput");
const sceneTextInput = document.getElementById("sceneTextInput");
const sceneImageInput = document.getElementById("sceneImageInput");
const sceneAutoEndingsInput = document.getElementById("sceneAutoEndingsInput");
const sceneImageFile = document.getElementById("sceneImageFile");
const sceneImageUrl = document.getElementById("sceneImageUrl");
const uploadUrlBtn = document.getElementById("uploadUrlBtn");
const uploadStatus = document.getElementById("uploadStatus");
const uploadBar = document.getElementById("uploadBar");
const uploadLabel = document.getElementById("uploadLabel");
const choicesEditorEl = document.getElementById("choicesEditor");
const addChoiceBtn = document.getElementById("addChoiceBtn");
const addSceneBtn = document.getElementById("addSceneBtn");
const deleteSceneBtn = document.getElementById("deleteSceneBtn");
const applyStoryBtn = document.getElementById("applyStoryBtn");
const exportStoryBtn = document.getElementById("exportStoryBtn");
const importStoryBtn = document.getElementById("importStoryBtn");
const storyJsonEl = document.getElementById("storyJson");
const graphCanvas = document.getElementById("graphCanvas");
const autoLayoutBtn = document.getElementById("autoLayoutBtn");
const endingsEditorEl = document.getElementById("endingsEditor");
const addEndingBtn = document.getElementById("addEndingBtn");
const characterEditorEl = document.getElementById("characterEditor");
const graphLegendEl = document.getElementById("graphLegend");
const previewMetersEl = document.getElementById("previewMeters");
const previewSceneLabelEl = document.getElementById("previewSceneLabel");
const previewSceneTitleEl = document.getElementById("previewSceneTitle");
const previewSceneImageEl = document.getElementById("previewSceneImage");
const previewSceneTextEl = document.getElementById("previewSceneText");
const previewChoicesEl = document.getElementById("previewChoices");
const previewResetBtn = document.getElementById("previewResetBtn");

const editorState = {
  story: window.getStory(),
  currentSceneId: null,
};

let autoSaveTimer = null;

const layout = {
  nodeWidth: 200,
  nodeHeight: 74,
  colGap: 140,
  rowGap: 50,
};

const graphView = {
  scale: 1.25,
  x: 0,
  y: 0,
  isPanning: false,
  lastX: 0,
  lastY: 0,
};

const graphFilterState = {
  labels: new Set(),
};

const previewState = {
  meters: null,
  currentScene: null,
  history: [],
  chosenChoicesByScene: {},
};

const previewDragState = {
  isDragging: false,
  meterType: null,
  characterId: null,
};

const CONDITION_TYPES = [
  "min",
  "diff_greater",
  "diff_abs_lte",
  "max_ge",
  "max_le",
  "top_is",
  "top_diff_gte",
  "top_diff_lte",
  "total_min",
  "total_max",
];

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
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
  const characters = [...editorState.story.characters].sort(
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

function trimText(value, maxLength) {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

const GROUP_COLORS = [
  "#6e5aa8",
  "#b5525c",
  "#5b7aa4",
  "#7a8f4a",
  "#c28a3a",
  "#3d7c6b",
  "#8a5a3b",
  "#3f6aa5",
];

function getGroupColorMap() {
  const labels = new Set();
  listSceneIds().forEach((sceneId) => {
    const label = getScene(sceneId)?.label;
    if (label) {
      labels.add(label.trim());
    }
  });
  const colorMap = {};
  Array.from(labels).forEach((label, idx) => {
    colorMap[label] = GROUP_COLORS[idx % GROUP_COLORS.length];
  });
  colorMap.Ending = "rgba(122, 143, 74, 0.9)";
  return colorMap;
}

function renderLegend(colorMap) {
  if (!graphLegendEl) return;
  const labels = Object.keys(colorMap);
  if (!labels.length) {
    graphLegendEl.innerHTML = "";
    return;
  }
  graphLegendEl.innerHTML = "";
  labels.forEach((label) => {
    const item = document.createElement("div");
    item.className = "graph__legend-item";
    if (!graphFilterState.labels.has(label)) {
      item.classList.add("is-inactive");
    }
    item.addEventListener("click", () => {
      if (graphFilterState.labels.has(label)) {
        graphFilterState.labels.delete(label);
      } else {
        graphFilterState.labels.add(label);
      }
      renderGraph();
    });
    const swatch = document.createElement("span");
    swatch.className = "graph__legend-swatch";
    swatch.style.background = colorMap[label];
    const text = document.createElement("span");
    text.textContent = label;
    item.appendChild(swatch);
    item.appendChild(text);
    graphLegendEl.appendChild(item);
  });
}

function getLabelList() {
  const labels = new Set();
  listSceneIds().forEach((sceneId) => {
    const label = getScene(sceneId)?.label;
    if (label) {
      labels.add(label.trim());
    }
  });
  if (Array.isArray(editorState.story.endings) && editorState.story.endings.length) {
    labels.add("Ending");
  }
  return Array.from(labels);
}

function ensureFilterState(labels) {
  if (!graphFilterState.labels.size) {
    return;
  }
  Array.from(graphFilterState.labels).forEach((label) => {
    if (!labels.includes(label)) {
      graphFilterState.labels.delete(label);
    }
  });
}

function initPreviewState(startSceneId) {
  previewState.meters = clone(editorState.story.meters);
  previewState.currentScene = startSceneId || editorState.story.start;
  previewState.history = [];
  previewState.chosenChoicesByScene = {};
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function setPreviewMeterValue(meterType, characterId, value) {
  if (!previewState.meters?.[meterType]) return;
  previewState.meters[meterType][characterId] = clamp(value);
}

function updatePreviewMeterFromEvent(event, meterType, characterId, target) {
  const rect = target.getBoundingClientRect();
  const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
  const pct = Math.round((x / rect.width) * 100);
  setPreviewMeterValue(meterType, characterId, pct);
  renderPreviewMeters();
}

function renderPreviewMeters() {
  if (!previewMetersEl) return;
  previewMetersEl.innerHTML = "";
  const meterTypes = Object.keys(previewState.meters || {});
  meterTypes.forEach((type) => {
    const group = document.createElement("div");
    group.className = "meter-group";

    const label = document.createElement("div");
    label.className = "meter-group__label";
    label.textContent = type;
    group.appendChild(label);

    const bars = document.createElement("div");
    bars.className = "meter-group__bars";

    editorState.story.characters.forEach((character) => {
      const value = previewState.meters?.[type]?.[character.id] ?? 0;
      const row = document.createElement("div");
      row.className = "meter-mini-row";

      const icon = document.createElement("div");
      icon.className = "meter-mini__icon";
      icon.textContent = character.icon || character.name.slice(0, 1);
      icon.setAttribute("aria-label", character.name);
      icon.style.borderColor = character.color;

      const mini = document.createElement("div");
      mini.className = "meter-mini meter-mini--interactive";
      mini.setAttribute("aria-label", `${character.name} ${type}`);
      mini.dataset.meterType = type;
      mini.dataset.characterId = character.id;

      const fill = document.createElement("div");
      fill.className = "meter-mini__fill";
      fill.style.width = `${value}%`;
      fill.style.background = character.color;

      mini.appendChild(fill);
      row.appendChild(icon);
      row.appendChild(mini);
      bars.appendChild(row);

      mini.addEventListener("pointerdown", (event) => {
        previewDragState.isDragging = true;
        previewDragState.meterType = type;
        previewDragState.characterId = character.id;
        mini.setPointerCapture(event.pointerId);
        updatePreviewMeterFromEvent(event, type, character.id, mini);
      });
      mini.addEventListener("pointermove", (event) => {
        if (!previewDragState.isDragging) return;
        if (
          previewDragState.meterType !== type ||
          previewDragState.characterId !== character.id
        ) {
          return;
        }
        updatePreviewMeterFromEvent(event, type, character.id, mini);
      });
      mini.addEventListener("pointerup", () => {
        previewDragState.isDragging = false;
        previewDragState.meterType = null;
        previewDragState.characterId = null;
      });
      mini.addEventListener("pointerleave", () => {
        if (previewDragState.isDragging) {
          previewDragState.isDragging = false;
          previewDragState.meterType = null;
          previewDragState.characterId = null;
        }
      });
    });

    group.appendChild(bars);
    previewMetersEl.appendChild(group);
  });
}

function applyPreviewEffects(effects) {
  Object.entries(effects).forEach(([meterType, changes]) => {
    if (!previewState.meters[meterType]) return;
    Object.entries(changes || {}).forEach(([characterId, delta]) => {
      const current = previewState.meters[meterType]?.[characterId] ?? 0;
      previewState.meters[meterType][characterId] = clamp(current + delta);
    });
  });
}

function getPreviewSortedMeters(meterType = "affection") {
  return Object.entries(previewState.meters[meterType] || {})
    .map(([id, value]) => ({ id, value }))
    .sort((a, b) => b.value - a.value);
}

function previewMeetsCondition(cond) {
  if (!cond || !cond.type) return true;
  const meterType = cond.meter || "affection";
  const meterMap = previewState.meters[meterType] || {};
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
      const sorted = getPreviewSortedMeters(meterType);
      const top = sorted[0]?.value ?? 0;
      const second = sorted[1]?.value ?? 0;
      return top - second >= cond.value;
    }
    case "top_is": {
      const sorted = getPreviewSortedMeters(meterType);
      return sorted[0]?.id === cond.character;
    }
    case "top_diff_lte": {
      const sorted = getPreviewSortedMeters(meterType);
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

function previewFindEnding() {
  return editorState.story.endings.find((ending) =>
    (ending.conditions || []).every((cond) => previewMeetsCondition(cond))
  );
}

function renderPreviewEnding(ending) {
  if (!ending) return;
  if (previewSceneLabelEl) previewSceneLabelEl.textContent = "Ending";
  if (previewSceneTitleEl) previewSceneTitleEl.textContent = ending.title || "Ending";
  if (previewSceneTextEl) {
    previewSceneTextEl.innerHTML = formatTextWithIcons(ending.text || "");
  }
  if (previewSceneImageEl) {
    previewSceneImageEl.removeAttribute("src");
    previewSceneImageEl.style.display = "none";
  }
  if (!previewChoicesEl) return;
  previewChoicesEl.innerHTML = "";
  const restartBtn = document.createElement("button");
  restartBtn.className = "btn";
  restartBtn.type = "button";
  restartBtn.textContent = "Restart Preview";
  restartBtn.addEventListener("click", () => {
    initPreviewState();
    renderPreviewScene(previewState.currentScene);
  });
  previewChoicesEl.appendChild(restartBtn);
}

function renderPreviewScene(sceneId) {
  const scene = editorState.story.scenes[sceneId];
  if (!scene || !previewSceneTitleEl || !previewSceneTextEl || !previewChoicesEl) return;

  previewState.currentScene = sceneId;
  if (previewSceneLabelEl) previewSceneLabelEl.textContent = scene.label || "";
  previewSceneTitleEl.textContent = scene.title || sceneId;
  previewSceneTextEl.innerHTML = formatTextWithIcons(scene.text || "");

  if (previewSceneImageEl) {
    if (scene.image) {
      previewSceneImageEl.src = scene.image;
      previewSceneImageEl.style.display = "block";
      previewSceneImageEl.alt = scene.title || "";
    } else {
      previewSceneImageEl.removeAttribute("src");
      previewSceneImageEl.style.display = "none";
    }
  }

  renderPreviewMeters();
  previewChoicesEl.innerHTML = "";

  if (scene.ending) {
    const ending = previewFindEnding();
    renderPreviewEnding(ending);
    return;
  }

  const hideChosen =
    scene.hideChosenChoicesOnReturn ??
    editorState.story.settings?.hideChosenChoicesOnReturn ??
    false;
  const chosenSet = previewState.chosenChoicesByScene[sceneId] || new Set();

  (scene.choices || []).forEach((choice, index) => {
    if (hideChosen && chosenSet.has(index)) return;
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.type = "button";
    btn.innerHTML = formatTextWithIcons(choice.text || "");
    btn.addEventListener("click", () => {
      if (hideChosen) {
        if (!previewState.chosenChoicesByScene[sceneId]) {
          previewState.chosenChoicesByScene[sceneId] = new Set();
        }
        previewState.chosenChoicesByScene[sceneId].add(index);
      }
      applyPreviewEffects(choice.effects || {});
      const autoEndingsEnabled =
        scene.autoEndings ?? editorState.story.settings?.autoEndingsGlobal ?? false;
      if (autoEndingsEnabled) {
        const ending = previewFindEnding();
        if (ending) {
          renderPreviewEnding(ending);
          return;
        }
      }
      renderPreviewScene(choice.next);
    });
    previewChoicesEl.appendChild(btn);
  });
}

function jumpPreviewTo(sceneId) {
  if (!editorState.story.scenes[sceneId]) return;
  initPreviewState(sceneId);
  renderPreviewScene(sceneId);
}

function previewEndingById(endingId) {
  const ending = editorState.story.endings.find((item) => item.id === endingId);
  if (!ending) return;
  renderPreviewEnding(ending);
}

function ensureMeters() {
  const meters = editorState.story.meters || {};
  const isFlat = Object.values(meters).every((value) => typeof value === "number");
  if (isFlat) {
    editorState.story.meters = { affection: { ...meters } };
  }
  if (!editorState.story.meters.affection) {
    editorState.story.meters.affection = {};
  }
  if (!editorState.story.meters.trust) {
    editorState.story.meters.trust = {};
  }
  if (!editorState.story.meters.tension) {
    editorState.story.meters.tension = {};
  }
  editorState.story.characters.forEach((character) => {
    if (editorState.story.meters.affection[character.id] === undefined) {
      editorState.story.meters.affection[character.id] = 30;
    }
    if (editorState.story.meters.trust[character.id] === undefined) {
      editorState.story.meters.trust[character.id] = 25;
    }
    if (editorState.story.meters.tension[character.id] === undefined) {
      editorState.story.meters.tension[character.id] = 20;
    }
  });
}

function getMeterTypes() {
  return Object.keys(editorState.story.meters || {});
}

function getScene(sceneId) {
  return editorState.story.scenes[sceneId];
}

function listSceneIds() {
  return Object.keys(editorState.story.scenes);
}

function ensureCurrentScene() {
  if (!editorState.currentSceneId) {
    editorState.currentSceneId = editorState.story.start;
  }
  if (!editorState.story.scenes[editorState.currentSceneId]) {
    editorState.currentSceneId = listSceneIds()[0];
  }
}

function renderSceneList() {
  ensureCurrentScene();
  sceneListEl.innerHTML = "";
  const ids = listSceneIds();

  ids.forEach((sceneId) => {
    const scene = getScene(sceneId);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "scene-card";
    if (sceneId === editorState.currentSceneId) {
      card.classList.add("scene-card--active");
    }

    const title = document.createElement("div");
    title.className = "scene-card__title";
    title.textContent = scene.title || sceneId;

    const meta = document.createElement("div");
    meta.className = "scene-card__meta";
    const nextIds = (scene.choices || []).map((choice) => choice.next).filter(Boolean);
    const missing = nextIds.filter((id) => !editorState.story.scenes[id]);
    meta.textContent = nextIds.length
      ? `Next: ${nextIds.join(", ")}`
      : "No choices";
    if (missing.length) {
      meta.classList.add("scene-card__meta--missing");
      meta.textContent = `Missing targets: ${missing.join(", ")}`;
    }

    card.appendChild(title);
    card.appendChild(meta);
    card.addEventListener("click", () => {
      editorState.currentSceneId = sceneId;
      renderEditor();
    });

    sceneListEl.appendChild(card);
  });
}

function renderSceneForm() {
  const scene = getScene(editorState.currentSceneId);
  if (!scene) return;
  sceneIdInput.value = editorState.currentSceneId;
  sceneLabelInput.value = scene.label || "";
  sceneTitleInput.value = scene.title || "";
  sceneTextInput.value = scene.text || "";
  sceneImageInput.value = scene.image || "";
  if (sceneAutoEndingsInput) {
    sceneAutoEndingsInput.checked = !!scene.autoEndings;
  }
  if (sceneImageUrl) {
    sceneImageUrl.value = "";
  }
}

function updateSceneFromForm() {
  const scene = getScene(editorState.currentSceneId);
  if (!scene) return;
  scene.label = sceneLabelInput.value.trim();
  scene.title = sceneTitleInput.value.trim();
  scene.text = sceneTextInput.value.trim();
  scene.image = sceneImageInput.value.trim();
  if (sceneAutoEndingsInput) {
    scene.autoEndings = sceneAutoEndingsInput.checked || undefined;
  }
  renderSceneList();
  renderGraph();
  updateJsonArea();
}

function renameScene(newId) {
  const oldId = editorState.currentSceneId;
  if (!newId || newId === oldId) return;
  if (editorState.story.scenes[newId]) {
    alert("Scene id already exists.");
    sceneIdInput.value = oldId;
    return;
  }

  editorState.story.scenes[newId] = editorState.story.scenes[oldId];
  delete editorState.story.scenes[oldId];

  Object.values(editorState.story.scenes).forEach((scene) => {
    (scene.choices || []).forEach((choice) => {
      if (choice.next === oldId) {
        choice.next = newId;
      }
    });
  });

  if (editorState.story.start === oldId) {
    editorState.story.start = newId;
  }

  editorState.currentSceneId = newId;
  renderEditor();
}

function renderChoicesEditor() {
  const scene = getScene(editorState.currentSceneId);
  if (!scene) return;
  choicesEditorEl.innerHTML = "";

  (scene.choices || []).forEach((choice, index) => {
    const row = document.createElement("div");
    row.className = "choice-row";

    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.placeholder = "Choice text";
    textInput.value = choice.text || "";

    const nextInput = document.createElement("input");
    nextInput.type = "text";
    nextInput.placeholder = "Next scene id";
    nextInput.value = choice.next || "";

    const grid = document.createElement("div");
    grid.className = "choice-row__grid";
    grid.appendChild(textInput);
    grid.appendChild(nextInput);

    textInput.addEventListener("input", () => {
      choice.text = textInput.value;
      updateJsonArea();
    });

    nextInput.addEventListener("input", () => {
      choice.next = nextInput.value.trim();
      renderSceneList();
      renderGraph();
      updateJsonArea();
    });

    row.appendChild(grid);

    const meterTypes = getMeterTypes();
    choice.effects = choice.effects || {};

    meterTypes.forEach((meterType) => {
      const meterGroup = document.createElement("div");
      meterGroup.className = "choice-row__meter";

      const meterTitle = document.createElement("div");
      meterTitle.className = "choice-row__meter-title";
      meterTitle.textContent = meterType;
      meterGroup.appendChild(meterTitle);

      const meterGrid = document.createElement("div");
      meterGrid.className = "choice-row__grid";

      editorState.story.characters.forEach((character) => {
        const effectInput = document.createElement("input");
        effectInput.type = "number";
        effectInput.placeholder = `${character.name} +/-`;
        const val = (choice.effects[meterType] || {})[character.id];
        effectInput.value = Number.isFinite(val) ? val : "";
        effectInput.addEventListener("input", () => {
          choice.effects[meterType] = choice.effects[meterType] || {};
          const parsed = Number(effectInput.value);
          if (Number.isFinite(parsed)) {
            choice.effects[meterType][character.id] = parsed;
          } else {
            delete choice.effects[meterType][character.id];
          }
          updateJsonArea();
        });
        meterGrid.appendChild(effectInput);
      });

      meterGroup.appendChild(meterGrid);
      row.appendChild(meterGroup);
    });

    const actions = document.createElement("div");
    actions.className = "choice-row__actions";
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn--ghost";
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      scene.choices.splice(index, 1);
      renderEditor();
    });

    actions.appendChild(removeBtn);

    row.appendChild(actions);
    choicesEditorEl.appendChild(row);
  });
}

function renderEndingsEditor() {
  if (!endingsEditorEl) return;
  endingsEditorEl.innerHTML = "";

  editorState.story.endings.forEach((ending, endingIndex) => {
    const card = document.createElement("div");
    card.className = "ending-card";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = ending.title || "";
    titleInput.placeholder = "Ending title";
    titleInput.addEventListener("input", () => {
      ending.title = titleInput.value;
      updateJsonArea();
    });

    const textInput = document.createElement("textarea");
    textInput.rows = 3;
    textInput.value = ending.text || "";
    textInput.placeholder = "Ending text";
    textInput.addEventListener("input", () => {
      ending.text = textInput.value;
      updateJsonArea();
    });

    const conditionsWrapper = document.createElement("div");
    conditionsWrapper.className = "ending-conditions";

    const targets = document.createElement("div");
    targets.className = "ending-targets";

    const targetsTitle = document.createElement("div");
    targetsTitle.className = "ending-targets__title";
    targetsTitle.textContent = "Target meter hints";
    targets.appendChild(targetsTitle);

    const targetsList = document.createElement("div");
    targetsList.className = "ending-targets__list";
    const targetLines = summarizeEndingTargets(ending);
    if (targetLines.length) {
      targetLines.forEach((line) => {
        const item = document.createElement("div");
        item.textContent = line;
        targetsList.appendChild(item);
      });
    } else {
      const empty = document.createElement("div");
      empty.textContent = "No conditions set yet.";
      targetsList.appendChild(empty);
    }
    targets.appendChild(targetsList);

    const applySampleBtn = document.createElement("button");
    applySampleBtn.className = "btn btn--ghost ending-targets__btn";
    applySampleBtn.type = "button";
    applySampleBtn.textContent = "Apply Sample Meters";
    applySampleBtn.addEventListener("click", () => {
      const sample = generateSampleMetersForEnding(ending);
      if (sample) {
        previewState.meters = sample;
        renderPreviewScene(previewState.currentScene || editorState.story.start);
      }
    });
    targets.appendChild(applySampleBtn);

    (ending.conditions || []).forEach((condition, conditionIndex) => {
      const row = document.createElement("div");
      row.className = "condition-row";

      const grid = document.createElement("div");
      grid.className = "condition-grid";

      const typeSelect = document.createElement("select");
      CONDITION_TYPES.forEach((type) => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        if (condition.type === type) {
          option.selected = true;
        }
        typeSelect.appendChild(option);
      });
      typeSelect.addEventListener("change", () => {
        condition.type = typeSelect.value;
        updateJsonArea();
      });

      const meterSelect = document.createElement("select");
      getMeterTypes().forEach((meterType) => {
        const option = document.createElement("option");
        option.value = meterType;
        option.textContent = meterType;
        if ((condition.meter || "affection") === meterType) {
          option.selected = true;
        }
        meterSelect.appendChild(option);
      });
      meterSelect.addEventListener("change", () => {
        condition.meter = meterSelect.value;
        updateJsonArea();
      });

      const characterSelect = document.createElement("select");
      const emptyChar = document.createElement("option");
      emptyChar.value = "";
      emptyChar.textContent = "character";
      characterSelect.appendChild(emptyChar);
      editorState.story.characters.forEach((character) => {
        const option = document.createElement("option");
        option.value = character.id;
        option.textContent = character.name;
        if (condition.character === character.id) {
          option.selected = true;
        }
        characterSelect.appendChild(option);
      });
      characterSelect.addEventListener("change", () => {
        condition.character = characterSelect.value || undefined;
        updateJsonArea();
      });

      const aSelect = document.createElement("select");
      const emptyA = document.createElement("option");
      emptyA.value = "";
      emptyA.textContent = "a";
      aSelect.appendChild(emptyA);
      editorState.story.characters.forEach((character) => {
        const option = document.createElement("option");
        option.value = character.id;
        option.textContent = character.name;
        if (condition.a === character.id) {
          option.selected = true;
        }
        aSelect.appendChild(option);
      });
      aSelect.addEventListener("change", () => {
        condition.a = aSelect.value || undefined;
        updateJsonArea();
      });

      const bSelect = document.createElement("select");
      const emptyB = document.createElement("option");
      emptyB.value = "";
      emptyB.textContent = "b";
      bSelect.appendChild(emptyB);
      editorState.story.characters.forEach((character) => {
        const option = document.createElement("option");
        option.value = character.id;
        option.textContent = character.name;
        if (condition.b === character.id) {
          option.selected = true;
        }
        bSelect.appendChild(option);
      });
      bSelect.addEventListener("change", () => {
        condition.b = bSelect.value || undefined;
        updateJsonArea();
      });

      const valueInput = document.createElement("input");
      valueInput.type = "number";
      valueInput.placeholder = "value";
      valueInput.value = Number.isFinite(condition.value) ? condition.value : "";
      valueInput.addEventListener("input", () => {
        const parsed = Number(valueInput.value);
        condition.value = Number.isFinite(parsed) ? parsed : undefined;
        updateJsonArea();
      });

      grid.appendChild(typeSelect);
      grid.appendChild(meterSelect);
      grid.appendChild(characterSelect);
      grid.appendChild(aSelect);
      grid.appendChild(bSelect);
      grid.appendChild(valueInput);

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn--ghost";
      removeBtn.type = "button";
      removeBtn.textContent = "Remove Condition";
      removeBtn.addEventListener("click", () => {
        ending.conditions.splice(conditionIndex, 1);
        renderEndingsEditor();
        updateJsonArea();
      });

      row.appendChild(grid);
      row.appendChild(removeBtn);
      conditionsWrapper.appendChild(row);
    });

    const addConditionBtn = document.createElement("button");
    addConditionBtn.className = "btn btn--ghost";
    addConditionBtn.type = "button";
    addConditionBtn.textContent = "Add Condition";
    addConditionBtn.addEventListener("click", () => {
      ending.conditions = ending.conditions || [];
      ending.conditions.push({ type: "min", meter: "affection", value: 50 });
      renderEndingsEditor();
      updateJsonArea();
    });

    card.appendChild(titleInput);
    card.appendChild(textInput);
    card.appendChild(targets);
    card.appendChild(conditionsWrapper);
    card.appendChild(addConditionBtn);

    const removeEndingBtn = document.createElement("button");
    removeEndingBtn.className = "btn btn--ghost";
    removeEndingBtn.type = "button";
    removeEndingBtn.textContent = "Remove Ending";
    removeEndingBtn.addEventListener("click", () => {
      editorState.story.endings.splice(endingIndex, 1);
      renderEndingsEditor();
      updateJsonArea();
    });

    card.appendChild(removeEndingBtn);
    endingsEditorEl.appendChild(card);
  });
}

function summarizeEndingTargets(ending) {
  const lines = [];
  (ending.conditions || []).forEach((cond) => {
    if (!cond || !cond.type) return;
    const meter = cond.meter || "affection";
    switch (cond.type) {
      case "min":
        lines.push(`${meter}.${cond.character || "character"} >= ${cond.value ?? "value"}`);
        break;
      case "diff_greater":
        lines.push(`${meter}.${cond.a || "a"} > ${meter}.${cond.b || "b"} + ${cond.value ?? "value"}`);
        break;
      case "diff_abs_lte":
        lines.push(
          `|${meter}.${cond.a || "a"} - ${meter}.${cond.b || "b"}| <= ${cond.value ?? "value"}`
        );
        break;
      case "max_ge":
        lines.push(`max(${meter}[*]) >= ${cond.value ?? "value"}`);
        break;
      case "max_le":
        lines.push(`max(${meter}[*]) <= ${cond.value ?? "value"}`);
        break;
      case "top_is":
        lines.push(`top(${meter}) is ${cond.character || "character"}`);
        break;
      case "top_diff_gte":
        lines.push(`top(${meter}) - second(${meter}) >= ${cond.value ?? "value"}`);
        break;
      case "top_diff_lte":
        lines.push(`top(${meter}) - second(${meter}) <= ${cond.value ?? "value"}`);
        break;
      case "total_min":
        lines.push(`sum(${meter}[*]) >= ${cond.value ?? "value"}`);
        break;
      case "total_max":
        lines.push(`sum(${meter}[*]) <= ${cond.value ?? "value"}`);
        break;
      default:
        lines.push(`${cond.type} (${meter})`);
        break;
    }
  });
  return lines;
}

function generateSampleMetersForEnding(ending) {
  const meters = clone(editorState.story.meters || {});
  const characters = editorState.story.characters || [];

  function ensureMeterType(meterType) {
    meters[meterType] = meters[meterType] || {};
    characters.forEach((character) => {
      if (!Number.isFinite(meters[meterType][character.id])) {
        meters[meterType][character.id] = 50;
      }
    });
  }

  function clampAll(meterType) {
    Object.keys(meters[meterType] || {}).forEach((id) => {
      meters[meterType][id] = clamp(meters[meterType][id], 0, 100);
    });
  }

  function getSorted(meterType) {
    return Object.entries(meters[meterType] || {})
      .map(([id, value]) => ({ id, value }))
      .sort((a, b) => b.value - a.value);
  }

  (ending.conditions || []).forEach((cond) => {
    if (!cond || !cond.type) return;
    const meterType = cond.meter || "affection";
    ensureMeterType(meterType);
    const map = meters[meterType];

    switch (cond.type) {
      case "min": {
        if (!cond.character) break;
        map[cond.character] = Math.max(map[cond.character] ?? 0, cond.value ?? 0);
        break;
      }
      case "max_ge": {
        const sorted = getSorted(meterType);
        const targetId = sorted[0]?.id || characters[0]?.id;
        if (targetId) {
          map[targetId] = Math.max(map[targetId] ?? 0, cond.value ?? 0);
        }
        break;
      }
      case "max_le": {
        Object.keys(map).forEach((id) => {
          map[id] = Math.min(map[id], cond.value ?? map[id]);
        });
        break;
      }
      case "top_is": {
        if (!cond.character) break;
        const sorted = getSorted(meterType);
        const topOther = sorted.find((item) => item.id !== cond.character);
        const target = (topOther?.value ?? 0) + 1;
        map[cond.character] = Math.max(map[cond.character] ?? 0, target);
        break;
      }
      case "top_diff_gte": {
        const sorted = getSorted(meterType);
        const topId = sorted[0]?.id || characters[0]?.id;
        const secondVal = sorted[1]?.value ?? 0;
        if (topId) {
          const needed = secondVal + (cond.value ?? 0);
          map[topId] = Math.max(map[topId] ?? 0, needed);
        }
        break;
      }
      case "top_diff_lte": {
        const sorted = getSorted(meterType);
        const topId = sorted[0]?.id;
        const secondId = sorted[1]?.id;
        if (!topId || !secondId) break;
        const diff = (map[topId] ?? 0) - (map[secondId] ?? 0);
        const maxDiff = cond.value ?? 0;
        if (diff > maxDiff) {
          const targetSecond = (map[topId] ?? 0) - maxDiff;
          map[secondId] = Math.min(100, Math.max(map[secondId] ?? 0, targetSecond));
        }
        break;
      }
      case "diff_greater": {
        if (!cond.a || !cond.b) break;
        const bVal = map[cond.b] ?? 0;
        map[cond.a] = Math.max(map[cond.a] ?? 0, bVal + (cond.value ?? 0) + 1);
        break;
      }
      case "diff_abs_lte": {
        if (!cond.a || !cond.b) break;
        const aVal = map[cond.a] ?? 0;
        const bVal = map[cond.b] ?? 0;
        const maxDiff = cond.value ?? 0;
        if (Math.abs(aVal - bVal) > maxDiff) {
          if (aVal >= bVal) {
            map[cond.b] = Math.min(100, aVal - maxDiff);
          } else {
            map[cond.a] = Math.min(100, bVal - maxDiff);
          }
        }
        break;
      }
      case "total_min": {
        const total = Object.values(map).reduce((sum, val) => sum + val, 0);
        const needed = (cond.value ?? 0) - total;
        if (needed > 0 && characters.length) {
          const bump = Math.ceil(needed / characters.length);
          characters.forEach((character) => {
            map[character.id] = (map[character.id] ?? 0) + bump;
          });
        }
        break;
      }
      case "total_max": {
        const total = Object.values(map).reduce((sum, val) => sum + val, 0);
        const over = total - (cond.value ?? total);
        if (over > 0 && characters.length) {
          const drop = Math.ceil(over / characters.length);
          characters.forEach((character) => {
            map[character.id] = (map[character.id] ?? 0) - drop;
          });
        }
        break;
      }
      default:
        break;
    }

    clampAll(meterType);
  });

  return meters;
}

function renderCharacterEditor() {
  if (!characterEditorEl) return;
  characterEditorEl.innerHTML = "";

  editorState.story.characters.forEach((character) => {
    const card = document.createElement("div");
    card.className = "character-card";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = character.name || "";
    nameInput.placeholder = "Name";
    nameInput.addEventListener("input", () => {
      character.name = nameInput.value;
      renderSceneList();
      updateJsonArea();
    });

    const iconInput = document.createElement("input");
    iconInput.type = "text";
    iconInput.value = character.icon || "";
    iconInput.placeholder = "Icon / emoji";
    iconInput.addEventListener("input", () => {
      character.icon = iconInput.value;
      updateJsonArea();
    });

    const colorInput = document.createElement("input");
    colorInput.type = "text";
    colorInput.value = character.color || "";
    colorInput.placeholder = "#rrggbb";
    colorInput.addEventListener("input", () => {
      character.color = colorInput.value;
      updateJsonArea();
    });

    card.appendChild(nameInput);
    card.appendChild(iconInput);
    card.appendChild(colorInput);
    characterEditorEl.appendChild(card);
  });
}

function updateJsonArea() {
  storyJsonEl.value = JSON.stringify(editorState.story, null, 2);
}

function scheduleAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(() => {
    autoSaveTimer = null;
    // auto-save disabled
  }, 1000);
}

async function autoSaveStory() {
  // auto-save disabled (story.json is source of truth)
}

function renderEditor() {
  ensureMeters();
  renderSceneList();
  renderSceneForm();
  renderChoicesEditor();
  renderGraph();
  renderEndingsEditor();
  renderCharacterEditor();
  updateJsonArea();
  if (!previewState.meters) {
    initPreviewState();
  }
  if (previewState.currentScene) {
    renderPreviewScene(previewState.currentScene);
  }
}

function addScene() {
  const newId = prompt("New scene id (letters, numbers, underscores):");
  if (!newId) return;
  if (editorState.story.scenes[newId]) {
    alert("Scene id already exists.");
    return;
  }
  editorState.story.scenes[newId] = {
    label: "New Chapter",
    title: "Untitled Scene",
    text: "Write your scene text here.",
    image: "",
    choices: [],
  };
  editorState.currentSceneId = newId;
  renderEditor();
}

function deleteScene() {
  const sceneId = editorState.currentSceneId;
  if (!sceneId) return;
  if (!confirm(`Delete scene "${sceneId}"?`)) return;
  delete editorState.story.scenes[sceneId];
  if (editorState.story.start === sceneId) {
    editorState.story.start = listSceneIds()[0] || "";
  }
  editorState.currentSceneId = listSceneIds()[0] || null;
  renderEditor();
}

function addChoice() {
  const scene = getScene(editorState.currentSceneId);
  if (!scene) return;
  scene.choices = scene.choices || [];
  scene.choices.push({
    text: "New choice",
    effects: {},
    next: "",
  });
  renderEditor();
}

function addEnding() {
  editorState.story.endings.push({
    id: `ending_${editorState.story.endings.length + 1}`,
    title: "New Ending",
    text: "Describe this ending.",
    conditions: [],
  });
  renderEndingsEditor();
  updateJsonArea();
}

function applyStory() {
  const nextStory = clone(editorState.story);
  window.setStory(nextStory);
}

function exportStory() {
  updateJsonArea();
  storyJsonEl.focus();
  storyJsonEl.select();
}

function importStory() {
  try {
    const raw = storyJsonEl.value.trim();
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (jsonError) {
      let objectText = raw;
      if (raw.includes("window.storyData")) {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
          objectText = raw.slice(start, end + 1);
        }
      }
      // Fallback for JS-style objects with trailing commas.
      parsed = Function(`"use strict"; return (${objectText});`)();
    }
    if (!parsed || !parsed.scenes || !parsed.characters) {
      alert("JSON missing required fields: scenes, characters.");
      return;
    }
    editorState.story = parsed;
    editorState.currentSceneId = parsed.start;
    renderEditor();
  } catch (error) {
    alert(`Could not parse JSON. ${error.message || ""}`.trim());
  }
}

function renderGraph() {
  const nodes = {};
  const missingNodes = {};
  const edges = [];
  const ids = listSceneIds();
  const colorMap = getGroupColorMap();
  const labels = getLabelList();
  ensureFilterState(labels);

  ids.forEach((id) => {
    const scene = getScene(id);
    const label = scene.label || "Scene";
    if (!graphFilterState.labels.has(label)) {
      return;
    }
    nodes[id] = {
      id,
      title: scene.title || id,
      missing: false,
      autoEndings: !!scene.autoEndings,
      hideChosen: !!scene.hideChosenChoicesOnReturn,
      groupLabel: label,
      groupColor: colorMap[label] || colorMap.Scene || "#6e5aa8",
    };
    (scene.choices || []).forEach((choice) => {
      if (choice.next) {
        edges.push({ from: id, to: choice.next });
        if (!editorState.story.scenes[choice.next]) {
          missingNodes[choice.next] = {
            id: choice.next,
            title: "Missing",
            missing: true,
          };
        }
      }
    });
  });

  Object.assign(nodes, missingNodes);
  edges.splice(
    0,
    edges.length,
    ...edges.filter((edge) => nodes[edge.from] && nodes[edge.to])
  );

  // Add virtual nodes for endings so the route is visible.
  if (Array.isArray(editorState.story.endings) && editorState.story.endings.length) {
    editorState.story.endings.forEach((ending) => {
      const endId = `ending:${ending.id}`;
      if (!graphFilterState.labels.has("Ending")) {
        return;
      }
      nodes[endId] = {
        id: endId,
        title: ending.title || ending.id,
        missing: false,
        isEnding: true,
        autoEndings: !!ending.autoEndings,
        groupLabel: "Ending",
        groupColor: colorMap.Ending,
      };
      if (editorState.story.scenes.ending) {
        edges.push({ from: "ending", to: endId, isEndingEdge: true });
      }
    });
  }

  const depths = {};
  const queue = [];
  const start = editorState.story.start;
  if (start && nodes[start]) {
    depths[start] = 0;
    queue.push(start);
  }

  while (queue.length) {
    const current = queue.shift();
    const currentDepth = depths[current] ?? 0;
    edges
      .filter((edge) => edge.from === current)
      .forEach((edge) => {
        if (depths[edge.to] === undefined) {
          depths[edge.to] = currentDepth + 1;
          queue.push(edge.to);
        }
      });
  }

  const maxDepth = Math.max(0, ...Object.values(depths));
  Object.keys(nodes).forEach((id, index) => {
    if (depths[id] === undefined) {
      depths[id] = maxDepth + 1 + index * 0.1;
    }
  });

  const columns = {};
  Object.entries(depths).forEach(([id, depth]) => {
    const key = Math.floor(depth);
    columns[key] = columns[key] || [];
    columns[key].push(id);
  });

  // Order nodes within each column to reduce crossings.
  const incoming = {};
  edges.forEach((edge) => {
    incoming[edge.to] = incoming[edge.to] || [];
    incoming[edge.to].push(edge.from);
  });

  Object.keys(columns).forEach((colKey) => {
    columns[colKey].sort((a, b) => {
      const aParents = incoming[a] || [];
      const bParents = incoming[b] || [];
      const aMin = Math.min(...aParents.map((p) => depths[p] ?? 0), depths[a] ?? 0);
      const bMin = Math.min(...bParents.map((p) => depths[p] ?? 0), depths[b] ?? 0);
      if (aMin !== bMin) return aMin - bMin;
      const aTitle = nodes[a]?.title || a;
      const bTitle = nodes[b]?.title || b;
      return aTitle.localeCompare(bTitle);
    });
  });

  const positions = {};
  const colKeys = Object.keys(columns).map(Number).sort((a, b) => a - b);
  colKeys.forEach((depth) => {
    const col = columns[depth];
    col.forEach((id, rowIndex) => {
      positions[id] = {
        x: depth * (layout.nodeWidth + layout.colGap),
        y: rowIndex * (layout.nodeHeight + layout.rowGap),
      };
    });
  });

  const totalWidth = (colKeys.length || 1) * (layout.nodeWidth + layout.colGap);
  const maxRows = Math.max(1, ...Object.values(columns).map((col) => col.length));
  const totalHeight = maxRows * (layout.nodeHeight + layout.rowGap);

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `0 0 ${totalWidth} ${totalHeight}`);
  svg.setAttribute("role", "img");

  const defs = document.createElementNS(svgNS, "defs");
  const marker = document.createElementNS(svgNS, "marker");
  marker.setAttribute("id", "arrow");
  marker.setAttribute("markerWidth", "10");
  marker.setAttribute("markerHeight", "10");
  marker.setAttribute("refX", "9");
  marker.setAttribute("refY", "5");
  marker.setAttribute("orient", "auto");
  const arrow = document.createElementNS(svgNS, "path");
  arrow.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
  arrow.setAttribute("fill", "rgba(28, 28, 28, 0.6)");
  marker.appendChild(arrow);
  defs.appendChild(marker);
  svg.appendChild(defs);

  edges.forEach((edge) => {
    if (!positions[edge.from] || !positions[edge.to]) return;
    const startPos = positions[edge.from];
    const endPos = positions[edge.to];
    const line = document.createElementNS(svgNS, "path");
    const startX = startPos.x + layout.nodeWidth;
    const startY = startPos.y + layout.nodeHeight / 2;
    const endX = endPos.x;
    const endY = endPos.y + layout.nodeHeight / 2;
    const midX = startX + (endX - startX) * 0.5;
    line.setAttribute(
      "d",
      `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
    );
    line.setAttribute("class", "graph-link");
    if (!editorState.story.scenes[edge.to]) {
      line.classList.add("graph-link--missing");
    }
    if (edge.isEndingEdge) {
      line.classList.add("graph-link--ending");
    }
    line.setAttribute("marker-end", "url(#arrow)");
    svg.appendChild(line);
  });

  Object.values(nodes).forEach((node) => {
    const pos = positions[node.id];
    if (!pos) return;
    const group = document.createElementNS(svgNS, "g");
    group.setAttribute("class", "graph-node");
    if (node.id === editorState.currentSceneId) {
      group.classList.add("graph-node--active");
    }
    if (node.missing) {
      group.classList.add("graph-node--missing");
    }
    if (node.autoEndings) {
      group.classList.add("graph-node--autoend");
    }
    if (node.hideChosen) {
      group.classList.add("graph-node--hidechosen");
    }
    if (node.isEnding) {
      group.classList.add("graph-node--ending");
    }

    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", pos.x);
    rect.setAttribute("y", pos.y);
    rect.setAttribute("width", layout.nodeWidth);
    rect.setAttribute("height", layout.nodeHeight);
    if (node.isEnding) {
      rect.classList.add("graph-node__rect--ending");
    }

    const bar = document.createElementNS(svgNS, "rect");
    bar.setAttribute("x", pos.x);
    bar.setAttribute("y", pos.y);
    bar.setAttribute("width", 8);
    bar.setAttribute("height", layout.nodeHeight);
    bar.setAttribute("rx", 10);
    bar.setAttribute("ry", 10);
    bar.setAttribute("class", "graph-node__bar");
    if (node.groupColor) {
      bar.setAttribute("fill", node.groupColor);
    }

    const title = document.createElementNS(svgNS, "text");
    title.setAttribute("x", pos.x + 14);
    title.setAttribute("y", pos.y + 24);
    title.textContent = trimText(node.title, 26);

    const subtitle = document.createElementNS(svgNS, "text");
    subtitle.setAttribute("x", pos.x + 14);
    subtitle.setAttribute("y", pos.y + 44);
    subtitle.textContent = trimText(node.id, 22);

    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("x", pos.x + 14);
    label.setAttribute("y", pos.y + 62);
    label.setAttribute("class", "graph-node__label");
    label.textContent = trimText(node.groupLabel || "", 18);

    group.appendChild(rect);
    group.appendChild(bar);

    const badges = [];
    if (node.autoEndings) {
      badges.push({ label: "A", cls: "graph-badge--auto" });
    }
    if (node.hideChosen) {
      badges.push({ label: "H", cls: "graph-badge--hide" });
    }

    badges.forEach((badge, idx) => {
      const badgeGroup = document.createElementNS(svgNS, "g");
      badgeGroup.setAttribute("class", `graph-badge ${badge.cls}`);

      const badgeRect = document.createElementNS(svgNS, "rect");
      badgeRect.setAttribute("x", pos.x + layout.nodeWidth - 18 - idx * 18);
      badgeRect.setAttribute("y", pos.y + 6);
      badgeRect.setAttribute("width", 14);
      badgeRect.setAttribute("height", 14);
      badgeRect.setAttribute("rx", 4);
      badgeRect.setAttribute("ry", 4);

      const badgeText = document.createElementNS(svgNS, "text");
      badgeText.setAttribute("x", pos.x + layout.nodeWidth - 11 - idx * 18);
      badgeText.setAttribute("y", pos.y + 17);
      badgeText.setAttribute("text-anchor", "middle");
      badgeText.textContent = badge.label;

      badgeGroup.appendChild(badgeRect);
      badgeGroup.appendChild(badgeText);
      group.appendChild(badgeGroup);
    });
    group.appendChild(title);
    group.appendChild(subtitle);
    if (node.groupLabel) {
      group.appendChild(label);
    }

    if (!node.missing) {
      group.addEventListener("click", () => {
        if (node.isEnding) {
          previewEndingById(node.id.replace("ending:", ""));
          return;
        }
        editorState.currentSceneId = node.id;
        renderEditor();
        jumpPreviewTo(node.id);
      });
    }

    svg.appendChild(group);
  });

  graphCanvas.innerHTML = "";
  const viewport = document.createElement("div");
  viewport.className = "graph__viewport";
  viewport.appendChild(svg);
  graphCanvas.appendChild(viewport);
  renderLegend(colorMap);
  adjustDefaultZoom(Object.keys(nodes).length);
  applyGraphTransform();
}

function setUploadProgress(value, label) {
  if (uploadBar) {
    uploadBar.style.width = `${value}%`;
  }
  if (uploadLabel) {
    uploadLabel.textContent = label;
  }
}

function sceneSlug() {
  return (editorState.currentSceneId || "scene").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
}

function uploadWithProgress(url, formData) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(pct, `Uploading... ${pct}%`);
      } else {
        setUploadProgress(50, "Uploading...");
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error("Upload failed"));
      }
    };

    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(formData);
  });
}

async function handleImageUpload(file) {
  if (!file) return;
  const scene = getScene(editorState.currentSceneId);
  if (!scene) return;

  setUploadProgress(0, "Preparing upload...");
  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("name", sceneSlug());

  try {
    const responseText = await uploadWithProgress("/upload", formData);
    const data = JSON.parse(responseText);
    scene.image = data.path;
    sceneImageInput.value = scene.image;
    updateJsonArea();
    renderGraph();
    setUploadProgress(100, "Uploaded");
  } catch (error) {
    setUploadProgress(0, "Upload failed");
  }
}

async function pollDownload(jobId) {
  let done = false;
  while (!done) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const response = await fetch(`/upload-status?id=${encodeURIComponent(jobId)}`);
    if (!response.ok) {
      setUploadProgress(0, "Upload failed");
      return null;
    }
    const data = await response.json();
    if (data.status === "error") {
      setUploadProgress(0, "Upload failed");
      return null;
    }
    if (data.progress !== undefined) {
      setUploadProgress(data.progress, `Downloading... ${data.progress}%`);
    }
    if (data.status === "done") {
      done = true;
      return data.path;
    }
  }
  return null;
}

async function handleImageUrlUpload() {
  const scene = getScene(editorState.currentSceneId);
  if (!scene) return;
  const url = (sceneImageUrl?.value || "").trim();
  if (!url) return;

  setUploadProgress(0, "Starting download...");
  try {
    const response = await fetch("/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, name: sceneSlug() }),
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    const path = await pollDownload(data.id);
    if (!path) return;
    scene.image = path;
    sceneImageInput.value = scene.image;
    updateJsonArea();
    renderGraph();
    setUploadProgress(100, "Downloaded");
  } catch (error) {
    setUploadProgress(0, "Upload failed");
  }
}

sceneLabelInput.addEventListener("input", updateSceneFromForm);
sceneTitleInput.addEventListener("input", updateSceneFromForm);
sceneTextInput.addEventListener("input", updateSceneFromForm);
sceneImageInput.addEventListener("input", updateSceneFromForm);
if (sceneAutoEndingsInput) {
  sceneAutoEndingsInput.addEventListener("change", updateSceneFromForm);
}
sceneIdInput.addEventListener("change", () => renameScene(sceneIdInput.value.trim()));
sceneImageFile.addEventListener("change", (event) => handleImageUpload(event.target.files[0]));
if (uploadUrlBtn) {
  uploadUrlBtn.addEventListener("click", handleImageUrlUpload);
}
addChoiceBtn.addEventListener("click", addChoice);
addSceneBtn.addEventListener("click", addScene);
deleteSceneBtn.addEventListener("click", deleteScene);
applyStoryBtn.addEventListener("click", applyStory);
exportStoryBtn.addEventListener("click", exportStory);
importStoryBtn.addEventListener("click", importStory);
autoLayoutBtn.addEventListener("click", renderGraph);
if (addEndingBtn) {
  addEndingBtn.addEventListener("click", addEnding);
}
if (previewResetBtn) {
  previewResetBtn.addEventListener("click", () => {
    initPreviewState();
    renderPreviewScene(previewState.currentScene);
  });
}

async function loadStoryForEditor() {
  try {
    const resp = await fetch("data/story.json", { cache: "no-store" });
    if (!resp.ok) {
      throw new Error("Could not load data/story.json");
    }
    const parsed = await resp.json();
    const endingsResp = await fetch("data/endings.json", { cache: "no-store" });
    if (endingsResp.ok) {
      const endings = await endingsResp.json();
      parsed.endings = Array.isArray(endings) ? endings : [];
    } else {
      parsed.endings = [];
    }
    editorState.story = parsed;
    editorState.currentSceneId = parsed.start;
  } catch (error) {
    editorState.story = window.getStory();
  }
  renderEditor();
}

loadStoryForEditor();

function applyGraphTransform() {
  const viewport = graphCanvas.querySelector(".graph__viewport");
  if (!viewport) return;
  viewport.style.transform = `translate(${graphView.x}px, ${graphView.y}px) scale(${graphView.scale})`;
}

function clampGraphScale(next) {
  return Math.min(10, Math.max(0.6, next));
}

function handleGraphWheel(event) {
  event.preventDefault();
  const rect = graphCanvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left - 24;
  const mouseY = event.clientY - rect.top - 24;
  const delta = event.deltaY < 0 ? 1.1 : 0.9;
  const nextScale = clampGraphScale(graphView.scale * delta);
  const scaleRatio = nextScale / graphView.scale;
  graphView.x = mouseX - (mouseX - graphView.x) * scaleRatio;
  graphView.y = mouseY - (mouseY - graphView.y) * scaleRatio;
  graphView.scale = nextScale;
  applyGraphTransform();
}

function handleGraphPointerDown(event) {
  if (event.target.closest(".graph-node")) return;
  if (event.button !== 0) return;
  graphView.isPanning = true;
  graphView.lastX = event.clientX;
  graphView.lastY = event.clientY;
  graphCanvas.classList.add("is-grabbing");
  graphCanvas.setPointerCapture(event.pointerId);
}

function handleGraphPointerMove(event) {
  if (!graphView.isPanning) return;
  const dx = event.clientX - graphView.lastX;
  const dy = event.clientY - graphView.lastY;
  graphView.x += dx;
  graphView.y += dy;
  graphView.lastX = event.clientX;
  graphView.lastY = event.clientY;
  applyGraphTransform();
}

function handleGraphPointerUp(event) {
  graphView.isPanning = false;
  graphCanvas.classList.remove("is-grabbing");
  graphCanvas.releasePointerCapture(event.pointerId);
}

graphCanvas.addEventListener("wheel", handleGraphWheel, { passive: false });
graphCanvas.addEventListener("pointerdown", handleGraphPointerDown);
graphCanvas.addEventListener("pointermove", handleGraphPointerMove);
graphCanvas.addEventListener("pointerup", handleGraphPointerUp);
graphCanvas.addEventListener("pointerleave", handleGraphPointerUp);

function adjustDefaultZoom(nodeCount) {
  // Larger graphs zoom out slightly; smaller graphs zoom in.
  if (nodeCount <= 20) {
    graphView.scale = Math.max(graphView.scale, 1.35);
  } else if (nodeCount <= 40) {
    graphView.scale = Math.max(graphView.scale, 1.15);
  } else if (nodeCount <= 80) {
    graphView.scale = Math.max(graphView.scale, 0.95);
  } else {
    graphView.scale = Math.max(graphView.scale, 0.8);
  }
}
