/**
 * SEEWITHSOUND &bull; Screen Reader Simulator Core Native Engine.
 * Built entirely with plain, modern ES6+ vanilla JavaScript.
 * NO frameworks (No React, No Angular) and NO libraries.
 * 
 * Perfect for beginners to read, understand, and learn in modern browsers.
 */

// --- 1. PRESET SCENARIO SPECIMENS ---
const PRESETS = {
  standard: {
    label: "Accessible Structure",
    tag: "headings",
    description: "An optimized article with hierarchical headings (H1, H2) demonstrating effortless jumping via standard screen-reading keyboard macros.",
    text: "Heading Level 1: Welcome to SeeWithSound. Heading Level 2: The Power of Document Structure. Visual users skim pages using large text. Blind users skim pages by pressing the H key to jump from heading to heading. In this specimen, we have proper heading announcements, which allow screen readers to outline the whole document instantly. When web designers make headings using normal paragraph tags with bold styles, they break this vital roadmap, locking blind users into reading the entire page sequentially."
  },
  bad_alt: {
    label: "Alt-Text Mystery Safari",
    tag: "alt-text",
    description: "A simulation of the frustrating 'gibberish' experience when developers omit clear image descriptions, turning images into empty file references.",
    text: "Heading Level 1: Alt Text Survival Specimen. The following paragraph illustrates bad alternate tags. Element focused: image. Description read to user: IMG, underscore, 92839, underscore, puppy, final, version, dot, png. Visually impaired users cannot digest what makes this image important. Below, we focus the corrected layout. Element focused: Image. Description read: A golden retriever pup sitting playfully in a green grass meadow wearing a tiny yellow birthday hat next to a single candle."
  },
  data_table: {
    label: "The Data Grid Contrast",
    tag: "tables",
    description: "A verbal demonstration of how a structured table communicates Row, Column, and Cell relations, contrasted with broken layout-div grids.",
    text: "Heading Level 1: Weekly Hours Grid. Simulated Table with 3 columns and 3 rows. Table caption: Developer Role Allotment. Column 1: System Role. Column 2: Assigned Hours. Column 3: Priority. Row 1: System Admin, forty hours, high priority. Row 2: Customer Support, thirty-five hours, medium priority. Row 3: Frontend Developer, forty-five hours, critical priority. Structuring tables with clean table elements enables screen readers to associate each data point dynamically with its specific column and row header."
  },
  custom: {
    label: "Custom Workspace Canvas",
    tag: "custom",
    description: "A blank whiteboard to test custom sentences, paragraphs, or copy-pasted components.",
    text: "Type or paste your own paragraphs here. Adjust the speed rates, choose from available system voices, or hit 'Play' to observe realtime word tracking! This simulator converts standard digital text into high-fidelity audible signals, demonstrating human-centered computing in action."
  }
};

// --- 2. GLOBAL STATE REPOSITORIES ---
let text = PRESETS.standard.text;
let activePreset = "standard";
let isPlaying = false;
let isPaused = false;
let voices = [];
let selectedVoiceURI = "";
let rate = 1.0;
let pitch = 1.0;
let eyesClosedMode = false;
let activeChallenge = "intro";
let userAnswerChallenge1 = "";
let challenge2Completed = false;
let tokens = [];
let activeTokenId = null;
let currentUtterance = null;
let currentActiveSpanId = null;

// --- 3. HELPER UTILITIES ---

/**
 * Parses raw paragraph text into individual words & tokens so we can track and highlight them.
 * @param {string} rawText 
 * @returns {Array} List of token objects
 */
function tokenizeText(rawText) {
  if (!rawText) return [];
  const result = [];
  // Regular expression matching words, digits, punctuation, and whitespace groups globally
  const regex = /(\p{L}+|\p{N}+|[^\p{L}\p{N}\s]+|\s+)/gu;
  const matches = Array.from(rawText.matchAll(regex));
  
  let id = 0;
  for (const match of matches) {
    const matchText = match[0];
    const charStart = match.index || 0;
    const charEnd = charStart + matchText.length;
    const isWord = /[\p{L}\p{N}]/u.test(matchText);
    
    result.push({
      id: id++,
      text: matchText,
      isWord,
      charStart,
      charEnd
    });
  }
  return result;
}

/**
 * Screen Reader announce simulator log.
 * Updates both the real subtitles HUD and records internally.
 * @param {string} announcement 
 */
function logAnnouncement(announcement) {
  const subtitleHud = document.getElementById("accessibility-hud");
  const closedSubtitleHud = document.getElementById("closed-accessibility-hud");
  
  const textVal = `> ${announcement}`;
  if (subtitleHud) subtitleHud.textContent = textVal;
  if (closedSubtitleHud) closedSubtitleHud.textContent = textVal;
}

/**
 * Directly speaks an announcement (with options to interrupt or stream).
 * Used when elements receive focus or when system status alerts are triggered.
 * @param {string} phrase 
 * @param {boolean} interrupt 
 */
function speakImmediate(phrase, interrupt = true) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  
  if (interrupt) {
    window.speechSynthesis.cancel();
  }
  
  const announceUtterance = new SpeechSynthesisUtterance(phrase);
  const activeVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
  if (activeVoice) announceUtterance.voice = activeVoice;
  
  // Rate is spoken standard alerts slightly sped up for responsive usability
  announceUtterance.rate = rate * 1.1;
  announceUtterance.pitch = pitch;
  
  window.speechSynthesis.speak(announceUtterance);
  logAnnouncement(phrase);
}

/**
 * Keyboard Navigation HUD voice guidance cue.
 * Activated whenever an interactive component receives user tab focus.
 */
function handleElementFocus(elementName, elementRole, description = "") {
  const fullText = `${elementName}, ${elementRole}. ${description}`;
  if (eyesClosedMode) {
    speakImmediate(fullText, true);
  } else {
    logAnnouncement(fullText);
  }
}

// --- 4. DYNAMIC RETROFIT DOM RENDERERS ---

/**
 * Clears and regenerates individual inline <span> elements inside the Word Streamer viewport.
 * Allowing real-time word-by-word highlighted visual feedback as speech progresses.
 */
function renderTokens() {
  const viewport = document.getElementById("highlight-board-viewport");
  if (!viewport) return;
  
  if (tokens.length === 0) {
    viewport.innerHTML = `<span class="text-neutral-500 italic font-mono text-xs">&gt; Write paragraphs in the input block to observe highlighting telemetry.</span>`;
    return;
  }
  
  viewport.innerHTML = "";
  tokens.forEach(tk => {
    const span = document.createElement("span");
    span.id = `feed-token-${tk.id}`;
    span.className = "inline-block mx-0.5 px-1 font-mono transition-all duration-100 uppercase text-xs rounded-xs text-neutral-400";
    span.textContent = tk.text;
    viewport.appendChild(span);
  });
}

/**
 * Dynamically highlights a single word token within the dashboard visual viewport.
 * Resolves the traditional virtual-DOM rendering delay natively.
 * @param {number|null} id Token ID
 */
function highlightToken(id) {
  // Remove highlighted styles from the old token
  if (currentActiveSpanId !== null) {
    const prevSpan = document.getElementById(`feed-token-${currentActiveSpanId}`);
    if (prevSpan) {
      prevSpan.className = "inline-block mx-0.5 px-1 font-mono transition-all duration-100 uppercase text-xs rounded-xs text-neutral-400";
    }
  }
  
  currentActiveSpanId = id;
  
  // Apply highlighted style classes to the newly targeted active token
  if (id !== null) {
    const activeSpan = document.getElementById(`feed-token-${id}`);
    if (activeSpan) {
      activeSpan.className = "inline-block mx-0.5 px-1 font-mono transition-all duration-100 uppercase text-xs rounded-xs bg-[#CCFF00] text-black border border-[#CCFF00] font-bold shadow-[0_0_8px_rgba(204,255,0,0.4)]";
      // Ensure highlighted token scrolls smoothly within viewer list
      activeSpan.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest"
      });
    }
  }
}

/**
 * Synchronizes the visual equalizer wave state based on active synthesis.
 */
function updateEqualizerWave(isActive) {
  const eqCols = document.querySelectorAll(".eq-col");
  eqCols.forEach(col => {
    if (isActive) {
      col.classList.add("voice-bar");
      col.classList.remove("h-1", "bg-neutral-700");
      col.classList.add("bg-[#CCFF00]");
    } else {
      col.classList.remove("voice-bar");
      col.classList.add("h-1", "bg-neutral-700");
      col.classList.remove("bg-[#CCFF00]");
    }
  });

  const activeBadge = document.getElementById("live-audio-active-badge");
  if (activeBadge) {
    if (isActive) {
      activeBadge.classList.remove("hidden");
    } else {
      activeBadge.classList.add("hidden");
    }
  }
}

// --- 5. SYNTH VOICE PROFILE POPULATOR ---

/**
 * Retrieves user's default text-to-speech engine profile voices and populates dropdown option list.
 */
function loadSystemVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  
  voices = window.speechSynthesis.getVoices();
  const voiceSelect = document.getElementById("voice-dropdown");
  if (!voiceSelect) return;
  
  voiceSelect.innerHTML = "";
  if (voices.length === 0) {
    const option = document.createElement("option");
    option.textContent = "Searching local browser voices...";
    voiceSelect.appendChild(option);
    return;
  }
  
  voices.forEach(v => {
    const option = document.createElement("option");
    option.className = "bg-[#0E0E10] text-[#FFFFFF]";
    option.value = v.voiceURI;
    option.textContent = `${v.name} (${v.lang})`;
    voiceSelect.appendChild(option);
  });
  
  // Select default high-fidelity English voice if installed
  const defaultVoice = 
    voices.find(v => v.lang.startsWith("en-US")) || 
    voices.find(v => v.lang.startsWith("en")) || 
    voices[0];
    
  if (defaultVoice) {
    voiceSelect.value = defaultVoice.voiceURI;
    selectedVoiceURI = defaultVoice.voiceURI;
  }
}

// Subscribe voice load triggers
if (typeof window !== "undefined" && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = loadSystemVoices;
}

// --- 6. CORE TEXT-TO-SPEECH ACTION TRIGGERS ---

/**
 * Plays speech synthesis from the active text block.
 */
function handleStartSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    alert("Web Speech API not supported in your browser.");
    return;
  }
  
  window.speechSynthesis.cancel();
  highlightToken(null);
  
  const textarea = document.getElementById("paragraph-input-area");
  text = textarea ? textarea.value : "";
  tokens = tokenizeText(text);
  renderTokens();
  
  if (!text.trim()) {
    speakImmediate("Cannot read empty canvas. Please provide some text in the input area.");
    return;
  }
  
  currentUtterance = new SpeechSynthesisUtterance(text);
  const activeVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
  if (activeVoice) currentUtterance.voice = activeVoice;
  
  currentUtterance.rate = rate;
  currentUtterance.pitch = pitch;
  
  currentUtterance.onstart = () => {
    isPlaying = true;
    isPaused = false;
    updateEqualizerWave(true);
    logAnnouncement("Synthesizer started reading standard text block.");
  };
  
  currentUtterance.onend = () => {
    isPlaying = false;
    isPaused = false;
    updateEqualizerWave(false);
    highlightToken(null);
    logAnnouncement("Finished reading the text canvas.");
  };
  
  currentUtterance.onerror = (e) => {
    console.warn("Speech API issue detected:", e);
    isPlaying = false;
    isPaused = false;
    updateEqualizerWave(false);
    highlightToken(null);
  };
  
  // Real-time visual highlither mapped to phonetic boundaries
  currentUtterance.onboundary = (event) => {
    if (event.name === "word") {
      const charIdx = event.charIndex;
      
      const matched = tokens.find(
        tk => tk.isWord && charIdx >= tk.charStart && charIdx < tk.charEnd
      );
      
      if (matched) {
        highlightToken(matched.id);
      }
    }
  };
  
  window.speechSynthesis.speak(currentUtterance);
}

/**
 * Toggles speech pause and resume status.
 */
function handlePauseSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  
  if (isPlaying) {
    if (isPaused) {
      window.speechSynthesis.resume();
      isPaused = false;
      updateEqualizerWave(true);
      logAnnouncement("Resumed standard reading feed.");
    } else {
      window.speechSynthesis.pause();
      isPaused = true;
      updateEqualizerWave(false);
      logAnnouncement("Speech synthesis paused.");
    }
  }
}

/**
 * Halts any active audio vocalizations immediately.
 */
function handleStopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  isPlaying = false;
  isPaused = false;
  updateEqualizerWave(false);
  highlightToken(null);
  logAnnouncement("Speech synthesis stopped.");
}

// --- 7. PRESET CARD CODES LOADER ---

/**
 * Changes active preset block values and updates text area values natively.
 * @param {string} key Presets object keys
 */
function selectPreset(key) {
  if (!PRESETS[key]) return;
  
  activePreset = key;
  text = PRESETS[key].text;
  
  // Update state buttons active classes
  const presetKeys = Object.keys(PRESETS);
  presetKeys.forEach(pk => {
    const btn = document.getElementById(`preset-${pk}-btn`);
    if (btn) {
      if (pk === key) {
        btn.className = "preset-selector-btn active accessible-focus";
      } else {
        btn.className = "preset-selector-btn inactive accessible-focus";
      }
    }
  });
  
  // Update active preset description text label
  const presetDescLabel = document.getElementById("preset-desc-label");
  if (presetDescLabel) {
    presetDescLabel.innerHTML = `<span class="text-[#CCFF00] font-bold">&gt;&gt;</span> ${PRESETS[key].description}`;
  }
  
  // Reset text area
  const textarea = document.getElementById("paragraph-input-area");
  if (textarea) textarea.value = text;
  
  // Pre-calculate character counts
  updateStatsAndTokens();
  
  handleStopSpeaking();
  logAnnouncement(`Preset changed to ${PRESETS[key].label}. Text updated.`);
}

/**
 * Recalculates stats (characters & total words) on text modifications.
 */
function updateStatsAndTokens() {
  const textarea = document.getElementById("paragraph-input-area");
  const tempText = textarea ? textarea.value : "";
  tokens = tokenizeText(tempText);
  renderTokens();
  
  const statsLabel = document.getElementById("stats-label");
  if (statsLabel) {
    const wordCount = tokens.filter(tk => tk.isWord).length;
    statsLabel.textContent = `CHARACTERS: ${tempText.length} • WORDS: ${wordCount}`;
  }
}

// --- 8. EMPATHICAL BLACKOUT OVERLAY TOGGLER ---

/**
 * Switches between Eyes-Closed simulation mode views.
 */
function toggleEyesClosed(active) {
  eyesClosedMode = active;
  const overlay = document.getElementById("eyes-closed-overlay");
  
  if (active) {
    overlay.classList.remove("hidden");
    switchChallenge("intro");
    userAnswerChallenge1 = "";
    challenge2Completed = false;
    
    // Clear dynamic feedback nodes
    const fb1 = document.getElementById("challenge-1-feedback");
    const fb2 = document.getElementById("challenge-2-feedback");
    if (fb1) fb1.classList.add("hidden");
    if (fb2) fb2.classList.add("hidden");
    
    speakImmediate("Eyes closed simulator enabled. Visual styling is now masked to simulate blindness. Navigate through interactive modules using Tab and select challenges using Enter. Press Escape at any time to return to the visible workspace.", true);
  } else {
    overlay.classList.add("hidden");
    handleStopSpeaking();
    speakImmediate("Eyes closed simulation deactivated. Main visual dashboard restored.", true);
  }
}

/**
 * Swaps sub-challenge room components in Blackout mode.
 */
function switchChallenge(challengeName) {
  activeChallenge = challengeName;
  
  // Hide all containers
  document.getElementById("challenge-intro-content").classList.add("hidden");
  document.getElementById("challenge-alt-content").classList.add("hidden");
  document.getElementById("challenge-safari-content").classList.add("hidden");
  
  // Reset navigation tabs class styles
  const rooms = ["intro", "mystery-alt", "link-safari"];
  rooms.forEach(rm => {
    const btn = document.getElementById(`btn-tab-${rm}`);
    if (btn) {
      btn.className = "tab-nav-btn accessible-focus";
    }
  });
  
  // Show active tab
  if (challengeName === "intro") {
    document.getElementById("challenge-intro-content").classList.remove("hidden");
    document.getElementById("btn-tab-intro").className = "tab-nav-btn active accessible-focus";
    speakImmediate("Obstacle Intro panel dashboard active.", true);
  } else if (challengeName === "mystery-alt") {
    document.getElementById("challenge-alt-content").classList.remove("hidden");
    document.getElementById("btn-tab-mystery-alt").className = "tab-nav-btn active accessible-focus";
    speakImmediate("Obstacle Image Alt audit workspace loaded.", true);
  } else if (challengeName === "link-safari") {
    document.getElementById("challenge-safari-content").classList.remove("hidden");
    document.getElementById("btn-tab-link-safari").className = "tab-nav-btn active accessible-focus";
    speakImmediate("Obstacle Link label safari target active.", true);
  }
}

/**
 * Checks choice outcome inside Image Alt Audit Room
 */
function selectChallenge1Option(option) {
  userAnswerChallenge1 = option;
  const feedbackNode = document.getElementById("challenge-1-feedback");
  feedbackNode.classList.remove("hidden");
  
  if (option === 'B') {
    feedbackNode.innerHTML = `
      <span class="challenge-result-success">
        <svg class="svg-stroke" style="width: 14px; height: 14px; stroke: currentColor;" viewBox="0 0 24 24" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Correct choice! Proper alt descriptions build equal opportunities.
      </span>
    `;
    speakImmediate("Correct choice! Proper alt descriptions build equal opportunities.", true);
  } else {
    feedbackNode.innerHTML = `
      <span class="challenge-result-failure">
        Option A left the user clueless. Scribes need valid descriptive alternate parameters!
      </span>
    `;
    speakImmediate("Option A left the user clueless. Scribes need valid descriptive alternate parameters!", true);
  }
}

/**
 * Completes Link Label Hunt obstacle successfully.
 */
function completeChallenge2() {
  challenge2Completed = true;
  const feedbackNode = document.getElementById("challenge-2-feedback");
  feedbackNode.classList.remove("hidden");
  feedbackNode.innerHTML = `
    <span class="challenge-result-success">
      <svg class="svg-stroke" style="width: 14px; height: 14px; stroke: currentColor;" viewBox="0 0 24 24" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      Outstanding! Sighted users saved valuable seconds of sequential browsing.
    </span>
  `;
  speakImmediate("Outstanding! Sighted users saved valuable seconds of sequential browsing.", true);
}

// --- 9. EXPORT FULLY STANDALONE HTML FILE ---

/**
 * Self-compiles the current native DOM state and downloads a single, offline-ready 
 * standalone .html draft file directly into user's browser.
 */
function handleExportHTML() {
  const documentClone = document.documentElement.cloneNode(true);
  
  // Strip out Vite script dependencies from exported standalone version to ensure pure offline compatibility
  const scripts = documentClone.querySelectorAll("script");
  scripts.forEach(sc => {
    if (sc.src && sc.src.includes("app.js")) {
      // Inline our javascript content instead!
      const inlineScript = documentClone.createElement("script");
      inlineScript.type = "text/javascript";
      // Fetch current script source using relative fetch or embed
      inlineScript.textContent = `
// STANDALONE INLINED ENGINE INITIALIZER
${document.querySelector("script[src*='app.js']") ? '' : '/* Core js logic inline below */'}
` + document.querySelector("script[src*='app.js']")?.textContent || `
// Embed the core JS functions
const PRESETS = ${JSON.stringify(PRESETS)};
let text = PRESETS.standard.text;
let activePreset = "standard";
let isPlaying = false;
let isPaused = false;
let voices = [];
let selectedVoiceURI = "";
let rate = 1.0;
let pitch = 1.0;
let eyesClosedMode = false;
let activeChallenge = "intro";
let userAnswerChallenge1 = "";
let challenge2Completed = false;
let tokens = [];
let activeTokenId = null;
let currentUtterance = null;
let currentActiveSpanId = null;

${tokenizeText.toString()}
${logAnnouncement.toString()}
${speakImmediate.toString()}
${handleElementFocus.toString()}
${renderTokens.toString()}
${highlightToken.toString()}
${updateEqualizerWave.toString()}
${loadSystemVoices.toString()}
${handleStartSpeaking.toString()}
${handlePauseSpeaking.toString()}
${handleStopSpeaking.toString()}
${selectPreset.toString()}
${updateStatsAndTokens.toString()}
${toggleEyesClosed.toString()}
${switchChallenge.toString()}
${selectChallenge1Option.toString()}
${completeChallenge2.toString()}
${handleExportHTML.toString()}

// Mount DOM Listeners on page load
window.addEventListener("DOMContentLoaded", () => {
  // Bind standard parameters, loaders and binds
  loadSystemVoices();
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadSystemVoices;
  }
  
  // Register basic actions
  document.getElementById("start-speak-btn").addEventListener("click", handleStartSpeaking);
  document.getElementById("pause-speak-btn").addEventListener("click", handlePauseSpeaking);
  document.getElementById("stop-speak-btn").addEventListener("click", handleStopSpeaking);
  
  document.getElementById("btn-tab-intro").addEventListener("click", () => switchChallenge("intro"));
  document.getElementById("btn-tab-mystery-alt").addEventListener("click", () => switchChallenge("mystery-alt"));
  document.getElementById("btn-tab-link-safari").addEventListener("click", () => switchChallenge("link-safari"));
  
  document.getElementById("preset-standard-btn").addEventListener("click", () => selectPreset("standard"));
  document.getElementById("preset-bad_alt-btn").addEventListener("click", () => selectPreset("bad_alt"));
  document.getElementById("preset-data_table-btn").addEventListener("click", () => selectPreset("data_table"));
  document.getElementById("preset-custom-btn").addEventListener("click", () => selectPreset("custom"));
  
  document.getElementById("rate-input-slider").addEventListener("input", (e) => {
    rate = parseFloat(e.target.value);
    document.getElementById("rate-val-indicator").textContent = rate + "x";
  });
  
  document.getElementById("pitch-input-slider").addEventListener("input", (e) => {
    pitch = parseFloat(e.target.value);
    document.getElementById("pitch-val-indicator").textContent = pitch;
  });
  
  document.getElementById("voice-dropdown").addEventListener("change", (e) => {
    selectedVoiceURI = e.target.value;
  });
  
  document.getElementById("eyes-blackout-toggle-btn").addEventListener("click", () => toggleEyesClosed(true));
  document.getElementById("close-eyes-toggle-exit-btn").addEventListener("click", () => toggleEyesClosed(false));
  document.getElementById("overlay-eyes-toggle-exit-btn").addEventListener("click", () => toggleEyesClosed(false));
  
  document.getElementById("challenge-audit-opt-a").addEventListener("click", () => selectChallenge1Option("A"));
  document.getElementById("challenge-audit-opt-b").addEventListener("click", () => selectChallenge1Option("B"));
  
  document.getElementById("challenge-safari-btn-1").addEventListener("click", () => speakImmediate("You focused an anchor. Voice reports: Link, Click here. Destination unknown to reader.", true));
  document.getElementById("challenge-safari-btn-2").addEventListener("click", () => speakImmediate("You focused an anchor. Voice reports: Link, Read more. Destination unknown.", true));
  document.getElementById("challenge-safari-btn-3").addEventListener("click", () => completeChallenge2());
  
  document.getElementById("paragraph-input-area").addEventListener("input", updateStatsAndTokens);
  
  document.getElementById("export-app-btn").addEventListener("click", handleExportHTML);
  
  selectPreset("standard");
});
`;
      sc.parentNode.replaceChild(inlineScript, sc);
    } else if (sc.src && (sc.src.includes("main.tsx") || sc.src.includes("vite"))) {
      sc.parentNode.removeChild(sc);
    }
  });
  
  const finalHtml = "<!DOCTYPE html>\n" + documentClone.outerHTML;
  const blob = new Blob([finalHtml], { type: "text/html" });
  const downloadUrl = URL.createObjectURL(blob);
  
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = "seewithsound-simulator.html";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(downloadUrl);
}

// --- 10. ACTIVE ELEMENT DELEGATED FOCUS WATCHER ---

// Capture-phase global tab-focus event listener to simulate assistive speech guidance
document.addEventListener("focus", (event) => {
  const target = event.target;
  if (!target) return;
  
  const tagName = target.tagName.toLowerCase();
  
  // Filter out non-interactive nodes to prevent auditory pollution
  const isInteractive = 
    tagName === "button" || 
    tagName === "a" || 
    tagName === "textarea" || 
    tagName === "select" || 
    tagName === "input" ||
    target.hasAttribute("onclick") ||
    target.getAttribute("role") === "button";
    
  if (isInteractive) {
    const accessibleName = 
      target.getAttribute("aria-label") || 
      target.textContent?.replace(/[\r\n\s]+/g, " ").trim() || 
      target.id || 
      "Interactive element";
      
    const accessibleRole = target.getAttribute("role") || tagName;
    const desc = target.getAttribute("data-desc") || "";
    
    handleElementFocus(accessibleName, accessibleRole, desc);
  }
}, true);

// --- 11. GLOBAL ACCESSIBILITY KEYBOARD HOTKEYS ---

window.addEventListener("keydown", (e) => {
  // Bypass controls if user is writing in the input area
  if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT") {
    return;
  }
  
  const key = e.key.toLowerCase();
  
  if (e.key === " ") {
    e.preventDefault();
    if (isPlaying) {
      handlePauseSpeaking();
    } else {
      handleStartSpeaking();
    }
  } else if (e.key === "Escape") {
    e.preventDefault();
    handleStopSpeaking();
    if (eyesClosedMode) {
      toggleEyesClosed(false);
    }
  } else if (e.key === "[") {
    e.preventDefault();
    rate = Math.max(0.5, parseFloat((rate - 0.1).toFixed(1)));
    
    const rateSlider = document.getElementById("rate-input-slider");
    const rateIndicator = document.getElementById("rate-val-indicator");
    if (rateSlider) rateSlider.value = rate;
    if (rateIndicator) rateIndicator.textContent = `${rate}x`;
    
    logAnnouncement(`Speed decreased to ${rate}x.`);
  } else if (e.key === "]") {
    e.preventDefault();
    rate = Math.min(3.0, parseFloat((rate + 0.1).toFixed(1)));
    
    const rateSlider = document.getElementById("rate-input-slider");
    const rateIndicator = document.getElementById("rate-val-indicator");
    if (rateSlider) rateSlider.value = rate;
    if (rateIndicator) rateIndicator.textContent = `${rate}x`;
    
    logAnnouncement(`Speed increased to ${rate}x.`);
  } else if (key === "r") {
    e.preventDefault();
    selectPreset("standard");
  }
});

// --- 12. RUNTIME BOOTSTRAP INITIALIZATION ---

document.addEventListener("DOMContentLoaded", () => {
  // Run voice populator
  loadSystemVoices();
  
  // Load standard standard template immediately
  selectPreset("standard");
  
  // Register manual DOM click listeners to support modular plain JS triggers safely
  document.getElementById("start-speak-btn").addEventListener("click", handleStartSpeaking);
  document.getElementById("pause-speak-btn").addEventListener("click", handlePauseSpeaking);
  document.getElementById("stop-speak-btn").addEventListener("click", handleStopSpeaking);
  
  document.getElementById("btn-tab-intro").addEventListener("click", () => switchChallenge("intro"));
  document.getElementById("btn-tab-mystery-alt").addEventListener("click", () => switchChallenge("mystery-alt"));
  document.getElementById("btn-tab-link-safari").addEventListener("click", () => switchChallenge("link-safari"));
  
  document.getElementById("preset-standard-btn").addEventListener("click", () => selectPreset("standard"));
  document.getElementById("preset-bad_alt-btn").addEventListener("click", () => selectPreset("bad_alt"));
  document.getElementById("preset-data_table-btn").addEventListener("click", () => selectPreset("data_table"));
  document.getElementById("preset-custom-btn").addEventListener("click", () => selectPreset("custom"));
  
  document.getElementById("rate-input-slider").addEventListener("input", (e) => {
    rate = parseFloat(e.target.value);
    document.getElementById("rate-val-indicator").textContent = `${rate}x`;
  });
  
  document.getElementById("pitch-input-slider").addEventListener("input", (e) => {
    pitch = parseFloat(e.target.value);
    document.getElementById("pitch-val-indicator").textContent = pitch;
  });
  
  document.getElementById("voice-dropdown").addEventListener("change", (e) => {
    selectedVoiceURI = e.target.value;
  });
  
  document.getElementById("eyes-blackout-toggle-btn").addEventListener("click", () => toggleEyesClosed(true));
  document.getElementById("close-eyes-toggle-exit-btn").addEventListener("click", () => toggleEyesClosed(false));
  document.getElementById("overlay-eyes-toggle-exit-btn").addEventListener("click", () => toggleEyesClosed(false));
  
  document.getElementById("challenge-audit-opt-a").addEventListener("click", () => selectChallenge1Option("A"));
  document.getElementById("challenge-audit-opt-b").addEventListener("click", () => selectChallenge1Option("B"));
  
  document.getElementById("challenge-safari-btn-1").addEventListener("click", () => speakImmediate("You focused an anchor. Voice reports: Link, Click here. Destination unknown to reader.", true));
  document.getElementById("challenge-safari-btn-2").addEventListener("click", () => speakImmediate("You focused an anchor. Voice reports: Link, Read more. Destination unknown.", true));
  document.getElementById("challenge-safari-btn-3").addEventListener("click", () => completeChallenge2());
  
  document.getElementById("paragraph-input-area").addEventListener("input", updateStatsAndTokens);
  
  document.getElementById("export-app-btn").addEventListener("click", handleExportHTML);
});
