const state = {
  design: null,
  build: null,
  issues: [],
  aiRawText: "",
  focusedIssueIndex: null,
  selectedIssueIndex: null,
  showAnnotations: true,
  reviewSkillText: "",
  ocrCache: null,
  annotationBoxes: [],
  annotationDrag: null,
};

const els = {
  designInput: document.querySelector("#designInput"),
  buildInput: document.querySelector("#buildInput"),
  designDetect: document.querySelector("#designDetect"),
  buildDetect: document.querySelector("#buildDetect"),
  designDpr: document.querySelector("#designDpr"),
  buildDpr: document.querySelector("#buildDpr"),
  designBaseWidth: document.querySelector("#designBaseWidth"),
  widthPolicy: document.querySelector("#widthPolicy"),
  reviewTarget: document.querySelector("#reviewTarget"),
  previewMode: document.querySelector("#previewMode"),
  colorTolerance: document.querySelector("#colorTolerance"),
  spacingTolerance: document.querySelector("#spacingTolerance"),
  fontTolerance: document.querySelector("#fontTolerance"),
  aiBaseUrl: document.querySelector("#aiBaseUrl"),
  aiApiKey: document.querySelector("#aiApiKey"),
  aiModel: document.querySelector("#aiModel"),
  aiNotes: document.querySelector("#aiNotes"),
  aiConfigPanel: document.querySelector("#aiConfigPanel"),
  aiConfigSummary: document.querySelector("#aiConfigSummary"),
  aiTestBtn: document.querySelector("#aiTestBtn"),
  aiReviewBtn: document.querySelector("#aiReviewBtn"),
  aiStatus: document.querySelector("#aiStatus"),
  aiResult: document.querySelector("#aiResult"),
  demoBtn: document.querySelector("#demoBtn"),
  inspectBtn: document.querySelector("#inspectBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  copyReportBtn: document.querySelector("#copyReportBtn"),
  annotationToggle: document.querySelector("#annotationToggle"),
  designCanvas: document.querySelector("#designCanvas"),
  buildCanvas: document.querySelector("#buildCanvas"),
  compareStage: document.querySelector("#compareStage"),
  designMeta: document.querySelector("#designMeta"),
  buildMeta: document.querySelector("#buildMeta"),
  issueList: document.querySelector("#issueList"),
  scoreValue: document.querySelector("#scoreValue"),
};

const SAMPLE_COLS = 24;
const SAMPLE_ROWS = 52;
const AI_SETTINGS_KEY = "ui-lens-ai-settings";
const REVIEW_SKILL_PATH = "./skills/design-qa-review/SKILL.md";
const OCR_ASSISTED_LOCATION = true;
const SEGMENTED_LOCATION = true;
const AI_LOCATION_FALLBACK = false;
const LOCATION_SEGMENT_HEIGHT = 360;
const LOCATION_SEGMENT_OVERLAP = 60;
const LOCATION_CELL_COLS = 6;
const LOCATION_CELL_ROWS = 4;
const DESKTOP_REGION_KEYS = [
  "top_nav",
  "left_menu",
  "left_filter_panel",
  "top_tabs",
  "toolbar",
  "main_table",
  "bottom_task_area",
  "bottom_toolbar",
  "right_panel",
  "whole_page",
];
const MOBILE_REGION_KEYS = [
  "mobile_status_nav",
  "mobile_tabs",
  "mobile_top_cards",
  "mobile_chart",
  "mobile_function_grid",
  "mobile_bottom_nav",
  "whole_page",
];
const FALLBACK_REVIEW_SKILL = `# 灵镜 UI 设计走查
- 只判断 UI 还原问题，不判断业务数据正确性。
- 忽略设计稿假数据和开发真实数据的内容差异。
- 不做简单像素 diff，按设计师走查习惯检查颜色、字号层级、间距、宽高、圆角、布局对齐、图标样式和固定高度。
- 宽度不同不直接判错，自适应组件重点检查高度、padding、边距关系、内容对齐和纵向位置。
- 移动端重点看状态栏、安全区、导航栏、底部栏、卡片和触控控件。
- 桌面端重点看顶部导航、侧栏、筛选区、工具栏、表格行高列宽、单元格 padding、按钮输入框高度和信息密度。
- 只返回网站要求的 JSON，issues 最多 8 个，并提供开发截图中可见的 keywords 和 regionKey。`;
const DEVICE_PRESETS = [
  { name: "iPhone SE / 8", width: 750, height: 1334, dpr: 2, ptWidth: 375, ptHeight: 667 },
  { name: "iPhone 11 / XR", width: 828, height: 1792, dpr: 2, ptWidth: 414, ptHeight: 896 },
  { name: "iPhone 12/13 mini", width: 1080, height: 2340, dpr: 3, ptWidth: 360, ptHeight: 780 },
  { name: "iPhone 12/13/14", width: 1170, height: 2532, dpr: 3, ptWidth: 390, ptHeight: 844 },
  { name: "iPhone 14 Plus", width: 1284, height: 2778, dpr: 3, ptWidth: 428, ptHeight: 926 },
  { name: "iPhone 14 Pro", width: 1179, height: 2556, dpr: 3, ptWidth: 393, ptHeight: 852 },
  { name: "iPhone 14 Pro Max", width: 1290, height: 2796, dpr: 3, ptWidth: 430, ptHeight: 932 },
  { name: "iPhone 15 / 15 Pro", width: 1179, height: 2556, dpr: 3, ptWidth: 393, ptHeight: 852 },
  { name: "iPhone 15 Plus / Pro Max", width: 1290, height: 2796, dpr: 3, ptWidth: 430, ptHeight: 932 },
  { name: "iPhone 16 / 16 Pro", width: 1206, height: 2622, dpr: 3, ptWidth: 402, ptHeight: 874 },
  { name: "iPhone 16 Plus / Pro Max", width: 1320, height: 2868, dpr: 3, ptWidth: 440, ptHeight: 956 },
  { name: "Pixel / Android 1080p", width: 1080, height: 2400, dpr: 3, ptWidth: 360, ptHeight: 800 },
  { name: "Android 720p", width: 720, height: 1600, dpr: 2, ptWidth: 360, ptHeight: 800 },
  { name: "Android 1440p", width: 1440, height: 3200, dpr: 4, ptWidth: 360, ptHeight: 800 },
];

function readNumber(input, fallback) {
  const value = Number.parseFloat(input.value);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, url, name: file.name });
    image.onerror = reject;
    image.src = url;
  });
}

function loadImageFromUrl(src, name) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, url: src, name });
    image.onerror = reject;
    image.src = src;
  });
}

function normalizeBaseUrl(url) {
  return url.trim().replace(/\/+$/, "");
}

function getChatCompletionsUrl(baseUrl) {
  if (baseUrl.endsWith("/chat/completions")) return baseUrl;
  return `${baseUrl}/chat/completions`;
}

function loadAISettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(AI_SETTINGS_KEY) || "{}");
    els.aiBaseUrl.value = settings.baseUrl || "";
    els.aiApiKey.value = settings.apiKey || "";
    els.aiModel.value = settings.model || "";
    els.aiNotes.value = settings.notes || "";
    if (els.reviewTarget) els.reviewTarget.value = settings.reviewTarget || "auto";
    if (els.previewMode) els.previewMode.value = settings.previewMode || "auto";
    syncAIConfigPanel();
  } catch {
    localStorage.removeItem(AI_SETTINGS_KEY);
    syncAIConfigPanel();
  }
}

function saveAISettings() {
  const settings = {
    baseUrl: els.aiBaseUrl.value.trim(),
    apiKey: els.aiApiKey.value.trim(),
    model: els.aiModel.value.trim(),
    notes: els.aiNotes.value.trim(),
    reviewTarget: els.reviewTarget?.value || "auto",
    previewMode: els.previewMode?.value || "auto",
  };
  localStorage.setItem(AI_SETTINGS_KEY, JSON.stringify(settings));
  syncAIConfigPanel();
}

function hasRequiredAISettings() {
  return Boolean(els.aiBaseUrl.value.trim() && els.aiApiKey.value.trim() && els.aiModel.value.trim());
}

function syncAIConfigPanel() {
  if (!els.aiConfigPanel) return;
  const ready = hasRequiredAISettings();
  els.aiConfigPanel.open = !ready;
  if (els.aiConfigSummary) {
    els.aiConfigSummary.textContent = ready ? els.aiModel.value.trim() : "未配置";
  }
}

async function loadReviewSkill() {
  if (state.reviewSkillText) return state.reviewSkillText;
  try {
    const response = await fetch(REVIEW_SKILL_PATH, { cache: "no-cache" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    const text = (await response.text()).trim();
    state.reviewSkillText = text || FALLBACK_REVIEW_SKILL;
  } catch {
    state.reviewSkillText = FALLBACK_REVIEW_SKILL;
  }
  return state.reviewSkillText;
}

function getReviewSkillPrompt() {
  const text = state.reviewSkillText || FALLBACK_REVIEW_SKILL;
  return `项目内置走查 skill，请严格遵守。\\n---\\n${text}\\n---`;
}

function getImageInfo(kind) {
  const item = state[kind];
  if (!item) return null;
  const dpr = readNumber(kind === "design" ? els.designDpr : els.buildDpr, 1);
  return {
    ...item,
    dpr,
    ptWidth: item.image.naturalWidth / dpr,
    ptHeight: item.image.naturalHeight / dpr,
  };
}

function orientationSafeSize(width, height) {
  return {
    short: Math.min(width, height),
    long: Math.max(width, height),
  };
}

function findDevicePreset(width, height) {
  const size = orientationSafeSize(width, height);
  let best = null;

  DEVICE_PRESETS.forEach((preset) => {
    const presetSize = orientationSafeSize(preset.width, preset.height);
    const delta = Math.abs(size.short - presetSize.short) + Math.abs(size.long - presetSize.long);
    const tolerance = Math.max(10, Math.round(presetSize.short * 0.025));
    if (delta <= tolerance && (!best || delta < best.delta)) {
      best = { ...preset, delta };
    }
  });

  return best;
}

function scoreDprCandidate(width, height, dpr) {
  const ptWidth = width / dpr;
  const ptHeight = height / dpr;
  const commonWidths = [360, 375, 390, 393, 402, 414, 428, 430, 440];
  const widthScore = Math.min(...commonWidths.map((value) => Math.abs(ptWidth - value)));
  const integerPenalty = Math.abs(ptWidth - Math.round(ptWidth)) + Math.abs(ptHeight - Math.round(ptHeight));
  const rangePenalty = ptWidth < 320 || ptWidth > 480 ? 80 : 0;
  return widthScore + integerPenalty * 2 + rangePenalty;
}

function isDesktopLikeImage(width, height) {
  return width >= 900 && width / Math.max(1, height) >= 1.15;
}

function getReviewTargetForImage(width, height) {
  const value = els.reviewTarget?.value || "auto";
  if (value === "mobile" || value === "desktop") return value;
  return isDesktopLikeImage(width, height) ? "desktop" : "mobile";
}

function getCurrentReviewTarget() {
  const value = els.reviewTarget?.value || "auto";
  if (value === "mobile" || value === "desktop") return value;
  const images = [state.design?.image, state.build?.image].filter(Boolean);
  return images.some((image) => isDesktopLikeImage(image.naturalWidth, image.naturalHeight))
    ? "desktop"
    : "mobile";
}

function getReviewTargetLabel() {
  return getCurrentReviewTarget() === "desktop" ? "桌面端 Web" : "移动端";
}

function inferImageScale(width, height, kind) {
  const reviewTarget = getReviewTargetForImage(width, height);
  if (reviewTarget === "desktop") {
    return {
      dpr: 1,
      ptWidth: width,
      ptHeight: height,
      device: "桌面端 Web 截图",
      confidence: "高",
      source: "按桌面端 1x 处理",
    };
  }

  const preset = findDevicePreset(width, height);
  if (preset) {
    return {
      dpr: preset.dpr,
      ptWidth: width / preset.dpr,
      ptHeight: height / preset.dpr,
      device: preset.name,
      confidence: preset.delta === 0 ? "高" : "中",
      source: "匹配常见机型",
    };
  }

  const candidates = kind === "design" ? [1, 2, 3] : [3, 2, 4, 1];
  const bestDpr = candidates
    .map((dpr) => ({ dpr, score: scoreDprCandidate(width, height, dpr) }))
    .sort((a, b) => a.score - b.score)[0].dpr;

  return {
    dpr: bestDpr,
    ptWidth: width / bestDpr,
    ptHeight: height / bestDpr,
    device: "未匹配到具体机型",
    confidence: bestDpr === 1 && kind === "design" ? "中" : "低",
    source: "按常见 DPR 推测",
  };
}

function formatDetectResult(item) {
  if (!item?.detected) return "上传后自动识别分辨率和 1x 尺寸";
  const { image, detected } = item;
  const currentDpr =
    state.design === item ? readNumber(els.designDpr, detected.dpr) : readNumber(els.buildDpr, detected.dpr);
  const ptWidth = Math.round(image.naturalWidth / currentDpr);
  const ptHeight = Math.round(image.naturalHeight / currentDpr);
  const suffix = currentDpr === detected.dpr ? "" : "；已手动覆盖 DPR";
  return `${image.naturalWidth} x ${image.naturalHeight} px → ${ptWidth} x ${ptHeight} pt @${currentDpr}x
${detected.device}；置信度：${detected.confidence}；${detected.source}${suffix}`;
}

function applyDetectedScale(kind) {
  const item = state[kind];
  if (!item) return;
  const detected = inferImageScale(item.image.naturalWidth, item.image.naturalHeight, kind);
  item.detected = detected;
  const dprInput = kind === "design" ? els.designDpr : els.buildDpr;
  dprInput.value = String(detected.dpr);
  if (kind === "design") {
    els.designBaseWidth.value = String(Math.round(item.image.naturalWidth / detected.dpr));
  }
  const detectEl = kind === "design" ? els.designDetect : els.buildDetect;
  detectEl.textContent = formatDetectResult(item);
  detectEl.classList.toggle("is-low-confidence", detected.confidence === "低");
}

function refreshDetectSummary(kind) {
  const item = state[kind];
  if (!item) return;
  const detectEl = kind === "design" ? els.designDetect : els.buildDetect;
  detectEl.textContent = formatDetectResult(item);
}

function configureCanvas(canvas, cssWidth, cssHeight) {
  const ratio = window.devicePixelRatio || 1;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.max(1, Math.round(cssWidth * ratio));
  canvas.height = Math.max(1, Math.round(cssHeight * ratio));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  return ctx;
}

function updateCompareStageMode() {
  const hasAnyImage = Boolean(state.design || state.build);
  const previewMode = els.previewMode?.value || "auto";
  const largePreview = hasAnyImage && (previewMode === "large" || (previewMode === "auto" && getCurrentReviewTarget() === "desktop"));
  els.compareStage.classList.toggle("is-empty", !hasAnyImage);
  els.compareStage.classList.toggle("has-images", hasAnyImage);
  els.compareStage.classList.toggle("is-large-preview", largePreview);
}

function getPlaceholderWidth(canvas) {
  const frame = canvas.closest(".phone-frame");
  if (!frame) return 320;
  return Math.max(260, Math.round(frame.clientWidth - 24));
}

function getCanvasDisplaySize(info, canvas) {
  const availableWidth = getPlaceholderWidth(canvas);
  const displayScale = Math.min(1, availableWidth / info.ptWidth);
  return {
    width: Math.max(1, Math.round(info.ptWidth * displayScale)),
    height: Math.max(1, Math.round(info.ptHeight * displayScale)),
    scale: displayScale,
  };
}

function drawImagePreview(kind) {
  updateCompareStageMode();
  const info = getImageInfo(kind);
  const canvas = kind === "design" ? els.designCanvas : els.buildCanvas;
  const meta = kind === "design" ? els.designMeta : els.buildMeta;
  if (kind === "build") canvas.classList.remove("has-annotations", "is-dragging");

  if (!info) {
    const cssWidth = getPlaceholderWidth(canvas);
    const cssHeight = 520;
    const ctx = configureCanvas(canvas, cssWidth, cssHeight);
    drawPlaceholder(ctx, cssWidth, cssHeight, kind === "design" ? "设计稿" : "开发截图");
    meta.textContent = "未上传";
    return;
  }

  const { width: cssWidth, height: cssHeight } = getCanvasDisplaySize(info, canvas);
  const ctx = configureCanvas(canvas, cssWidth, cssHeight);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  ctx.drawImage(info.image, 0, 0, cssWidth, cssHeight);
  meta.textContent = `${Math.round(info.ptWidth)} x ${Math.round(info.ptHeight)} pt`;
}

function drawPlaceholder(ctx, width, height, label) {
  ctx.fillStyle = "#fbfcfd";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#7b8490";
  ctx.textAlign = "center";
  ctx.font = "14px system-ui";
  ctx.fillText(label, width / 2, height / 2);
}

function imageToDataUrl(info, maxWidth = 1100) {
  const scale = Math.min(1, maxWidth / info.image.naturalWidth);
  const width = Math.max(1, Math.round(info.image.naturalWidth * scale));
  const height = Math.max(1, Math.round(info.image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(info.image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function canvasToDataUrl(canvas) {
  return canvas.toDataURL("image/jpeg", 0.82);
}

function buildOCRImage(info, maxWidth = 1800) {
  const scale = Math.min(1, maxWidth / info.image.naturalWidth);
  const width = Math.max(1, Math.round(info.image.naturalWidth * scale));
  const height = Math.max(1, Math.round(info.image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(info.image, 0, 0, width, height);
  return {
    dataUrl: canvas.toDataURL("image/png"),
    scale,
  };
}

function buildCoordinateGuideDataUrl(info, maxWidth = 1100) {
  const scale = Math.min(1, maxWidth / info.image.naturalWidth);
  const width = Math.max(1, Math.round(info.image.naturalWidth * scale));
  const height = Math.max(1, Math.round(info.image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(info.image, 0, 0, width, height);
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  ctx.fillRect(0, 0, width, 34);
  ctx.fillStyle = "#111827";
  ctx.font = "bold 18px system-ui";
  ctx.fillText("DEVELOPMENT SCREENSHOT COORDINATE GUIDE", 10, 24);

  ctx.lineWidth = 1;
  ctx.font = "bold 13px system-ui";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  for (let i = 0; i <= 10; i += 1) {
    const x = Math.round((width * i) / 10);
    const y = Math.round((height * i) / 10);
    ctx.strokeStyle = i % 5 === 0 ? "rgba(201, 54, 54, 0.95)" : "rgba(15, 123, 108, 0.65)";
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
    ctx.stroke();

    const label = `${(i / 10).toFixed(1)}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
    ctx.fillRect(Math.min(x + 2, width - 38), 36, 36, 18);
    ctx.fillRect(2, Math.min(y + 2, height - 20), 36, 18);
    ctx.fillStyle = "#111827";
    ctx.fillText(label, Math.min(x + 5, width - 35), 38);
    ctx.fillText(label, 5, Math.min(y + 4, height - 18));
  }

  return canvas.toDataURL("image/jpeg", 0.86);
}

function buildLocationSegments(info) {
  const segments = [];
  const isDesktop = getCurrentReviewTarget() === "desktop";
  const segmentWidth = isDesktop ? Math.min(760, Math.max(520, Math.round(info.ptWidth / 3))) : info.ptWidth;
  const segmentHeight = isDesktop ? 360 : LOCATION_SEGMENT_HEIGHT;
  const xOverlap = isDesktop ? 90 : 0;
  const yOverlap = isDesktop ? 70 : LOCATION_SEGMENT_OVERLAP;
  const xStep = Math.max(1, segmentWidth - xOverlap);
  const yStep = Math.max(1, segmentHeight - yOverlap);
  let index = 1;

  for (let y = 0; y < info.ptHeight; y += yStep) {
    const height = Math.min(segmentHeight, info.ptHeight - y);
    for (let x = 0; x < info.ptWidth; x += xStep) {
      const width = Math.min(segmentWidth, info.ptWidth - x);
      segments.push({
        index,
        x,
        y,
        width,
        height,
        label: `T${index}`,
      });
      index += 1;
      if (x + width >= info.ptWidth) break;
    }
    if (y + height >= info.ptHeight) break;
  }

  return segments;
}

function buildSegmentGuideDataUrl(info, segments, maxWidth = 1100) {
  const scale = Math.min(1, maxWidth / info.image.naturalWidth);
  const width = Math.max(1, Math.round(info.image.naturalWidth * scale));
  const height = Math.max(1, Math.round(info.image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(info.image, 0, 0, width, height);
  ctx.font = "bold 22px system-ui";
  ctx.textBaseline = "top";

  segments.forEach((segment) => {
    const x = Math.round((segment.x || 0) * info.dpr * scale);
    const y = Math.round(segment.y * info.dpr * scale);
    const w = Math.round((segment.width || info.ptWidth) * info.dpr * scale);
    const h = Math.round(segment.height * info.dpr * scale);
    ctx.fillStyle = "rgba(24, 119, 242, 0.08)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(24, 119, 242, 0.9)";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, Math.max(1, w - 3), Math.max(1, h - 3));
    ctx.fillStyle = "rgba(24, 119, 242, 0.95)";
    ctx.fillRect(x + 8, y + 8, 58, 34);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(segment.label, x + 18, y + 12);
  });

  return canvas.toDataURL("image/jpeg", 0.86);
}

function buildSegmentCropDataUrl(info, segment, maxWidth = 900) {
  const sourceX = Math.round((segment.x || 0) * info.dpr);
  const sourceY = Math.round(segment.y * info.dpr);
  const sourceWidth = Math.round((segment.width || info.ptWidth) * info.dpr);
  const sourceHeight = Math.round(segment.height * info.dpr);
  const scale = Math.min(1, maxWidth / sourceWidth);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(info.image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", 0.9);
}

function buildSegmentCellGuideDataUrl(info, segment, maxWidth = 900) {
  const sourceX = Math.round((segment.x || 0) * info.dpr);
  const sourceY = Math.round(segment.y * info.dpr);
  const sourceWidth = Math.round((segment.width || info.ptWidth) * info.dpr);
  const sourceHeight = Math.round(segment.height * info.dpr);
  const scale = Math.min(1, maxWidth / sourceWidth);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(info.image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

  ctx.lineWidth = 2;
  ctx.textBaseline = "top";
  ctx.font = "bold 16px system-ui";
  for (let row = 0; row < LOCATION_CELL_ROWS; row += 1) {
    for (let col = 0; col < LOCATION_CELL_COLS; col += 1) {
      const x = Math.round((width * col) / LOCATION_CELL_COLS);
      const y = Math.round((height * row) / LOCATION_CELL_ROWS);
      const w = Math.round(width / LOCATION_CELL_COLS);
      const h = Math.round(height / LOCATION_CELL_ROWS);
      const label = `${String.fromCharCode(65 + col)}${row + 1}`;
      ctx.fillStyle = "rgba(24, 119, 242, 0.06)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(24, 119, 242, 0.72)";
      ctx.strokeRect(x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2));
      ctx.fillStyle = "rgba(24, 119, 242, 0.92)";
      ctx.fillRect(x + 6, y + 6, 34, 24);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x + 11, y + 9);
    }
  }

  return canvas.toDataURL("image/jpeg", 0.88);
}

function makeAnalysisCanvas(info, targetWidth) {
  const scale = targetWidth / info.ptWidth;
  const width = Math.round(info.ptWidth * scale);
  const height = Math.round(info.ptHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(info.image, 0, 0, width, height);
  return { canvas, ctx, width, height, scale };
}

function colorDistance(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getAverageColor(ctx, x, y, width, height) {
  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const sw = Math.max(1, Math.floor(width));
  const sh = Math.max(1, Math.floor(height));
  const data = ctx.getImageData(sx, sy, sw, sh).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3] / 255;
    r += data[i] * alpha;
    g += data[i + 1] * alpha;
    b += data[i + 2] * alpha;
    count += alpha;
  }

  if (!count) return [255, 255, 255];
  return [r / count, g / count, b / count];
}

function sampleGrid(designData, buildData, options) {
  const compareWidth = Math.min(designData.width, buildData.width);
  const compareHeight = Math.min(designData.height, buildData.height);
  const cellWidth = compareWidth / SAMPLE_COLS;
  const cellHeight = compareHeight / SAMPLE_ROWS;
  const diffs = [];

  for (let row = 0; row < SAMPLE_ROWS; row += 1) {
    for (let col = 0; col < SAMPLE_COLS; col += 1) {
      const x = col * cellWidth;
      const y = row * cellHeight;
      const designColor = getAverageColor(designData.ctx, x, y, cellWidth, cellHeight);
      const buildColor = getAverageColor(buildData.ctx, x, y, cellWidth, cellHeight);
      const distance = colorDistance(designColor, buildColor);

      if (distance > options.colorTolerance) {
        diffs.push({
          x,
          y,
          width: cellWidth,
          height: cellHeight,
          distance,
          row,
          col,
        });
      }
    }
  }

  return { diffs, compareWidth, compareHeight };
}

function clusterDiffs(diffs) {
  const sorted = [...diffs].sort((a, b) => b.distance - a.distance);
  const clusters = [];

  sorted.forEach((diff) => {
    const existing = clusters.find((cluster) => {
      const centerX = cluster.x + cluster.width / 2;
      const centerY = cluster.y + cluster.height / 2;
      const dx = Math.abs(centerX - (diff.x + diff.width / 2));
      const dy = Math.abs(centerY - (diff.y + diff.height / 2));
      return dx < diff.width * 3 && dy < diff.height * 3;
    });

    if (existing) {
      const right = Math.max(existing.x + existing.width, diff.x + diff.width);
      const bottom = Math.max(existing.y + existing.height, diff.y + diff.height);
      existing.x = Math.min(existing.x, diff.x);
      existing.y = Math.min(existing.y, diff.y);
      existing.width = right - existing.x;
      existing.height = bottom - existing.y;
      existing.maxDistance = Math.max(existing.maxDistance, diff.distance);
      existing.count += 1;
    } else {
      clusters.push({
        x: diff.x,
        y: diff.y,
        width: diff.width,
        height: diff.height,
        maxDistance: diff.distance,
        count: 1,
      });
    }
  });

  return clusters
    .filter((cluster) => cluster.count >= 2 || cluster.maxDistance > 42)
    .sort((a, b) => b.maxDistance * b.count - a.maxDistance * a.count)
    .slice(0, 8);
}

function describeDifferenceStrength(distance) {
  if (distance >= 90) return "很明显";
  if (distance >= 50) return "明显";
  return "轻微";
}

function describeDelta(delta, axisLabel) {
  const rounded = Math.round(delta);
  if (rounded === 0) return `${axisLabel}一致`;
  return `开发截图比设计稿${axisLabel}${rounded > 0 ? "多" : "少"} ${Math.abs(rounded)}pt`;
}

function describeClusterMeta(cluster, index, context) {
  const { designInfo, buildInfo } = context;
  const widthDelta = Math.round(buildInfo.ptWidth - designInfo.ptWidth);
  const boxWidth = Math.max(1, Math.round(cluster.width));
  const boxHeight = Math.max(1, Math.round(cluster.height));
  const strength = describeDifferenceStrength(cluster.maxDistance);
  const parts = [
    `标注 ${index + 1}`,
    `范围约 ${boxWidth} x ${boxHeight}pt`,
    `差异强度：${strength}`,
  ];

  if (Math.abs(widthDelta) >= 8 && els.widthPolicy.value === "adaptive") {
    parts.push(`${describeDelta(widthDelta, "宽度")}，已按自适应处理`);
  }

  return `${parts.join("；")}。强度用于排序，不是高度差或间距差。`;
}

function inferIssue(cluster, index, context) {
  const { designInfo, buildInfo, compareWidth, compareHeight, options } = context;
  const yRatio = cluster.y / compareHeight;
  const xRatio = cluster.x / compareWidth;
  const areaRatio = (cluster.width * cluster.height) / (compareWidth * compareHeight);
  const distance = Math.round(cluster.maxDistance);
  const policy = els.widthPolicy.value;

  let title = "局部视觉差异";
  let advice = "建议放大查看该区域，确认颜色、图标、文案、元素高度或纵向位置是否与设计稿一致。";
  let severity = distance > 70 || areaRatio > 0.035 ? "high" : "medium";
  let meta = describeClusterMeta(cluster, index, context);

  if (yRatio < 0.14) {
    title = "顶部区域可能存在状态栏或导航栏差异";
    advice = "重点检查安全区、导航栏高度、标题垂直居中和左右操作入口尺寸。不同设备宽度不应直接判为问题。";
  } else if (yRatio > 0.86) {
    title = "底部区域可能存在安全区或底栏差异";
    advice = "重点检查 Home Indicator 避让、底部栏高度、按钮高度和底部 padding。";
  } else if (xRatio < 0.12 || xRatio + cluster.width / compareWidth > 0.88) {
    title = "边缘区域的边距或组件尺寸需要复核";
    advice =
      policy === "adaptive"
        ? "当前为适配走查：整屏宽度变化可接受，优先确认该组件的左右边距、内部 padding、高度和纵向位置是否保持设计关系。"
        : "当前为严格还原：可继续确认容器宽度是否需要与设计稿保持一致。";
    severity = "medium";
  } else if (cluster.height < options.spacingTolerance * 8) {
    title = "间距或分割线差异";
    advice = "建议检查上下间距、分割线颜色/粗细，避免把 1px 线和抗锯齿差异误判为结构问题。";
    severity = "low";
  } else if (areaRatio > 0.05) {
    title = "大面积颜色或背景差异";
    advice = "建议优先核对背景色、卡片色、按钮色或图片资源状态；纯色块应比文字边缘更严格。";
    severity = "high";
  }

  return { title, advice, severity, meta, cluster };
}

function generateSystemIssues(designInfo, buildInfo, options) {
  const issues = [];
  const widthDelta = Math.round(buildInfo.ptWidth - designInfo.ptWidth);
  const heightDelta = Math.round(buildInfo.ptHeight - designInfo.ptHeight);

  if (Math.abs(widthDelta) >= 8 && els.widthPolicy.value === "adaptive") {
    issues.push({
      title: "画布宽度不同，已切换为适配判断",
      severity: "low",
      advice:
        "开发截图与设计稿不是同一画布宽度，本次不把整体宽度差作为问题，只比较元素自身和相邻关系。",
      meta: `设计稿 ${Math.round(designInfo.ptWidth)}pt，开发截图 ${Math.round(buildInfo.ptWidth)}pt；${describeDelta(widthDelta, "宽度")}`,
    });
  }

  if (Math.abs(heightDelta) > 80) {
    issues.push({
      title: "页面高度差异较大",
      severity: "medium",
      advice: "建议确认是否截取了同一滚动位置、同一系统状态栏状态，以及页面内容是否完整。",
      meta: `设计稿 ${Math.round(designInfo.ptHeight)}pt，开发截图 ${Math.round(buildInfo.ptHeight)}pt；${describeDelta(heightDelta, "高度")}`,
    });
  }

  if (options.fontTolerance >= 3) {
    issues.push({
      title: "字体采用宽容判断",
      severity: "low",
      advice: "不同系统字体渲染会有差异，本版只提示明显字号、字重、换行和截断问题。",
      meta: `字号容差 ${options.fontTolerance}px`,
    });
  }

  return issues;
}

function drawDiffCanvas(buildInfo, clusters, compare) {
  const canvas = els.buildCanvas;
  canvas.classList.remove("has-annotations");

  if (!buildInfo) {
    const cssWidth = getPlaceholderWidth(canvas);
    const cssHeight = 520;
    const ctx = configureCanvas(canvas, cssWidth, cssHeight);
    drawPlaceholder(ctx, cssWidth, cssHeight, "开发截图");
    return;
  }

  const { width: cssWidth, height: cssHeight, scale } = getCanvasDisplaySize(buildInfo, canvas);
  const ctx = configureCanvas(canvas, cssWidth, cssHeight);
  const xOffset = 0;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  ctx.drawImage(buildInfo.image, 0, 0, cssWidth, cssHeight);
  ctx.fillStyle = "rgba(201, 54, 54, 0.2)";
  ctx.strokeStyle = "rgba(201, 54, 54, 0.9)";
  ctx.lineWidth = 2;
  ctx.font = "bold 13px system-ui";
  ctx.textAlign = "left";

  clusters.forEach((cluster, index) => {
    const sx = xOffset + cluster.x * scale;
    const sy = cluster.y * scale;
    const sw = cluster.width * scale;
    const sh = cluster.height * scale;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.fillStyle = "rgba(201, 54, 54, 0.95)";
    ctx.fillRect(sx, Math.max(0, sy - 22), 26, 20);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(String(index + 1), sx + 8, Math.max(14, sy - 7));
    ctx.fillStyle = "rgba(201, 54, 54, 0.2)";
  });
  canvas.classList.toggle("has-annotations", clusters.length > 0);

  els.buildMeta.textContent = `${Math.round(buildInfo.ptWidth)} x ${Math.round(buildInfo.ptHeight)} pt · ${clusters.length} 个标注区域`;
}

function drawIssueAnnotations(buildInfo, issues, focusedIssueIndex = state.focusedIssueIndex) {
  updateCompareStageMode();
  const canvas = els.buildCanvas;
  state.annotationBoxes = [];
  canvas.classList.remove("has-annotations");

  if (!buildInfo) {
    const cssWidth = getPlaceholderWidth(canvas);
    const cssHeight = 520;
    const ctx = configureCanvas(canvas, cssWidth, cssHeight);
    drawPlaceholder(ctx, cssWidth, cssHeight, "开发截图");
    return;
  }

  const { width: cssWidth, height: cssHeight, scale } = getCanvasDisplaySize(buildInfo, canvas);
  const ctx = configureCanvas(canvas, cssWidth, cssHeight);
  const xOffset = 0;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  ctx.drawImage(buildInfo.image, 0, 0, cssWidth, cssHeight);

  if (!state.showAnnotations) {
    els.buildMeta.textContent = `${Math.round(buildInfo.ptWidth)} x ${Math.round(buildInfo.ptHeight)} pt · 标注已隐藏`;
    return;
  }

  const annotated = issues
    .map((issue, index) => ({
      issue,
      issueNumber: index + 1,
      bbox: normalizeBBox(issue.bbox, buildInfo),
      isVisible: focusedIssueIndex === null || focusedIssueIndex === index,
    }))
    .filter((item) => item.isVisible)
    .filter((item) => item.bbox);
  annotated.forEach(({ issue, issueNumber, bbox }) => {
    const sx = xOffset + bbox.x * scale;
    const sy = bbox.y * scale;
    const sw = bbox.width * scale;
    const sh = bbox.height * scale;
    const color = issue.severity === "high" ? "#c93636" : issue.severity === "low" ? "#1877f2" : "#c96b00";
    state.annotationBoxes.push({
      issueIndex: issueNumber - 1,
      x: sx,
      y: sy,
      width: sw,
      height: sh,
      bbox,
      scale,
      xOffset,
    });

    ctx.fillStyle = hexToRgba(color, 0.18);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (issue.locationConfidence === "region") {
      ctx.setLineDash([7, 5]);
    } else {
      ctx.setLineDash([]);
    }
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.setLineDash([]);
    ctx.fillStyle = color;
    ctx.fillRect(sx, Math.max(0, sy - 22), 28, 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px system-ui";
    ctx.textAlign = "center";
    ctx.fillText(String(issueNumber), sx + 14, Math.max(14, sy - 7));
  });
  canvas.classList.toggle("has-annotations", state.annotationBoxes.length > 0);

  if (focusedIssueIndex !== null) {
    els.buildMeta.textContent = annotated.length ? `正在查看标注 ${focusedIssueIndex + 1}` : "当前问题没有可标注坐标";
  } else {
    els.buildMeta.textContent = annotated.length
      ? `${annotated.length} 个标注`
      : issues.length
        ? "AI 未返回可标注坐标"
        : `${Math.round(buildInfo.ptWidth)} x ${Math.round(buildInfo.ptHeight)} pt`;
  }
}

function redrawBuildCanvas() {
  const buildInfo = getImageInfo("build");
  if (!buildInfo) {
    drawImagePreview("build");
    return;
  }
  if (state.issues.length || state.showAnnotations) {
    drawIssueAnnotations(buildInfo, state.issues);
  } else {
    drawImagePreview("build");
  }
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeBBox(bbox, buildInfo) {
  if (!bbox || typeof bbox !== "object") return null;
  const values = {
    x: Number(bbox.x),
    y: Number(bbox.y),
    width: Number(bbox.width),
    height: Number(bbox.height),
  };
  if (!Object.values(values).every(Number.isFinite)) return null;
  if (values.width <= 0 || values.height <= 0) return null;

  let { x, y, width, height } = values;
  if (x <= 1 && y <= 1 && width <= 1 && height <= 1) {
    x *= buildInfo.ptWidth;
    width *= buildInfo.ptWidth;
    y *= buildInfo.ptHeight;
    height *= buildInfo.ptHeight;
  } else if (x + width <= buildInfo.image.naturalWidth && y + height <= buildInfo.image.naturalHeight) {
    const looksLikePx =
      x + width > buildInfo.ptWidth * 1.25 ||
      y + height > buildInfo.ptHeight * 1.25;
    if (!looksLikePx) {
      // Values are already in pt.
    } else {
      x /= buildInfo.dpr;
      y /= buildInfo.dpr;
      width /= buildInfo.dpr;
      height /= buildInfo.dpr;
    }
  } else {
    x /= buildInfo.dpr;
    y /= buildInfo.dpr;
    width /= buildInfo.dpr;
    height /= buildInfo.dpr;
  }

  x = Math.max(0, Math.min(buildInfo.ptWidth - 1, x));
  y = Math.max(0, Math.min(buildInfo.ptHeight - 1, y));
  width = Math.max(1, Math.min(buildInfo.ptWidth - x, width));
  height = Math.max(1, Math.min(buildInfo.ptHeight - y, height));
  return { x, y, width, height };
}

function calculateScore(diffRatio, issueCount) {
  const raw = 100 - diffRatio * 120 - issueCount * 2.5;
  return Math.max(58, Math.min(99, Math.round(raw)));
}

function renderIssues(issues) {
  state.issues = issues;
  state.focusedIssueIndex = null;
  state.selectedIssueIndex = null;
  if (!issues.length) {
    els.issueList.innerHTML = '<div class="empty-state">暂无走查问题。上传截图后点击右侧 AI 走查。</div>';
    return;
  }

  els.issueList.innerHTML = issues
    .map(
      (issue, index) => `
        <article class="issue-card ${issue.severity}" data-issue-index="${index}">
          <div class="issue-title">
            <span>${index + 1}. ${issue.title}</span>
            <span class="severity">${severityLabel(issue.severity)}</span>
          </div>
          <p>${issue.advice}</p>
          <div class="issue-meta">${issue.meta}</div>
        </article>
      `,
    )
    .join("");
  bindIssueHover();
}

function bindIssueHover() {
  els.issueList.querySelectorAll(".issue-card").forEach((card) => {
    card.addEventListener("mouseenter", () => {
      if (state.selectedIssueIndex === null) focusIssue(Number(card.dataset.issueIndex));
    });
    card.addEventListener("focusin", () => {
      if (state.selectedIssueIndex === null) focusIssue(Number(card.dataset.issueIndex));
    });
    card.addEventListener("mouseleave", clearIssueFocus);
    card.addEventListener("focusout", clearIssueFocus);
    card.addEventListener("click", () => toggleIssueSelection(Number(card.dataset.issueIndex)));
  });
}

function focusIssue(index) {
  if (!Number.isInteger(index)) return;
  state.focusedIssueIndex = index;
  els.issueList.querySelectorAll(".issue-card").forEach((card) => {
    card.classList.toggle("is-focused", Number(card.dataset.issueIndex) === index);
    card.classList.toggle("is-dimmed", Number(card.dataset.issueIndex) !== index);
  });
  const buildInfo = getImageInfo("build");
  if (buildInfo) drawIssueAnnotations(buildInfo, state.issues, index);
}

function clearIssueFocus() {
  if (state.selectedIssueIndex !== null) {
    focusIssue(state.selectedIssueIndex);
    return;
  }
  state.focusedIssueIndex = null;
  if (state.annotationDrag) return;
  els.issueList.querySelectorAll(".issue-card").forEach((card) => {
    card.classList.remove("is-focused", "is-dimmed", "is-selected");
  });
  const buildInfo = getImageInfo("build");
  if (buildInfo) drawIssueAnnotations(buildInfo, state.issues, null);
}

function toggleIssueSelection(index) {
  if (!Number.isInteger(index)) return;
  state.selectedIssueIndex = state.selectedIssueIndex === index ? null : index;
  if (state.selectedIssueIndex === null) {
    els.issueList.querySelectorAll(".issue-card").forEach((card) => {
      card.classList.remove("is-selected");
    });
    clearIssueFocus();
    return;
  }
  focusIssue(index);
  els.issueList.querySelectorAll(".issue-card").forEach((card) => {
    card.classList.toggle("is-selected", Number(card.dataset.issueIndex) === index);
  });
}

function getCanvasPoint(event) {
  const rect = els.buildCanvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function findAnnotationBox(point) {
  return [...state.annotationBoxes].reverse().find((box) => {
    return (
      point.x >= box.x &&
      point.x <= box.x + box.width &&
      point.y >= box.y &&
      point.y <= box.y + box.height
    );
  });
}

function startAnnotationDrag(event) {
  if (!state.showAnnotations) return;
  const point = getCanvasPoint(event);
  const box = findAnnotationBox(point);
  if (!box) return;

  event.preventDefault();
  state.focusedIssueIndex = box.issueIndex;
  state.selectedIssueIndex = box.issueIndex;
  focusIssue(box.issueIndex);
  els.issueList.querySelectorAll(".issue-card").forEach((card) => {
    card.classList.toggle("is-selected", Number(card.dataset.issueIndex) === box.issueIndex);
  });
  state.annotationDrag = {
    issueIndex: box.issueIndex,
    startX: point.x,
    startY: point.y,
    startBox: { ...box.bbox },
    scale: box.scale,
  };
  els.buildCanvas.classList.add("is-dragging");
}

function moveAnnotationDrag(event) {
  if (!state.annotationDrag) return;
  const buildInfo = getImageInfo("build");
  if (!buildInfo) return;

  const point = getCanvasPoint(event);
  const dx = (point.x - state.annotationDrag.startX) / state.annotationDrag.scale;
  const dy = (point.y - state.annotationDrag.startY) / state.annotationDrag.scale;
  const start = state.annotationDrag.startBox;
  const next = {
    x: Math.max(0, Math.min(buildInfo.ptWidth - start.width, start.x + dx)),
    y: Math.max(0, Math.min(buildInfo.ptHeight - start.height, start.y + dy)),
    width: start.width,
    height: start.height,
  };

  state.issues[state.annotationDrag.issueIndex].bbox = {
    x: next.x / buildInfo.ptWidth,
    y: next.y / buildInfo.ptHeight,
    width: next.width / buildInfo.ptWidth,
    height: next.height / buildInfo.ptHeight,
  };
  drawIssueAnnotations(buildInfo, state.issues, state.annotationDrag.issueIndex);
}

function endAnnotationDrag() {
  if (!state.annotationDrag) return;
  const issueIndex = state.annotationDrag.issueIndex;
  state.annotationDrag = null;
  els.buildCanvas.classList.remove("is-dragging");
  focusIssue(issueIndex);
  setAIStatus(`已校准标注 ${issueIndex + 1}`);
}

function severityLabel(severity) {
  return {
    high: "高",
    medium: "中",
    low: "低",
  }[severity];
}

function inspect() {
  const designInfo = getImageInfo("design");
  const buildInfo = getImageInfo("build");

  if (!designInfo || !buildInfo) {
    renderIssues([
      {
        title: "缺少截图",
        severity: "medium",
        advice: "请先上传设计稿和开发截图。工具会自动读取图片分辨率并推测 1x 尺寸。",
        meta: "等待输入",
      },
    ]);
    return;
  }

  const options = {
    colorTolerance: readNumber(els.colorTolerance, 18),
    spacingTolerance: readNumber(els.spacingTolerance, 4),
    fontTolerance: readNumber(els.fontTolerance, 3),
  };

  const analysisWidth =
    els.widthPolicy.value === "adaptive"
      ? null
      : Math.min(Math.round(designInfo.ptWidth), Math.round(buildInfo.ptWidth));

  const designData = makeAnalysisCanvas(
    designInfo,
    analysisWidth ?? Math.round(designInfo.ptWidth),
  );
  const buildData = makeAnalysisCanvas(buildInfo, analysisWidth ?? Math.round(buildInfo.ptWidth));
  const sampled = sampleGrid(designData, buildData, options);
  const clusters = clusterDiffs(sampled.diffs);

  const diffRatio = sampled.diffs.length / (SAMPLE_COLS * SAMPLE_ROWS);
  const score = calculateScore(diffRatio, clusters.length);
  els.scoreValue.textContent = `${score}`;

  const context = {
    designInfo,
    buildInfo,
    compareWidth: sampled.compareWidth,
    compareHeight: sampled.compareHeight,
    options,
  };
  const visualIssues = clusters.map((cluster, index) => inferIssue(cluster, index, context));
  const systemIssues = generateSystemIssues(designInfo, buildInfo, options);
  renderIssues([...visualIssues, ...systemIssues]);
  drawDiffCanvas(buildInfo, clusters, sampled);
  setAIStatus("可进行 AI 走查");
}

async function handleFile(kind, file) {
  const data = await loadImage(file);
  state[kind] = data;
  if (kind === "build") state.ocrCache = null;
  applyDetectedScale(kind);
  drawImagePreview(kind);
  clearInspectionOutput(state.design && state.build ? "可开始 AI 走查" : "等待上传另一张图片");
}

function refreshReviewMode() {
  saveAISettings();
  state.ocrCache = null;
  if (state.design) applyDetectedScale("design");
  if (state.build) applyDetectedScale("build");
  drawImagePreview("design");
  drawImagePreview("build");
  clearInspectionOutput(state.design && state.build ? "走查模式已变化，可重新 AI 走查" : "未运行");
}

async function loadDemo() {
  const [design, build] = await Promise.all([
    loadImageFromUrl("./test-fixtures/design-375-1x.png", "design-375-1x.png"),
    loadImageFromUrl("./test-fixtures/build-390-3x.png", "build-390-3x.png"),
  ]);
  state.design = design;
  state.build = build;
  applyDetectedScale("design");
  applyDetectedScale("build");
  els.widthPolicy.value = "adaptive";
  drawImagePreview("design");
  drawImagePreview("build");
  clearInspectionOutput("可开始 AI 走查");
}

function clearInspectionOutput(status = "未运行") {
  state.issues = [];
  state.aiRawText = "";
  els.scoreValue.textContent = "--";
  setAIStatus(status);
  renderAIResult("");
  renderIssues([]);
  const buildInfo = getImageInfo("build");
  if (buildInfo) {
    drawIssueAnnotations(buildInfo, []);
  } else {
    drawImagePreview("build");
  }
}

function setupDropzone(kind, inputId, dropId) {
  const input = document.querySelector(inputId);
  const drop = document.querySelector(dropId);

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    if (file) handleFile(kind, file);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      drop.classList.add("is-active");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    drop.addEventListener(eventName, (event) => {
      event.preventDefault();
      drop.classList.remove("is-active");
    });
  });

  drop.addEventListener("drop", (event) => {
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(kind, file);
  });
}

function reset() {
  state.design = null;
  state.build = null;
  state.issues = [];
  state.focusedIssueIndex = null;
  state.selectedIssueIndex = null;
  state.annotationBoxes = [];
  state.annotationDrag = null;
  state.showAnnotations = true;
  state.ocrCache = null;
  els.designInput.value = "";
  els.buildInput.value = "";
  els.scoreValue.textContent = "--";
  if (els.annotationToggle) els.annotationToggle.checked = true;
  els.designDetect.textContent = "上传后自动识别分辨率和 1x 尺寸";
  els.buildDetect.textContent = "上传后自动识别设备尺寸和 DPR";
  els.designDetect.classList.remove("is-low-confidence");
  els.buildDetect.classList.remove("is-low-confidence");
  els.designDpr.value = "1";
  els.buildDpr.value = "3";
  els.designBaseWidth.value = "375";
  setAIStatus("未运行");
  renderAIResult("");
  renderIssues([]);
  drawImagePreview("design");
  drawImagePreview("build");
}

function formatReport() {
  if (!state.issues.length) return "暂无走查问题。";
  return state.issues
    .map((issue, index) => {
      return `${index + 1}. ${issue.title}
严重程度：${severityLabel(issue.severity)}
建议：${issue.advice}
备注：${issue.meta}`;
    })
    .join("\n\n");
}

function escapeHTML(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPDFReportHTML() {
  const score = els.scoreValue.textContent || "--";
  const annotatedImage = els.buildCanvas.toDataURL("image/png");
  const generatedAt = new Date().toLocaleString("zh-CN");
  const issueHTML = state.issues.length
    ? state.issues
        .map((issue, index) => {
          return `
            <article class="issue ${issue.severity}">
              <div class="issue-head">
                <h3>${index + 1}. ${escapeHTML(issue.title)}</h3>
                <span>${severityLabel(issue.severity)}</span>
              </div>
              <p class="advice">${escapeHTML(issue.advice)}</p>
              ${issue.meta ? `<p class="meta">${escapeHTML(issue.meta)}</p>` : ""}
            </article>
          `;
        })
        .join("")
    : '<div class="empty">暂无走查问题。</div>';

  return `<!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <title>灵镜视觉走查报告</title>
        <style>
          @page { size: A4; margin: 14mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #111827;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #ffffff;
          }
          .report { max-width: 980px; margin: 0 auto; }
          .cover {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 24px;
            padding-bottom: 18px;
            border-bottom: 2px solid #1877f2;
          }
          h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.2; }
          .sub { margin: 0; color: #667085; font-size: 13px; }
          .score {
            min-width: 132px;
            border-radius: 10px;
            padding: 14px;
            background: #eef5ff;
            color: #166fe5;
            text-align: center;
          }
          .score span { display: block; font-size: 12px; margin-bottom: 6px; }
          .score strong { font-size: 34px; line-height: 1; }
          section { margin-top: 22px; break-inside: avoid; }
          h2 { margin: 0 0 12px; font-size: 18px; }
          .annotation {
            border: 1px solid #d9e0ea;
            border-radius: 10px;
            padding: 12px;
            background: #f8fafc;
          }
          .annotation img {
            display: block;
            max-width: 100%;
            height: auto;
            margin: 0 auto;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #fff;
          }
          .issues {
            display: grid;
            gap: 10px;
          }
          .issue {
            break-inside: avoid;
            border: 1px solid #d9e0ea;
            border-left: 5px solid #c96b00;
            border-radius: 10px;
            padding: 12px 14px;
          }
          .issue.high { border-left-color: #c93636; }
          .issue.low { border-left-color: #1877f2; }
          .issue-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
          }
          h3 { margin: 0; font-size: 15px; line-height: 1.35; }
          .issue-head span {
            flex: 0 0 auto;
            border-radius: 999px;
            padding: 3px 9px;
            background: #eef5ff;
            color: #166fe5;
            font-size: 12px;
            font-weight: 700;
          }
          .high .issue-head span { background: #fff1f1; color: #c93636; }
          .medium .issue-head span { background: #fff7eb; color: #c96b00; }
          .advice, .meta {
            margin: 0;
            color: #303846;
            font-size: 13px;
            line-height: 1.6;
          }
          .meta { margin-top: 8px; color: #667085; }
          .empty {
            border: 1px dashed #cbd5e1;
            border-radius: 10px;
            padding: 28px;
            color: #667085;
            text-align: center;
          }
          @media print {
            .report { max-width: none; }
          }
        </style>
      </head>
      <body>
        <main class="report">
          <header class="cover">
            <div>
              <h1>灵镜视觉走查报告</h1>
              <p class="sub">生成时间：${escapeHTML(generatedAt)}</p>
            </div>
            <div class="score">
              <span>还原度</span>
              <strong>${escapeHTML(score)}</strong>
            </div>
          </header>
          <section>
            <h2>走查标注</h2>
            <div class="annotation">
              <img src="${annotatedImage}" alt="走查标注图" />
            </div>
          </section>
          <section>
            <h2>问题列表</h2>
            <div class="issues">${issueHTML}</div>
          </section>
        </main>
      </body>
    </html>`;
}

function buildAIPrompt(designInfo, buildInfo) {
  const widthDelta = Math.round(buildInfo.ptWidth - designInfo.ptWidth);
  const heightDelta = Math.round(buildInfo.ptHeight - designInfo.ptHeight);
  const notes = els.aiNotes.value.trim();
  const designDetect = formatDetectResult(state.design);
  const buildDetect = formatDetectResult(state.build);
  const targetLabel = getReviewTargetLabel();
  const targetRules =
    getCurrentReviewTarget() === "desktop"
      ? "- 当前是桌面端 Web 页面走查，重点检查顶部导航、侧栏、表格行高列宽、筛选控件、按钮高度、对齐关系、信息密度和滚动区域。\n- 桌面端截图默认按 1x 原始像素处理，不要套用移动端 DPR 或机型安全区规则。"
      : "- 当前是移动端走查，重点检查状态栏/安全区、导航栏、底部栏、卡片高度、触控控件尺寸和移动端间距关系。";

  return `你是资深 ${targetLabel} UI 设计走查助手。请对比三张图：
1. 设计稿截图
2. 开发实现截图
3. 已经标注差异区域的开发截图

${getReviewSkillPrompt()}

请按设计师日常走查习惯判断，不要做简单像素 diff。

走查原则：
- 设计稿和开发截图可能来自不同设备宽度。设计稿 ${Math.round(designInfo.ptWidth)} x ${Math.round(designInfo.ptHeight)}pt，开发截图 ${Math.round(buildInfo.ptWidth)} x ${Math.round(buildInfo.ptHeight)}pt。
- 当前宽度差：${widthDelta}pt，高度差：${heightDelta}pt。
- 图片识别结果：设计稿 ${designDetect}；开发截图 ${buildDetect}。
- 如果宽度不同，不要把整体宽度差直接判为问题。
- 对自适应宽度组件，只重点检查高度、内部 padding、左右边距关系、内容对齐和纵向位置。
- 固定尺寸元素需要更严格，例如图标尺寸、按钮高度、输入框高度、卡片圆角、底部栏高度。
- 不同系统字体会有渲染差异，字号只在明显偏大/偏小、层级错误、换行异常、截断时标问题。
- 颜色要区分纯色块和文字抗锯齿，纯色块/按钮/背景更严格，文字边缘轻微差异可忽略。
${targetRules}

当前规则走查结果：
${formatReport()}

${notes ? `设计师补充说明：${notes}` : ""}

请输出中文报告，格式如下：
总体判断：一句话说明这次还原度和最值得优先修的问题。

问题列表：
1. 问题标题
严重程度：高/中/低
位置：对应标注编号或页面区域
判断：说明为什么这是问题，避免使用算法术语
建议：给开发可执行的调整建议

可忽略项：
- 列出因为设备宽度、系统字体、抗锯齿、截图状态导致可以忽略的差异。`;
}

function buildAIInspectionPrompt(designInfo, buildInfo) {
  const widthDelta = Math.round(buildInfo.ptWidth - designInfo.ptWidth);
  const heightDelta = Math.round(buildInfo.ptHeight - designInfo.ptHeight);
  const notes = els.aiNotes.value.trim();
  const designDetect = formatDetectResult(state.design);
  const buildDetect = formatDetectResult(state.build);
  const targetLabel = getReviewTargetLabel();
  const targetRules =
    getCurrentReviewTarget() === "desktop"
      ? "- 当前是桌面端 Web 页面走查，重点检查顶部导航、侧栏、表格行高列宽、筛选控件、按钮高度、对齐关系、信息密度和滚动区域。\n- 桌面端截图默认按 1x 原始像素处理，不要套用移动端 DPR、机型、安全区或底部 Home Indicator 规则。"
      : "- 当前是移动端走查，重点检查状态栏/安全区、导航栏、底部栏、卡片高度、触控控件尺寸和移动端间距关系。";
  const regionKeyGuide =
    getCurrentReviewTarget() === "desktop"
      ? `- 每个问题必须选择一个 regionKey，方便网站在开发截图上画框。桌面端可选：
  top_nav=顶部蓝色导航/全局头部
  left_menu=最左侧纵向菜单
  left_filter_panel=左侧筛选/查询表单区域
  top_tabs=顶部标签页/页签区域
  toolbar=查询、重置、新增、完成、发送等操作工具栏
  main_table=中间或右侧主表格/主数据列表
  bottom_task_area=底部任务/订单/成交列表区域
  bottom_toolbar=底部任务区域内的按钮、页签、筛选条
  right_panel=右侧抽屉/侧栏
  whole_page=无法归类但确实是全局布局问题`
      : `- 每个问题必须选择一个 regionKey，方便网站在开发截图上画框。移动端可选：
  mobile_status_nav=状态栏/导航栏/顶部标题
  mobile_tabs=顶部 tab 标签栏
  mobile_top_cards=顶部指数/卡片区域
  mobile_chart=图表/柱状图/趋势图区域
  mobile_function_grid=功能入口/宫格图标区域
  mobile_bottom_nav=底部导航/安全区
  whole_page=无法归类但确实是全局布局问题`;

  return `你是资深 ${targetLabel} UI 设计走查助手。请对比两张图：
1. 设计稿
2. 开发实现截图

${getReviewSkillPrompt()}

目标：只判断 UI 走查问题，不要返回坐标。坐标会由下一步单独定位。

重要原则：
- 不做简单像素 diff，要按设计师日常走查习惯判断。
- 设计稿尺寸：${Math.round(designInfo.ptWidth)} x ${Math.round(designInfo.ptHeight)}pt；开发截图尺寸：${Math.round(buildInfo.ptWidth)} x ${Math.round(buildInfo.ptHeight)}pt。
- 当前宽度差：${widthDelta}pt，高度差：${heightDelta}pt。
- 图片识别结果：设计稿 ${designDetect}；开发截图 ${buildDetect}。
- 如果宽度不同，不要把整体画布宽度差直接判为问题。
- 自适应宽度组件只重点检查高度、内部 padding、左右边距关系、内容对齐和纵向位置。
- 固定尺寸元素更严格，例如图标尺寸、按钮高度、输入框高度、卡片圆角、底部栏高度。
- 不同系统字体会有渲染差异，只在字号明显偏大/偏小、层级错误、换行异常、截断时标问题。
- 文字抗锯齿和系统字体轻微差异可以忽略；纯色块、按钮、背景色更严格。
${targetRules}
- 只从开发截图实际存在的区域选择 regionKey，不要按设计稿中“应该出现”的位置选择。
${regionKeyGuide}
- 不要返回 bbox、坐标、框选区域。

${notes ? `设计师补充说明：${notes}` : ""}

只返回 JSON，不要 Markdown，不要解释。格式：
{
  "summary": "一句话总体判断",
  "score": 0-100,
  "issues": [
    {
      "title": "问题标题",
      "severity": "high | medium | low",
      "position": "页面区域或控件名称",
      "regionKey": "上方可选 regionKey 之一",
      "judgement": "为什么这是问题，避免算法术语",
      "advice": "给开发的可执行调整建议",
      "keywords": ["开发截图中可见的定位文字或控件名，2-6个"]
    }
  ],
  "ignored": ["可忽略差异说明"]
}

最多返回 8 个真正值得处理的问题。`;
}

function buildAILocationPrompt(issuesOrEntries, buildInfo) {
  const entries = normalizeLocationEntries(issuesOrEntries);
  const issueText = entries
    .map(({ issue, index }) => {
      const keywords = OCR_ASSISTED_LOCATION && issue.keywords?.length ? issue.keywords.join("、") : "无";
      return `${index}. ${issue.title}
位置：${issue.meta || "未说明"}
建议：${issue.advice}
定位关键词：${keywords}`;
    })
    .join("\n\n");

  return `你是 ${getReviewTargetLabel()} 截图标注助手。现在只做定位，不做新的 UI 走查判断。

你会看到两张图：
1. 开发实现截图
2. 同一张开发实现截图，但叠加了 0.0-1.0 坐标网格

任务：根据下面的问题描述，在“开发实现截图”中找到每个问题实际发生的位置，并返回 bbox。

定位规则：
- 只能看开发截图定位，不能想象设计稿位置，也不能沿用设计稿布局。
${OCR_ASSISTED_LOCATION ? "- 每个问题都给了“定位关键词”。你必须先在开发截图里寻找这些关键词对应的实际文字/控件，再围绕它们扩展成组件框。\n- 如果关键词在开发截图中不存在，使用问题描述里的页面区域定位；仍找不到再 bbox=null。" : "- 根据问题描述和页面区域定位。"}
- bbox 必须是 0-1 归一化坐标，原点在开发截图左上角，x/y/width/height 都是相对于开发截图宽高的比例。
- 如果问题是“缺少内容/行数不足/只有一行而设计稿有多行”，bbox 要框住开发截图中实际存在的对应组件区域，以及缺失最明显的附近区域；不要框设计稿中本应出现的区域。
- 例如快捷功能图标在开发截图中只有一行，就只框开发截图里那一行快捷功能图标所在区域，不要框到上方图表或设计稿三行位置。
- 如果问题是某个卡片数量、背景、颜色、字号、图标、文案不一致，bbox 框住开发截图中的实际控件。
- 如果无法在开发截图中找到对应区域，bbox 填 null。
- 开发截图尺寸为 ${Math.round(buildInfo.ptWidth)} x ${Math.round(buildInfo.ptHeight)}pt，但你必须返回 0-1 比例，不要返回 pt 或 px。

问题列表：
${issueText}

只返回 JSON，不要 Markdown，不要解释。格式：
{
  "locations": [
    { "index": 1, "bbox": { "x": 0.1, "y": 0.2, "width": 0.8, "height": 0.1 } },
    { "index": 2, "bbox": null }
  ]
}`;
}

function extractAIText(data) {
  const content = data?.choices?.[0]?.message?.content;
  const deltaContent = data?.choices?.[0]?.delta?.content;
  if (typeof deltaContent === "string") return deltaContent;
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => part.text || part.content || "")
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return "";
}

function parseSSEText(rawText) {
  const chunks = [];
  rawText.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") return;

    try {
      const data = JSON.parse(payload);
      const text = extractAIText(data);
      if (text) chunks.push(text);
    } catch {
      chunks.push(payload);
    }
  });

  return chunks.join("");
}

function parseAIResponseText(rawText) {
  const text = rawText.trim();
  if (!text) return "";

  if (text.startsWith("data:")) {
    return parseSSEText(text).trim();
  }

  try {
    return extractAIText(JSON.parse(text));
  } catch {
    return text;
  }
}

function extractJSONBlock(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  const firstObject = trimmed.indexOf("{");
  const lastObject = trimmed.lastIndexOf("}");
  if (firstObject !== -1 && lastObject > firstObject) {
    return trimmed.slice(firstObject, lastObject + 1);
  }

  return trimmed;
}

function parseAIInspection(text) {
  const jsonText = extractJSONBlock(text);
  const data = JSON.parse(jsonText);
  const issues = Array.isArray(data.issues) ? data.issues : [];
  return {
    summary: typeof data.summary === "string" ? data.summary : "AI 已完成走查。",
    score: Number.isFinite(Number(data.score)) ? Math.round(Number(data.score)) : null,
    ignored: Array.isArray(data.ignored) ? data.ignored.filter(Boolean) : [],
    issues: issues.slice(0, 8).map((issue) => normalizeAIIssue(issue)),
  };
}

function parseAILocations(text) {
  const jsonText = extractJSONBlock(text);
  const data = JSON.parse(jsonText);
  const locations = Array.isArray(data.locations) ? data.locations : [];
  return locations
    .map((item) => ({
      index: Number(item.index),
      bbox: item.bbox && typeof item.bbox === "object" ? item.bbox : null,
    }))
    .filter((item) => Number.isInteger(item.index) && item.index > 0);
}

function normalizeLocationEntries(issuesOrEntries) {
  return issuesOrEntries.map((item, index) => {
    if (item?.issue) return item;
    return { index: index + 1, issue: item };
  });
}

function getUnlocatedEntries(issues, locations) {
  const locatedIndexes = new Set(locations.filter((item) => item.bbox).map((item) => item.index));
  return issues
    .map((issue, index) => ({ index: index + 1, issue }))
    .filter((entry) => !locatedIndexes.has(entry.index));
}

function buildAISegmentSelectionPrompt(issuesOrEntries, segments, buildInfo) {
  const entries = normalizeLocationEntries(issuesOrEntries);
  const issueText = entries
    .map(({ issue, index }) => {
      const keywords = issue.keywords?.length ? issue.keywords.join("、") : "无";
      return `${index}. ${issue.title}
位置/判断：${issue.meta || "未说明"}
建议：${issue.advice}
定位关键词：${keywords}`;
    })
    .join("\n\n");
  const segmentText = segments
    .map(
      (segment) =>
        `${segment.label}: 截图 x=${Math.round(segment.x || 0)}-${Math.round((segment.x || 0) + (segment.width || buildInfo.ptWidth))}pt, y=${Math.round(segment.y)}-${Math.round(segment.y + segment.height)}pt`,
    )
    .join("\n");

  return `你是 ${getReviewTargetLabel()} 截图定位助手。现在只做第一步：判断每个问题位于开发截图的哪个蓝色网格块里。

你会看到一张开发截图，截图上叠加了蓝色网格块标识 T1、T2、T3...。

规则：
- 只能根据开发截图中实际可见的位置判断，不要使用设计稿的位置。
- 优先寻找定位关键词对应的真实文字、图标或控件。
- 如果问题是“缺少内容/数量不足/只有一行”，请选择开发截图里实际存在的对应组件所在网格块。
- 如果问题区域跨多个网格块，选择问题最核心、最容易框住的那个网格块。
- 如果完全找不到对应区域，segment 返回 null。
- 开发截图 1x 尺寸：${Math.round(buildInfo.ptWidth)} x ${Math.round(buildInfo.ptHeight)}pt。

网格块说明：
${segmentText}

问题列表：
${issueText}

只返回 JSON，不要 Markdown，不要解释。格式：
{
  "segments": [
    { "index": 1, "segment": "T2" },
    { "index": 2, "segment": null }
  ]
}`;
}

function parseAISegmentSelection(text) {
  const jsonText = extractJSONBlock(text);
  const data = JSON.parse(jsonText);
  const segments = Array.isArray(data.segments) ? data.segments : [];
  return segments
    .map((item) => ({
      index: Number(item.index),
      segment: typeof item.segment === "string" ? item.segment.trim().toUpperCase() : null,
    }))
    .filter((item) => Number.isInteger(item.index) && item.index > 0);
}

function buildAISegmentCellsPrompt(issue, segment, buildInfo) {
  const keywords = issue.keywords?.length ? issue.keywords.join("、") : "无";
  return `你是 ${getReviewTargetLabel()} 截图标注助手。现在只做第二步：在当前局部截图的格子里选择问题位置。

你会看到开发截图的局部裁剪图：${segment.label}，上面覆盖了 ${LOCATION_CELL_COLS} 列 x ${LOCATION_CELL_ROWS} 行网格，格子编号如 A1、B1、C2。
这个局部图对应完整开发截图 x=${Math.round(segment.x || 0)}-${Math.round((segment.x || 0) + (segment.width || buildInfo.ptWidth))}pt，y=${Math.round(segment.y)}-${Math.round(segment.y + segment.height)}pt。

问题：
标题：${issue.title}
位置/判断：${issue.meta || "未说明"}
建议：${issue.advice}
定位关键词：${keywords}

选择规则：
- 只选择当前局部截图里真实存在的问题区域，不要按设计稿位置推测。
- 选择覆盖问题核心区域的最少格子，可以返回 1 到 8 个格子。
- 如果问题是按钮高度、圆角、间距、表格行高，请选择对应按钮、控件或表格行所在格子。
- 如果问题是缺少内容/数量不足，请选择开发截图中实际存在的对应组件和最明显的缺失附近区域。
- 如果当前局部截图里找不到这个问题，cells 返回空数组。

只返回 JSON，不要 Markdown，不要解释。格式：
{
  "cells": ["B2", "C2"]
}`;
}

function parseAISegmentCells(text) {
  const jsonText = extractJSONBlock(text);
  const data = JSON.parse(jsonText);
  const rawCells = Array.isArray(data.cells) ? data.cells : [];
  const cellPattern = /^[A-F][1-4]$/;
  return rawCells
    .map((cell) => String(cell).trim().toUpperCase())
    .filter((cell, index, list) => cellPattern.test(cell) && list.indexOf(cell) === index);
}

function cellsToFullBBox(segment, cells, buildInfo) {
  if (!Array.isArray(cells) || !cells.length) return null;
  const cols = cells.map((cell) => cell.charCodeAt(0) - 65);
  const rows = cells.map((cell) => Number(cell.slice(1)) - 1);
  const minCol = Math.max(0, Math.min(...cols));
  const maxCol = Math.min(LOCATION_CELL_COLS - 1, Math.max(...cols));
  const minRow = Math.max(0, Math.min(...rows));
  const maxRow = Math.min(LOCATION_CELL_ROWS - 1, Math.max(...rows));
  const padX = 0.08 / LOCATION_CELL_COLS;
  const padY = 0.08 / LOCATION_CELL_ROWS;
  const segmentX = segment.x || 0;
  const segmentWidth = segment.width || buildInfo.ptWidth;
  const localX = Math.max(0, minCol / LOCATION_CELL_COLS - padX);
  const localY = Math.max(0, minRow / LOCATION_CELL_ROWS - padY);
  const localRight = Math.min(1, (maxCol + 1) / LOCATION_CELL_COLS + padX);
  const localBottom = Math.min(1, (maxRow + 1) / LOCATION_CELL_ROWS + padY);

  return clampFullBBox({
    x: (segmentX + localX * segmentWidth) / buildInfo.ptWidth,
    y: (segment.y + localY * segment.height) / buildInfo.ptHeight,
    width: ((localRight - localX) * segmentWidth) / buildInfo.ptWidth,
    height: ((localBottom - localY) * segment.height) / buildInfo.ptHeight,
  });
}

function buildAISegmentBBoxPrompt(issue, segment, buildInfo) {
  const keywords = issue.keywords?.length ? issue.keywords.join("、") : "无";
  return `你是 ${getReviewTargetLabel()} 截图标注助手。现在只做第二步：在当前局部截图里画出问题区域 bbox。

你会看到开发截图的一个干净局部裁剪图：${segment.label}。
这个局部图对应完整开发截图 x=${Math.round(segment.x || 0)}-${Math.round((segment.x || 0) + (segment.width || buildInfo.ptWidth))}pt，y=${Math.round(segment.y)}-${Math.round(segment.y + segment.height)}pt，完整截图尺寸为 ${Math.round(buildInfo.ptWidth)} x ${Math.round(buildInfo.ptHeight)}pt。

问题：
标题：${issue.title}
位置/判断：${issue.meta || "未说明"}
建议：${issue.advice}
定位关键词：${keywords}

定位规则：
- 只看当前局部截图中真实存在的内容，不要按设计稿位置推测。
- bbox 必须是相对于“当前局部截图”的 0-1 归一化坐标，不是完整截图坐标。
- x/y/width/height 都必须在 0 到 1 之间。
- 如果问题是“缺少内容/数量不足/只有一行”，框住开发截图中实际存在的对应组件区域，以及缺失最明显的相邻空白区域。
- 如果当前局部截图里找不到这个问题，bbox 返回 null。

只返回 JSON，不要 Markdown，不要解释。格式：
{
  "bbox": { "x": 0.1, "y": 0.2, "width": 0.8, "height": 0.1 }
}`;
}

function parseAISegmentBBox(text) {
  const jsonText = extractJSONBlock(text);
  const data = JSON.parse(jsonText);
  return data?.bbox && typeof data.bbox === "object" ? data.bbox : null;
}

function normalizeSegmentBBox(bbox, segment, buildInfo) {
  if (!bbox || typeof bbox !== "object") return null;
  let x = Number(bbox.x);
  let y = Number(bbox.y);
  let width = Number(bbox.width);
  let height = Number(bbox.height);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;

  if (x > 1 || y > 1 || width > 1 || height > 1) {
    const segmentX = segment.x || 0;
    if (x >= segmentX && x <= segmentX + (segment.width || buildInfo.ptWidth)) {
      x -= segmentX;
    }
    if (y >= segment.y && y <= segment.y + segment.height) {
      y -= segment.y;
    }
    x /= segment.width || buildInfo.ptWidth;
    width /= segment.width || buildInfo.ptWidth;
    y /= segment.height;
    height /= segment.height;
  }

  x = Math.max(0, Math.min(0.999, x));
  y = Math.max(0, Math.min(0.999, y));
  width = Math.max(0.001, Math.min(1 - x, width));
  height = Math.max(0.001, Math.min(1 - y, height));
  return { x, y, width, height };
}

function segmentBBoxToFullBBox(segment, bbox, buildInfo) {
  const normalized = normalizeSegmentBBox(bbox, segment, buildInfo);
  if (!normalized) return null;
  const full = {
    x: ((segment.x || 0) + normalized.x * (segment.width || buildInfo.ptWidth)) / buildInfo.ptWidth,
    y: (segment.y + normalized.y * segment.height) / buildInfo.ptHeight,
    width: (normalized.width * (segment.width || buildInfo.ptWidth)) / buildInfo.ptWidth,
    height: (normalized.height * segment.height) / buildInfo.ptHeight,
  };
  return clampFullBBox(full);
}

function clampFullBBox(bbox) {
  if (!bbox) return null;
  const x = Math.max(0, Math.min(0.999, Number(bbox.x)));
  const y = Math.max(0, Math.min(0.999, Number(bbox.y)));
  let width = Math.max(0.001, Math.min(1 - x, Number(bbox.width)));
  let height = Math.max(0.001, Math.min(1 - y, Number(bbox.height)));

  if (width > 0.92) width = 0.92;
  if (height > 0.55) height = 0.55;

  return { x, y, width, height };
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[：:；;，,。.!！?？()[\]【】{}"'“”‘’]/g, "");
}

function normalizeRegionKey(value) {
  const key = String(value || "").trim();
  return [...DESKTOP_REGION_KEYS, ...MOBILE_REGION_KEYS].includes(key) ? key : "";
}

function getIssueSearchTerms(issue) {
  const terms = new Set();
  (issue.keywords || []).forEach((keyword) => terms.add(String(keyword)));
  const text = `${issue.title || ""} ${issue.meta || ""} ${issue.advice || ""}`;
  const locationMatch = text.match(/定位词：([^；]+)/);
  if (locationMatch) {
    locationMatch[1].split(/[、,\s]+/).forEach((term) => terms.add(term));
  }
  text
    .match(/[A-Za-z][A-Za-z0-9_-]{1,}|[\u4e00-\u9fa5]{2,}/g)
    ?.forEach((term) => terms.add(term));
  return [...terms]
    .map((term) => term.trim())
    .filter((term) => normalizeSearchText(term).length >= 2)
    .slice(0, 16);
}

function normalizeOCRItems(data, ocrScale, buildInfo) {
  const rawItems = [
    ...(Array.isArray(data?.words) ? data.words : []),
    ...(Array.isArray(data?.lines) ? data.lines : []),
  ];
  return rawItems
    .map((item) => {
      const text = String(item.text || "").trim();
      const bbox = item.bbox || {};
      const x0 = Number(bbox.x0);
      const y0 = Number(bbox.y0);
      const x1 = Number(bbox.x1);
      const y1 = Number(bbox.y1);
      if (!text || ![x0, y0, x1, y1].every(Number.isFinite) || x1 <= x0 || y1 <= y0) return null;
      const x = x0 / ocrScale / buildInfo.dpr;
      const y = y0 / ocrScale / buildInfo.dpr;
      const width = (x1 - x0) / ocrScale / buildInfo.dpr;
      const height = (y1 - y0) / ocrScale / buildInfo.dpr;
      return {
        text,
        normalizedText: normalizeSearchText(text),
        confidence: Number(item.confidence) || 0,
        bbox: {
          x: Math.max(0, x),
          y: Math.max(0, y),
          width: Math.max(1, width),
          height: Math.max(1, height),
        },
      };
    })
    .filter(Boolean);
}

function scoreOCRMatch(term, item) {
  const normalizedTerm = normalizeSearchText(term);
  if (!normalizedTerm || !item.normalizedText) return 0;
  if (item.normalizedText === normalizedTerm) return 100;
  if (item.normalizedText.includes(normalizedTerm)) return 80;
  if (normalizedTerm.includes(item.normalizedText) && item.normalizedText.length >= 2) return 58;
  return 0;
}

function getIssueRegionKey(issue) {
  const text = `${issue.title || ""} ${issue.meta || ""} ${issue.advice || ""}`;
  const isDesktop = getCurrentReviewTarget() === "desktop";
  const normalizedKey = normalizeRegionKey(issue.regionKey);
  const allowedKeys = isDesktop ? DESKTOP_REGION_KEYS : MOBILE_REGION_KEYS;
  if (normalizedKey && allowedKeys.includes(normalizedKey)) return normalizedKey;
  return inferRegionKeyFromText(text, isDesktop);
}

function isOCRItemInsideRegion(item, normalizedRegionBox, buildInfo) {
  if (!normalizedRegionBox) return true;
  const centerX = (item.bbox.x + item.bbox.width / 2) / buildInfo.ptWidth;
  const centerY = (item.bbox.y + item.bbox.height / 2) / buildInfo.ptHeight;
  const pad = 0.02;
  return (
    centerX >= normalizedRegionBox.x - pad &&
    centerX <= normalizedRegionBox.x + normalizedRegionBox.width + pad &&
    centerY >= normalizedRegionBox.y - pad &&
    centerY <= normalizedRegionBox.y + normalizedRegionBox.height + pad
  );
}

function chooseOCRMatches(issue, ocrItems, buildInfo) {
  const terms = getIssueSearchTerms(issue);
  const regionKey = getIssueRegionKey(issue);
  const regionBox = regionKey === "whole_page" ? null : getRegionBBoxByKey(regionKey);
  const searchItems = regionBox
    ? ocrItems.filter((item) => isOCRItemInsideRegion(item, regionBox, buildInfo))
    : ocrItems;
  const matches = [];
  terms.forEach((term) => {
    searchItems.forEach((item) => {
      const score = scoreOCRMatch(term, item);
      if (score > 0) {
        matches.push({ item, score, term });
      }
    });
  });
  if (!matches.length) return [];

  const meta = `${issue.title || ""} ${issue.meta || ""} ${issue.advice || ""}`;
  matches.sort((a, b) => {
    if (meta.includes("顶部") && Math.abs(a.item.bbox.y - b.item.bbox.y) > 8) {
      return a.item.bbox.y - b.item.bbox.y;
    }
    if (meta.includes("底部") && Math.abs(a.item.bbox.y - b.item.bbox.y) > 8) {
      return b.item.bbox.y - a.item.bbox.y;
    }
    if (meta.includes("左侧") && Math.abs(a.item.bbox.x - b.item.bbox.x) > 8) {
      return a.item.bbox.x - b.item.bbox.x;
    }
    if (meta.includes("右侧") && Math.abs(a.item.bbox.x - b.item.bbox.x) > 8) {
      return b.item.bbox.x - a.item.bbox.x;
    }
    return b.score - a.score || b.item.confidence - a.item.confidence;
  });

  const anchor = matches[0].item.bbox;
  const anchorCenterX = anchor.x + anchor.width / 2;
  const anchorCenterY = anchor.y + anchor.height / 2;
  return matches
    .filter(({ item }) => {
      const centerX = item.bbox.x + item.bbox.width / 2;
      const centerY = item.bbox.y + item.bbox.height / 2;
      return Math.abs(centerX - anchorCenterX) <= 260 && Math.abs(centerY - anchorCenterY) <= 90;
    })
    .slice(0, 4)
    .map((match) => match.item);
}

function bboxFromOCRItems(items, buildInfo) {
  if (!items.length) return null;
  const left = Math.min(...items.map((item) => item.bbox.x));
  const top = Math.min(...items.map((item) => item.bbox.y));
  const right = Math.max(...items.map((item) => item.bbox.x + item.bbox.width));
  const bottom = Math.max(...items.map((item) => item.bbox.y + item.bbox.height));
  const padX = Math.max(10, (right - left) * 0.28);
  const padY = Math.max(8, (bottom - top) * 0.8);
  return clampFullBBox({
    x: (left - padX) / buildInfo.ptWidth,
    y: (top - padY) / buildInfo.ptHeight,
    width: (right - left + padX * 2) / buildInfo.ptWidth,
    height: (bottom - top + padY * 2) / buildInfo.ptHeight,
  });
}

function getRegionBBoxByKey(key) {
  const boxes = {
    top_nav: { x: 0.01, y: 0.02, width: 0.98, height: 0.08 },
    left_menu: { x: 0, y: 0.06, width: 0.12, height: 0.88 },
    left_filter_panel: { x: 0.1, y: 0.1, width: 0.22, height: 0.52 },
    top_tabs: { x: 0.1, y: 0.08, width: 0.55, height: 0.12 },
    toolbar: { x: 0.3, y: 0.12, width: 0.64, height: 0.13 },
    main_table: { x: 0.28, y: 0.18, width: 0.68, height: 0.44 },
    bottom_task_area: { x: 0.1, y: 0.62, width: 0.86, height: 0.32 },
    bottom_toolbar: { x: 0.1, y: 0.62, width: 0.86, height: 0.12 },
    right_panel: { x: 0.74, y: 0.08, width: 0.24, height: 0.72 },
    mobile_status_nav: { x: 0.02, y: 0.02, width: 0.96, height: 0.14 },
    mobile_tabs: { x: 0.02, y: 0.1, width: 0.96, height: 0.12 },
    mobile_top_cards: { x: 0.04, y: 0.16, width: 0.92, height: 0.22 },
    mobile_chart: { x: 0.04, y: 0.38, width: 0.92, height: 0.3 },
    mobile_function_grid: { x: 0.04, y: 0.62, width: 0.92, height: 0.2 },
    mobile_bottom_nav: { x: 0.02, y: 0.82, width: 0.96, height: 0.16 },
    whole_page: { x: 0.02, y: 0.06, width: 0.96, height: 0.88 },
  };
  return boxes[key] || null;
}

function inferRegionKeyFromText(text, isDesktop) {
  if (isDesktop) {
    if (/底部|任务区|任务列表|底栏|下方|成交|订单/.test(text)) return "bottom_task_area";
    if (/顶部导航|导航栏|顶部栏|顶栏|全局头部/.test(text)) return "top_nav";
    if (/顶部|标签|页签|tab|Tab/.test(text)) return "top_tabs";
    if (/左侧菜单|侧边菜单|导航菜单|菜单项/.test(text)) return "left_menu";
    if (/左侧|侧栏|筛选|筛选区|查询表单|筛选栏/.test(text)) return "left_filter_panel";
    if (/工具栏|按钮|查询|重置|执行|新增|完成|发送|操作区/.test(text)) return "toolbar";
    if (/右侧|表格|交易表|数据表|列表|行高|列宽|单元格|表头/.test(text)) return "main_table";
    return "whole_page";
  }

  if (/底部|底栏|安全区|Home|tabbar|Tab/.test(text)) return "mobile_bottom_nav";
  if (/顶部|导航|状态栏|标题/.test(text)) return "mobile_status_nav";
  if (/标签|tab|沪深京|板块|科创板|创业板/.test(text)) return "mobile_tabs";
  if (/卡片|指数|上证|深证|北证/.test(text)) return "mobile_top_cards";
  if (/图表|柱状|大盘|涨跌|分布/.test(text)) return "mobile_chart";
  if (/宫格|功能|图标|入口/.test(text)) return "mobile_function_grid";
  return "whole_page";
}

function inferRegionBBox(issue, buildInfo) {
  const text = `${issue.title || ""} ${issue.meta || ""} ${issue.advice || ""}`;
  const isDesktop = getCurrentReviewTarget() === "desktop";
  const regionKey = getIssueRegionKey(issue);
  const keyBox = getRegionBBoxByKey(regionKey);
  if (keyBox) return clampFullBBox(keyBox);

  let box = { x: 0.08, y: 0.08, width: 0.84, height: 0.32 };

  if (isDesktop) {
    if (/底部|任务区|任务列表|底栏|下方/.test(text)) {
      box = { x: 0.1, y: 0.62, width: 0.86, height: 0.32 };
    } else if (/顶部导航|导航栏|顶部栏|顶栏/.test(text)) {
      box = { x: 0.02, y: 0.02, width: 0.96, height: 0.1 };
    } else if (/顶部|标签|tab|Tab/.test(text)) {
      box = { x: 0.1, y: 0.08, width: 0.86, height: 0.22 };
    } else if (/左侧|侧栏|筛选|筛选区|侧边/.test(text)) {
      box = { x: 0.02, y: 0.08, width: 0.3, height: 0.58 };
    } else if (/右侧|表格|交易表|数据表|列表|行高|列宽/.test(text)) {
      box = { x: 0.28, y: 0.12, width: 0.68, height: 0.48 };
    } else if (/按钮|查询|重置|执行|新增|完成/.test(text)) {
      box = { x: 0.55, y: 0.08, width: 0.38, height: 0.22 };
    }
  } else {
    if (/底部|底栏|安全区|Home|tabbar|Tab/.test(text)) {
      box = { x: 0.02, y: 0.78, width: 0.96, height: 0.2 };
    } else if (/顶部|导航|状态栏|标签|tab/.test(text)) {
      box = { x: 0.02, y: 0.02, width: 0.96, height: 0.22 };
    } else if (/卡片|指数|宫格|功能|图标/.test(text)) {
      box = { x: 0.04, y: 0.16, width: 0.92, height: 0.32 };
    } else if (/图表|柱状|大盘|涨跌/.test(text)) {
      box = { x: 0.04, y: 0.38, width: 0.92, height: 0.32 };
    }
  }

  return clampFullBBox(box);
}

function locateIssuesByRegion(entries, buildInfo) {
  return entries
    .map(({ issue, index }) => ({
      index,
      bbox: inferRegionBBox(issue, buildInfo),
      confidence: "region",
    }))
    .filter((item) => item.bbox);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    [...document.scripts]
      .filter((script) => script.src.includes("tesseract.js") && !window.Tesseract?.recognize)
      .forEach((script) => script.remove());
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function ensureTesseract() {
  if (window.Tesseract?.recognize) return window.Tesseract;
  await loadScript("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js");
  if (!window.Tesseract?.recognize) {
    throw new Error("OCR 依赖加载失败");
  }
  return window.Tesseract;
}

async function locateIssuesByOCR(issues, buildInfo) {
  const cacheKey = `${buildInfo.name || ""}:${buildInfo.image.naturalWidth}x${buildInfo.image.naturalHeight}:${buildInfo.dpr}`;
  let ocrItems = state.ocrCache?.key === cacheKey ? state.ocrCache.items : null;

  if (!ocrItems) {
    const tesseract = await ensureTesseract();
    setAIStatus("正在 OCR 识别开发截图文字位置...");
    const ocrImage = buildOCRImage(buildInfo);
    const result = await tesseract.recognize(ocrImage.dataUrl, "chi_sim+eng", {
      logger: (message) => {
        if (message.status === "recognizing text" && Number.isFinite(message.progress)) {
          setAIStatus(`正在 OCR 识别开发截图文字位置... ${Math.round(message.progress * 100)}%`);
        }
      },
    });
    ocrItems = normalizeOCRItems(result?.data, ocrImage.scale, buildInfo);
    state.ocrCache = { key: cacheKey, items: ocrItems };
  } else {
    setAIStatus("正在复用 OCR 文字位置缓存...");
  }

  if (!ocrItems.length) return [];

  return issues
    .map((issue, index) => ({
      index: index + 1,
      bbox: bboxFromOCRItems(chooseOCRMatches(issue, ocrItems, buildInfo), buildInfo),
      confidence: "ocr",
    }))
    .filter((item) => item.bbox);
}

async function locateIssuesBySegments(model, issuesOrEntries, buildInfo) {
  const entries = normalizeLocationEntries(issuesOrEntries);
  if (!entries.length) return [];
  const segments = buildLocationSegments(buildInfo);
  const segmentMap = new Map(segments.map((segment) => [segment.label, segment]));
  const selectionText = await callAI({
    model,
    temperature: 0,
    stream: false,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildAISegmentSelectionPrompt(entries, segments, buildInfo) },
          {
            type: "image_url",
            image_url: { url: buildSegmentGuideDataUrl(buildInfo, segments), detail: "high" },
          },
        ],
      },
    ],
  });
  const selections = parseAISegmentSelection(selectionText);
  const selectionMap = new Map(selections.map((item) => [item.index, item.segment]));
  const locations = [];

  for (const entry of entries) {
    const { index, issue } = entry;
    const segmentLabel = selectionMap.get(index);
    const segment = segmentMap.get(segmentLabel);
    if (!segment) {
      locations.push({ index, bbox: null });
      continue;
    }

    setAIStatus(`AI 正在局部网格 ${segment.label} 中选择问题格子 ${index}...`);
    let bbox = null;
    const cellText = await callAI({
      model,
      temperature: 0,
      stream: false,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildAISegmentCellsPrompt(issue, segment, buildInfo) },
            {
              type: "image_url",
              image_url: { url: buildSegmentCellGuideDataUrl(buildInfo, segment), detail: "high" },
            },
          ],
        },
      ],
    });
    bbox = cellsToFullBBox(segment, parseAISegmentCells(cellText), buildInfo);

    if (!bbox) {
      setAIStatus(`AI 正在局部网格 ${segment.label} 中补充定位问题 ${index}...`);
      const bboxText = await callAI({
        model,
        temperature: 0,
        stream: false,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: buildAISegmentBBoxPrompt(issue, segment, buildInfo) },
              {
                type: "image_url",
                image_url: { url: buildSegmentCropDataUrl(buildInfo, segment), detail: "high" },
              },
            ],
          },
        ],
      });
      bbox = segmentBBoxToFullBBox(segment, parseAISegmentBBox(bboxText), buildInfo);
    }

    locations.push({
      index,
      bbox,
    });
  }

  return locations;
}

function applyLocationsToIssues(issues, locations) {
  const locationMap = new Map(locations.map((item) => [item.index, item]));
  return issues.map((issue, index) => ({
    ...issue,
    bbox: locationMap.has(index + 1) ? locationMap.get(index + 1).bbox : issue.bbox,
    locationConfidence: locationMap.has(index + 1)
      ? locationMap.get(index + 1).confidence || "ai"
      : issue.locationConfidence,
    meta:
      issue.meta && issue.meta.includes("未返回可标注坐标") && locationMap.get(index + 1)?.bbox
        ? issue.meta.replace(/；?未返回可标注坐标/g, "")
        : issue.meta,
  }));
}

function normalizeAIIssue(issue) {
  const severityMap = {
    high: "high",
    medium: "medium",
    low: "low",
    高: "high",
    中: "medium",
    低: "low",
  };
  const severity = severityMap[issue?.severity] || "medium";
  const hasBBox = Boolean(issue?.bbox && typeof issue.bbox === "object");
  const keywords = Array.isArray(issue?.keywords)
    ? issue.keywords.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
    : [];
  const regionKey = normalizeRegionKey(issue?.regionKey);
  return {
    title: String(issue?.title || "AI 发现的走查问题"),
    severity,
    advice: String(issue?.advice || "建议结合标注区域复核并调整。"),
    meta: [
      issue?.position ? `位置：${issue.position}` : "",
      issue?.judgement ? `判断：${issue.judgement}` : "",
      keywords.length ? `定位词：${keywords.join("、")}` : "",
      hasBBox ? "" : "未返回可标注坐标",
    ]
      .filter(Boolean)
      .join("；"),
    bbox: issue?.bbox || null,
    keywords,
    regionKey,
  };
}

function buildAIResultText(result) {
  const ignored = result.ignored.length ? `\n\n可忽略项：\n${result.ignored.map((item) => `- ${item}`).join("\n")}` : "";
  return `${result.summary}${ignored}`;
}

function getAIConfig() {
  const baseUrl = normalizeBaseUrl(els.aiBaseUrl.value);
  const apiKey = els.aiApiKey.value.trim();
  const model = els.aiModel.value.trim();
  if (!baseUrl || !apiKey || !model) {
    throw new Error("请填写 Base URL、API Key 和模型名。");
  }
  return { baseUrl, apiKey, model };
}

async function callAI(payload) {
  const { baseUrl, apiKey } = getAIConfig();
  const response = await fetch(getChatCompletionsUrl(baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const rawText = await response.text();

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${rawText.slice(0, 300)}`);
  }

  const text = parseAIResponseText(rawText);
  if (!text) {
    throw new Error("模型返回为空，可能是不支持当前请求格式或返回结构不同。");
  }
  return text;
}

function setAIStatus(message, isError = false) {
  els.aiStatus.textContent = message;
  els.aiStatus.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function renderAIResult(text) {
  els.aiResult.textContent = text;
  els.aiResult.classList.toggle("has-content", Boolean(text.trim()));
}

async function runAIReview() {
  const designInfo = getImageInfo("design");
  const buildInfo = getImageInfo("build");
  if (!designInfo || !buildInfo) {
    setAIStatus("请先上传设计稿和开发截图。", true);
    return;
  }

  try {
    const { model } = getAIConfig();
    saveAISettings();
    setAIStatus("AI 正在走查截图...");
    renderAIResult("");
    setAIButtonsDisabled(true);
    setAIReviewLoading(true);
    await loadReviewSkill();
    if (els.inspectBtn) {
      els.inspectBtn.disabled = true;
      els.inspectBtn.textContent = "走查中";
    }

    const payload = {
      model,
      temperature: 0.2,
      stream: false,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildAIInspectionPrompt(designInfo, buildInfo) },
            {
              type: "image_url",
              image_url: { url: imageToDataUrl(designInfo), detail: "high" },
            },
            {
              type: "image_url",
              image_url: { url: imageToDataUrl(buildInfo), detail: "high" },
            },
          ],
        },
      ],
    };

    const text = await callAI(payload);
    state.aiRawText = text;
    const result = parseAIInspection(text);
    state.issues = result.issues;
    els.scoreValue.textContent = result.score === null ? "--" : String(result.score);
    renderIssues(state.issues);
    drawIssueAnnotations(buildInfo, state.issues);
    renderAIResult(buildAIResultText(result));
    setAIStatus("AI 已完成问题判断，正在 OCR 辅助定位...");

    try {
      let locations = [];
      try {
        locations = await locateIssuesByOCR(state.issues, buildInfo);
      } catch (ocrError) {
        setAIStatus(`OCR 定位失败，正在使用 AI 网格定位：${ocrError.message}`, true);
      }

      const locatedIndexes = new Set(locations.map((item) => item.index));
      const ocrHitCount = locatedIndexes.size;
      let unlocatedEntries = getUnlocatedEntries(state.issues, locations);
      if (unlocatedEntries.length && !AI_LOCATION_FALLBACK) {
        const regionLocations = locateIssuesByRegion(unlocatedEntries, buildInfo);
        regionLocations.forEach((item) => {
          if (!locatedIndexes.has(item.index)) locations.push(item);
        });
        unlocatedEntries = getUnlocatedEntries(state.issues, locations);
      }
      setAIStatus(
        unlocatedEntries.length
          ? ocrHitCount
            ? AI_LOCATION_FALLBACK
              ? `OCR 已定位 ${ocrHitCount} 个问题，正在补充 ${unlocatedEntries.length} 个剩余标注...`
              : `OCR 已定位 ${ocrHitCount} 个问题，${unlocatedEntries.length} 个问题不生成低置信标注`
            : AI_LOCATION_FALLBACK
              ? "OCR 未匹配到可靠文字位置，正在使用 AI 网格定位..."
              : "OCR 未匹配到可靠文字位置，本次不生成低置信标注"
          : `OCR 已定位全部 ${ocrHitCount} 个问题`,
      );

      if (unlocatedEntries.length && AI_LOCATION_FALLBACK && SEGMENTED_LOCATION) {
        try {
          const segmentLocations = await locateIssuesBySegments(model, unlocatedEntries, buildInfo);
          segmentLocations.forEach((item) => {
            if (!locatedIndexes.has(item.index)) locations.push(item);
          });
        } catch (segmentError) {
          setAIStatus(`补充标注失败，已保留 OCR 定位结果：${segmentError.message}`, true);
        }
      } else if (unlocatedEntries.length && AI_LOCATION_FALLBACK) {
        const locationText = await callAI({
          model,
          temperature: 0,
          stream: false,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: buildAILocationPrompt(unlocatedEntries, buildInfo) },
                {
                  type: "image_url",
                  image_url: { url: imageToDataUrl(buildInfo), detail: "high" },
                },
                {
                  type: "image_url",
                  image_url: { url: buildCoordinateGuideDataUrl(buildInfo), detail: "high" },
                },
              ],
            },
          ],
        });
        parseAILocations(locationText).forEach((item) => {
          if (!locatedIndexes.has(item.index)) locations.push(item);
        });
      }
      state.issues = applyLocationsToIssues(state.issues, locations);
      renderIssues(state.issues);
      drawIssueAnnotations(buildInfo, state.issues);
      const finalLocatedCount = new Set(locations.filter((item) => item.bbox).map((item) => item.index)).size;
      const regionCount = locations.filter((item) => item.bbox && item.confidence === "region").length;
      setAIStatus(
        `AI 走查完成，已生成 ${finalLocatedCount}/${state.issues.length} 个标注${ocrHitCount ? `，${ocrHitCount} 个精确定位` : ""}${regionCount ? `，${regionCount} 个区域提示` : ""}`,
      );
    } catch (locationError) {
      setAIStatus(`AI 已完成问题判断，但定位失败：${locationError.message}`, true);
    }
  } catch (error) {
    setAIStatus(`AI 走查失败：${error.message}`, true);
    if (state.aiRawText) renderAIResult(state.aiRawText);
  } finally {
    setAIButtonsDisabled(false);
    setAIReviewLoading(false);
    if (els.inspectBtn) {
      els.inspectBtn.disabled = false;
      els.inspectBtn.textContent = "AI 走查并标注";
    }
  }
}

function setAIButtonsDisabled(disabled) {
  els.aiTestBtn.disabled = disabled;
  els.aiReviewBtn.disabled = disabled;
}

function setAIReviewLoading(isLoading) {
  els.aiReviewBtn.classList.toggle("is-loading", isLoading);
  els.aiReviewBtn.innerHTML = isLoading
    ? '<span class="button-spinner" aria-hidden="true"></span><span>走查中</span>'
    : "AI 走查";
}

function setAITestLoading(isLoading) {
  els.aiTestBtn.classList.toggle("is-loading", isLoading);
  els.aiTestBtn.innerHTML = isLoading
    ? '<span class="button-spinner button-spinner-dark" aria-hidden="true"></span><span>测试中</span>'
    : "测试连接";
}

async function testAIConnection() {
  try {
    const { model } = getAIConfig();
    saveAISettings();
    setAIStatus("正在测试模型连通性...");
    renderAIResult("");
    setAIButtonsDisabled(true);
    setAITestLoading(true);

    const text = await callAI({
      model,
      temperature: 0,
      max_tokens: 80,
      stream: false,
      messages: [
        {
          role: "user",
          content: "请只回复：连接成功",
        },
      ],
    });

    setAIStatus(`连接成功：${text.slice(0, 80)}`);
  } catch (error) {
    setAIStatus(`连接失败：${error.message}`, true);
  } finally {
    setAIButtonsDisabled(false);
    setAITestLoading(false);
  }
}

async function exportPDFReport() {
  if (!window.html2canvas || !window.jspdf?.jsPDF) {
    setAIStatus("PDF 导出依赖加载失败，请检查网络后刷新重试。", true);
    return;
  }

  els.copyReportBtn.disabled = true;
  els.copyReportBtn.textContent = "正在导出...";

  const parsed = new DOMParser().parseFromString(buildPDFReportHTML(), "text/html");
  const report = document.importNode(parsed.querySelector(".report"), true);
  const reportStyle = document.createElement("style");
  reportStyle.textContent = parsed
    .querySelector("style")
    .textContent.replace(/body\s*\{/g, ".pdf-export-host {");

  const host = document.createElement("div");
  host.className = "pdf-export-host";
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;background:#fff;padding:0;z-index:-1;";
  host.appendChild(report);
  document.head.appendChild(reportStyle);
  document.body.appendChild(host);

  try {
    const canvas = await window.html2canvas(report, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });
    const pageWidth = 210;
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL("image/png");
    const pdf = new window.jspdf.jsPDF({
      orientation: "p",
      unit: "mm",
      format: [pageWidth, Math.max(297, imgHeight)],
    });
    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);

    pdf.save("灵镜视觉走查报告.pdf");
    setAIStatus("PDF 报告已导出");
  } catch (error) {
    setAIStatus(`PDF 导出失败：${error.message}`, true);
  } finally {
    host.remove();
    reportStyle.remove();
    els.copyReportBtn.disabled = false;
    els.copyReportBtn.textContent = "导出 PDF 报告";
  }
}

setupDropzone("design", "#designInput", "#designDrop");
setupDropzone("build", "#buildInput", "#buildDrop");

els.inspectBtn?.addEventListener("click", runAIReview);
els.aiTestBtn.addEventListener("click", testAIConnection);
els.aiReviewBtn.addEventListener("click", runAIReview);
els.demoBtn?.addEventListener("click", loadDemo);
els.resetBtn?.addEventListener("click", reset);
els.copyReportBtn.addEventListener("click", exportPDFReport);
els.buildCanvas.addEventListener("mousedown", startAnnotationDrag);
els.annotationToggle?.addEventListener("change", () => {
  state.showAnnotations = Boolean(els.annotationToggle.checked);
  state.annotationBoxes = [];
  state.annotationDrag = null;
  redrawBuildCanvas();
});
window.addEventListener("mousemove", moveAnnotationDrag);
window.addEventListener("mouseup", endAnnotationDrag);

[els.aiBaseUrl, els.aiApiKey, els.aiModel, els.aiNotes].forEach((input) => {
  input.addEventListener("change", saveAISettings);
});

[els.designDpr, els.buildDpr, els.designBaseWidth].forEach((input) => {
  input.addEventListener("change", () => {
    state.ocrCache = null;
    refreshDetectSummary("design");
    refreshDetectSummary("build");
    drawImagePreview("design");
    drawImagePreview("build");
    if (state.design && state.build) clearInspectionOutput("尺寸设置已变化，可重新 AI 走查");
  });
});

[els.reviewTarget, els.previewMode].forEach((input) => {
  input.addEventListener("change", refreshReviewMode);
});

[els.widthPolicy, els.colorTolerance, els.spacingTolerance, els.fontTolerance].forEach((input) => {
  input.addEventListener("input", () => {
    if (state.design && state.build) clearInspectionOutput("走查设置已变化，可重新 AI 走查");
  });
});

window.addEventListener("resize", () => {
  drawImagePreview("design");
  drawImagePreview("build");
  if (state.issues.length && state.build) {
    const buildInfo = getImageInfo("build");
    drawIssueAnnotations(buildInfo, state.issues);
  }
});

loadAISettings();
reset();
loadReviewSkill();
