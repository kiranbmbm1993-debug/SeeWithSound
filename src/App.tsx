import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  Sliders, 
  Download, 
  Info, 
  Accessibility, 
  RotateCcw, 
  FileText, 
  CheckCircle, 
  Eye, 
  EyeOff, 
  Link as LinkIcon, 
  CornerDownRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';

// Word Tokenizer Interface
interface Token {
  id: number;
  text: string;
  isWord: boolean;
  charStart: number;
  charEnd: number;
}

// Preset Texts representing distinct accessibility scenarios
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

// Initial state text definition
const DEFAULT_TEXT = PRESETS.standard.text;

export default function App() {
  const [text, setText] = useState<string>(DEFAULT_TEXT);
  const [activePreset, setActivePreset] = useState<keyof typeof PRESETS>('standard');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeTokenId, setActiveTokenId] = useState<number | null>(null);
  
  // Voice Settings API
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [rate, setRate] = useState<number>(1.0);
  const [pitch, setPitch] = useState<number>(1.0);
  
  // Simulation Settings
  const [eyesClosedMode, setEyesClosedMode] = useState<boolean>(false);
  const [activeChallenge, setActiveChallenge] = useState<string>('intro');
  const [userAnswerChallenge1, setUserAnswerChallenge1] = useState<string>('');
  const [challenge2Completed, setChallenge2Completed] = useState<boolean>(false);
  const [screenerLogs, setScreenerLogs] = useState<string[]>(["System loaded. Ready for simulation."]);

  // Accessibility Announcement log
  const [accessibilitySubtitle, setAccessibilitySubtitle] = useState<string>("Ready. Focus an element or click 'Start Reading'.");

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 1. Parse tokens smoothly depending on active text
  const tokens = useMemo(() => {
    if (!text) return [];
    const result: Token[] = [];
    const regex = /(\p{L}+|\p{N}+|[^\p{L}\p{N}\s]+|\s+)/gu;
    const matches = Array.from(text.matchAll(regex)) as RegExpMatchArray[];
    
    let id = 0;
    for (const match of matches) {
      const matchText = match[0];
      const charStart = match.index ?? 0;
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
  }, [text]);

  // Keep a ref to avoid closures stale states in speech boundaries
  const tokensRef = useRef<Token[]>(tokens);
  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  // 2. Load system voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        const sysVoices = window.speechSynthesis.getVoices();
        setVoices(sysVoices);
        
        // Select an English, high-quality voice by default if possible
        if (sysVoices.length > 0) {
          const defaultVoice = 
            sysVoices.find(v => v.lang.startsWith('en-US')) || 
            sysVoices.find(v => v.lang.startsWith('en')) || 
            sysVoices[0];
          setSelectedVoiceURI(defaultVoice.voiceURI);
        }
      }
    };

    loadVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Synchronize cancellation on component unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 3. Screen Reader Speech Logging System
  const logAnnouncement = (announcement: string) => {
    setAccessibilitySubtitle(announcement);
    setScreenerLogs(prev => [
      `[Voice] ${announcement}`,
      ...prev.slice(0, 19)
    ]);
  };

  // Speaks an announcement directly (with optional cancel to keep responsive)
  const speakImmediate = (phrase: string, interrupt = true) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (interrupt) {
      window.speechSynthesis.cancel();
    }
    const announceUtterance = new SpeechSynthesisUtterance(phrase);
    const activeVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (activeVoice) announceUtterance.voice = activeVoice;
    
    // Speed up navigation feedback slightly so users don't get bored
    announceUtterance.rate = rate * 1.1; 
    announceUtterance.pitch = pitch;
    
    window.speechSynthesis.speak(announceUtterance);
    logAnnouncement(phrase);
  };

  // Keyboard accessibility triggers for active controls
  const handleElementFocus = (elementName: string, elementRole: string, descriptiveGuide = "") => {
    const fullText = `${elementName}, ${elementRole}. ${descriptiveGuide}`;
    if (eyesClosedMode) {
      speakImmediate(fullText, true);
    } else {
      setAccessibilitySubtitle(fullText);
    }
  };

  // 4. Primary TTS Engine Handlers
  const handleStartSpeaking = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      alert("Web Speech API not supported in this browser.");
      return;
    }

    // Reset synthesis state
    window.speechSynthesis.cancel();
    setActiveTokenId(null);

    if (!text.trim()) {
      speakImmediate("Cannot read empty canvas. Please provide some text in the input area.");
      return;
    }

    const u = new SpeechSynthesisUtterance(text);
    const activeVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
    if (activeVoice) u.voice = activeVoice;
    
    u.rate = rate;
    u.pitch = pitch;

    u.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      logAnnouncement("Synthesizer started reading standard text block.");
    };

    u.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setActiveTokenId(null);
      logAnnouncement("Finished reading the text canvas.");
    };

    u.onerror = (evt) => {
      console.warn("Synthesis Utterance issue:", evt);
      setIsPlaying(false);
      setIsPaused(false);
      setActiveTokenId(null);
    };

    // Word highlighting callback utilizing SpeechSynthesisUtterance
    u.onboundary = (event) => {
      if (event.name === 'word') {
        const charIdx = event.charIndex;
        const currentTokens = tokensRef.current;
        
        // Match token covering active speech segment
        const matched = currentTokens.find(
          t => t.isWord && charIdx >= t.charStart && charIdx < t.charEnd
        );
        
        if (matched) {
          setActiveTokenId(matched.id);
          // Highlight scroll tracking
          const el = document.getElementById(`feed-token-${matched.id}`);
          if (el) {
            el.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest',
              inline: 'nearest'
            });
          }
        }
      }
    };

    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  };

  const handlePauseSpeaking = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isPlaying) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
        logAnnouncement("Resumed standard reading feed.");
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
        logAnnouncement("Speech synthesis paused.");
      }
    }
  };

  const handleStopSpeaking = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setActiveTokenId(null);
    logAnnouncement("Speech synthesis stopped.");
  };

  // Change Preset and restart speech if playing
  const selectPreset = (key: keyof typeof PRESETS) => {
    setActivePreset(key);
    setText(PRESETS[key].text);
    handleStopSpeaking();
    logAnnouncement(`Preset changed to ${PRESETS[key].label}. Text updated.`);
  };

  // Keyboard navigation binds for general app parameters (Hotkeys)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is writing into the textarea
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        if (isPlaying) {
          handlePauseSpeaking();
        } else {
          handleStartSpeaking();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleStopSpeaking();
        if (eyesClosedMode) {
          setEyesClosedMode(false);
          speakImmediate("Simulation exited. Visual view restored.", true);
        }
      } else if (e.key === '[') {
        e.preventDefault();
        setRate(prev => Math.max(0.5, parseFloat((prev - 0.1).toFixed(1))));
        logAnnouncement(`Speed decreased.`);
      } else if (e.key === ']') {
        e.preventDefault();
        setRate(prev => Math.min(3.0, parseFloat((prev + 0.1).toFixed(1))));
        logAnnouncement(`Speed increased.`);
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        setText(DEFAULT_TEXT);
        setActivePreset('standard');
        handleStopSpeaking();
        logAnnouncement("Text canvas reset to standard template.");
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isPlaying, isPaused, text, selectedVoiceURI, rate, pitch, eyesClosedMode]);

  // Triggering spoken guidance when toggle active
  const toggleEyesClosedMode = () => {
    const newState = !eyesClosedMode;
    setEyesClosedMode(newState);
    
    if (newState) {
      setActiveChallenge('intro');
      setUserAnswerChallenge1('');
      setChallenge2Completed(false);
      speakImmediate(
        "Eyes closed simulator enabled. Visual styling is now masked to simulate blindness. Navigate through interactive modules using Tab and select challenges using Enter. Press Escape at any time to return to the visible workspace.",
        true
      );
    } else {
      speakImmediate("Eyes closed simulation deactivated. Main visual dashboard restored.", true);
    }
  };

  // Export fully client-side static HTML file function
  const handleExportHTML = () => {
    const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SeeWithSound - Screen Reader Simulator</title>
  <style>
    /* High Contrast Black & White Swiss styling */
    :root {
      --bg: #ffffff;
      --text: #000000;
      --accent: #ffd700;
      --font-family: 'Inter', system-ui, -apple-system, sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-family);
      line-height: 1.6;
      padding: 2rem 1rem;
      min-height: 100vh;
      font-size: 18px; /* High legibility minimum standard */
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
      border: 6px solid #000000;
      background: #ffffff;
      padding: 2rem;
      box-shadow: 12px 12px 0px #000000;
    }

    header {
      border-bottom: 6px solid #000000;
      padding-bottom: 1.5rem;
      margin-bottom: 2rem;
    }

    .logo-badge {
      display: inline-block;
      background: #000000;
      color: #ffffff;
      padding: 0.25rem 0.75rem;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 1rem;
      letter-spacing: 0.1em;
      margin-bottom: 0.5rem;
    }

    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      text-transform: uppercase;
    }

    .tagline {
      font-size: 1.2rem;
      font-weight: 500;
      text-decoration: underline;
      margin-top: 0.25rem;
    }

    /* Stats Banner */
    .banner-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      border: 4px solid #000000;
      padding: 1.5rem;
      margin-bottom: 2rem;
      background: #fcfcfc;
    }

    .banner-stat {
      font-size: 2.22rem;
      font-weight: 800;
      line-height: 1.1;
    }

    /* Core Layout */
    .playground {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 2rem;
      border-bottom: 4px solid #000000;
      padding-bottom: 2rem;
    }

    @media (max-width: 850px) {
      .playground, .banner-grid {
        grid-template-columns: 1fr;
      }
    }

    .panel-header {
      font-size: 1.2rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #000000;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .badge {
      border: 2px solid #000000;
      padding: 0.1rem 0.5rem;
      font-size: 0.8rem;
    }

    /* Controls Styling */
    textarea {
      width: 100%;
      height: 250px;
      font-size: 1.1rem;
      padding: 1rem;
      border: 4px solid #000000;
      font-family: monospace;
      resize: vertical;
    }

    textarea:focus, select:focus, input:focus, button:focus {
      outline: 4px solid #000000;
      outline-offset: 2px;
    }

    .presets-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin: 1rem 0;
    }

    .preset-btn {
      background: #ffffff;
      color: #000000;
      border: 2px solid #000000;
      padding: 0.4rem 0.8rem;
      font-size: 0.9rem;
      font-weight: 700;
      cursor: pointer;
    }

    .preset-btn.active {
      background: #000000;
      color: #ffffff;
    }

    /* Control Sliders */
    .control-group {
      margin-bottom: 1.25rem;
    }

    label {
      display: block;
      font-weight: 700;
      margin-bottom: 0.25rem;
      font-size: 1rem;
      text-transform: uppercase;
    }

    select, input[type="range"] {
      width: 100%;
      height: 44px;
      border: 3px solid #000000;
      font-size: 1rem;
      background: #ffffff;
    }

    .btn-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      margin-top: 1.5rem;
    }

    .btn {
      padding: 0.8rem;
      background: #ffffff;
      color: #000000;
      border: 4px solid #000000;
      font-weight: bold;
      text-transform: uppercase;
      cursor: pointer;
      font-size: 1.1rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: background 0.1s;
    }

    .btn:hover {
      background: #000000;
      color: #ffffff;
    }

    .btn-primary {
      background: #000000;
      color: #ffffff;
      grid-column: span 2;
    }

    .btn-primary:hover {
      background: #ffffff;
      color: #000000;
    }

    /* Live Feed Highlighter styling */
    .live-feed-outer {
      border: 4px solid #000000;
      margin-top: 2rem;
      padding: 1.5rem;
      background: #fafafa;
    }

    .live-feed-text {
      max-height: 200px;
      overflow-y: auto;
      font-size: 1.22rem;
      padding: 0.5rem;
      line-height: 1.8;
      border: 2px solid #e0e0e0;
      background: #ffffff;
    }

    .word {
      padding: 0.1rem 0.2rem;
      transition: background-color 0.1s ease;
      display: inline-block;
    }

    .highlighted-word {
      background-color: var(--accent);
      color: #000000;
      border: 2px solid #000000;
      font-weight: 700;
    }

    /* Subtitle and Assistive Logs */
    .subtitle-overlay {
      background: #000000;
      color: #ffffff;
      padding: 1rem;
      font-family: monospace;
      font-size: 0.95rem;
      border-left: 8px solid var(--accent);
      margin-bottom: 2rem;
    }

    /* Visual equalizer columns */
    .equalizer-wave {
      display: flex;
      align-items: flex-end;
      gap: 4px;
      height: 30px;
      margin-left: 10px;
    }

    .eq-col {
      width: 4px;
      background-color: #000000;
      height: 5px;
    }

    .speaking .eq-col {
      animation: pulseCol 0.8s ease-in-out infinite alternate;
    }

    @keyframes pulseCol {
      0% { height: 4px; }
      100% { height: 28px; }
    }

    /* Eyes Closed Simulation Mask */
    #eyes-closed-overlay {
      position: fixed;
      inset: 0;
      background: #000000;
      color: #ffffff;
      z-index: 10000;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
    }

    #eyes-closed-overlay.active {
      display: flex;
    }

    .closed-instructions {
      max-width: 650px;
      margin-bottom: 2rem;
    }

    .closed-h1 {
      font-size: 2.2rem;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 1.5rem;
    }

    /* Info Footer Section */
    .info-footer {
      margin-top: 3rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    @media (max-width: 750px) {
      .info-footer {
        grid-template-columns: 1fr;
      }
    }

    .info-card {
      border: 3px solid #000000;
      padding: 1.5rem;
    }

    .info-card h3 {
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 0.75rem;
      border-bottom: 2px solid #000000;
      padding-bottom: 0.25rem;
    }

    /* Challenge Board for Blind Mode */
    .blind-challenge-box {
      border: 3px solid #ffffff;
      padding: 1.5rem;
      max-width: 600px;
      margin: 1.5rem auto;
      background: #111;
      text-align: left;
    }

    .blind-challenge-title {
      font-weight: bold;
      color: var(--accent);
      text-transform: uppercase;
      font-size: 1rem;
      border-bottom: 1px solid #ffffff;
      padding-bottom: 0.25rem;
      margin-bottom: 0.75rem;
    }

    .alert-banner {
      background: #fdf5e6;
      border: 3px solid #000000;
      padding: 1rem;
      margin-bottom: 2.5rem;
      font-size: 1rem;
    }
  </style>
</head>
<body>

  <div class="container">
    <header>
      <div class="logo-badge">SeeWithSound Project</div>
      <h1>SeeWithSound</h1>
      <p class="tagline">Experience the web like a blind user &bull; Screen Reader Simulator</p>
    </header>

    <div class="alert-banner">
      <strong>Accessibility Navigation:</strong> Press <strong>Space</strong> to Play/Pause, 
      <strong>Escape</strong> to stop, and <strong>[</strong> or <strong>]</strong> to change speech rate! 
      Every control operates fully using standard <strong>Tab</strong> and <strong>Enter</strong> key sequences.
    </div>

    <!-- Live Announcement Bar -->
    <div class="control-group">
      <label>Simulated Screen Reader Telemetry (Audible Announcement Subtitle)</label>
      <div id="subtitles" class="subtitle-overlay" role="status" aria-live="assertive">
        Ready. Focus any element using Tab, or click 'Start Reading'.
      </div>
    </div>

    <!-- Stat Banner -->
    <section class="banner-grid" aria-label="Visual Impairment Statistics">
      <div>
        <div class="banner-stat">285,000,000+</div>
        <p>people worldwide are living with visually impairments. 39 Million are fully blind.</p>
      </div>
      <div>
        <div class="banner-stat">Over 98.1%</div>
        <p>of the top 1,000,000 active websites carry critical failures (omitted alt tags or broken semantic roadmaps).</p>
      </div>
    </section>

    <!-- Main Playground Workspace Layout -->
    <main class="playground">
      
      <!-- Input Column -->
      <div>
        <div class="panel-header">
          <span>THE INPUT CANVAS</span>
          <span class="badge">Editable</span>
        </div>

        <div class="presets-row">
          <button class="preset-btn active" id="p-std" onclick="selectPreset('standard')">Standard Blog Draft</button>
          <button class="preset-btn" id="p-alt" onclick="selectPreset('bad_alt')">Alt-Text Specimen</button>
          <button class="preset-btn" id="p-tbl" onclick="selectPreset('data_table')">Tabular Grid Sample</button>
          <button class="preset-btn" id="p-cst" onclick="selectPreset('custom')">Blank Whiteboard</button>
        </div>

        <textarea id="text-canvas" placeholder="Type or paste any digital paragraphs to simulate speech..." 
          aria-label="Text Input Area to speak" oninput="handleTextInput()"></textarea>
      </div>

      <!-- Controls Panel -->
      <div>
        <div class="panel-header">
          <span>SPEECH CONFIG & CONTROLS</span>
          <div class="equalizer-wave" id="visual-eq" aria-hidden="true">
            <div class="eq-col"></div>
            <div class="eq-col"></div>
            <div class="eq-col"></div>
            <div class="eq-col"></div>
            <div class="eq-col"></div>
          </div>
        </div>

        <div class="control-group">
          <label for="voice-select">Dynamic TTS Voice Menu</label>
          <select id="voice-select" onchange="speechParamChanged()"></select>
        </div>

        <div class="control-group">
          <label for="rate-slider">Voice Rate Speed: <span id="val-rate">1.0</span>x</label>
          <input type="range" id="rate-slider" min="0.5" max="3" step="0.1" value="1.0" oninput="speechParamChanged()">
        </div>

        <div class="control-group">
          <label for="pitch-slider">Speech Pitch Level: <span id="val-pitch">1.0</span></label>
          <input type="range" id="pitch-slider" min="0.5" max="2" step="0.1" value="1.0" oninput="speechParamChanged()">
        </div>

        <!-- Simulator Core Actions -->
        <div class="btn-grid">
          <button id="btn-play" class="btn btn-primary" onclick="startSpeech()" aria-label="Start vocalizing Text">
            Start Reading
          </button>
          <button id="btn-pause" class="btn" onclick="pauseSpeech()" aria-label="Pause or Resume speech synthesis">
            Pause / Resume
          </button>
          <button id="btn-stop" class="btn" onclick="stopSpeech()" aria-label="Stop vocalizing copy draft">
            Stop Speaking
          </button>
        </div>

        <!-- Eyes Closed Simulator Trigger -->
        <div style="margin-top: 1.5rem; padding: 1rem; border: 3px dashed #000000; background: #fafafa;">
          <h4 style="font-weight: 800; margin-bottom: 0.25rem;">EXPERIENCE PURE BLINDNESS</h4>
          <p style="font-size: 0.9rem; margin-bottom: 0.75rem;">Turns the screen pitch-black. Challenge yourself to navigate and solve obstacles using only your headset feedback!</p>
          <button class="btn" style="width: 100%; border-style: solid; background: #000; color: #fff;" onclick="toggleEyesClosed(true)">
            Start Eyes-Closed Simulator Mode
          </button>
        </div>

      </div>

    </main>

    <!-- Highlighter Word view stream -->
    <div class="live-feed-outer">
      <div class="panel-header" style="border-bottom-width: 1px; font-size: 1rem; margin-bottom: 0.5rem;">
        <span>Word-By-Word Audio Highlight Stream</span>
        <span style="font-size: 0.8rem; text-transform: uppercase;" id="word-stats">No spoken feedback running</span>
      </div>
      <div id="highlight-board" class="live-feed-text">
        <!-- Spans are injected dynamically -->
      </div>
    </div>

    <!-- Resume Info Footer blocks -->
    <section class="info-footer">
      <div class="info-card">
        <h3>What is a Screen Reader?</h3>
        <p style="font-size:0.95rem; line-height: 1.5;">
          A Screen Reader is an assistive technology software that renders text and image content as speech or braille output. 
          Blind, visually impaired, or print-disabled individuals rely on readers to navigate the online world, 
          using sequential command shortcuts instead of a standard visual pointer or monitor.
        </p>
      </div>

      <div class="info-card">
        <h3>Why Semantic Structures Matter</h3>
        <p style="font-size:0.95rem; line-height: 1.5;">
          Writing valid, compliant HTML elements is not just about search engine values. It creates a robust programmatic model. 
          When headings are placed logically, ARIA labels are declared correctly, and tables are structured cleanly, developers enable 
          equal opportunities for independent, friction-free computing.
        </p>
      </div>
    </section>

  </div>

  <!-- Eyes closed immersive overlay container -->
  <div id="eyes-closed-overlay">
    <div class="closed-instructions">
      <div class="logo-badge" style="background:#fff; color:#000;">Inclusion Simulator</div>
      <h2 class="closed-h1">Eyes-Closed Simulation Active</h2>
      <p style="font-size: 1.25rem; margin-bottom: 1.5rem;">
        Awesome! Sighted screen layout is fully blacked-out. Close your eyes and experience the web like a blind user!
      </p>
      <p style="font-size: 1.05rem; margin-bottom: 1rem; opacity: 0.82;">
        Press <strong>TAB</strong> or <strong>Shift + TAB</strong> to cycle through challenges. 
        Press <strong>ENTER</strong> to trigger sounds or actions inside cards. 
        Press <strong>ESCAPE</strong> to exit this simulation at any time.
      </p>

      <!-- Simulated Screen Reader Log Inside Mask -->
      <div style="background: #111; border: 2px solid #555; padding: 1rem; font-family: monospace; text-align: left; margin: 1rem 0;">
        <span style="color:#00ff00; font-weight:800;">Simulated Screen Reader Announcement:</span>
        <div id="closed-subtitle" style="color:#ffffff; margin-top:0.25rem; font-size:1.1rem; min-height: 1.5em;">
          Ready. Focus an element or press TAB.
        </div>
      </div>

      <!-- Simulator Challenges Block -->
      <div class="blind-challenge-box">
        <div class="blind-challenge-title">Active Test Obstacle 1: Image Audit Room</div>
        <p style="font-size: 0.95rem; margin-bottom: 0.75rem; opacity:0.9;">
          Focus on and inspect these image buttons to experience proper alt text vs. raw digital noise!
        </p>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn" style="border-color:#fff; color:#fff; background:transparent; font-size:0.85rem;" 
            id="c1-b1" onclick="triggerClosedSpeech('Image tag without alternative text. File name: IMG_92839_puppy_final_draft.png. Image may contain puppy.')"
            onfocus="triggerAnnounce('Mystery Badge Image option, button. Click to read alt text.')">
            Image Code Option A
          </button>
          <button class="btn" style="border-color:#fff; color:#fff; background:transparent; font-size:0.85rem;" 
            id="c1-b2" onclick="triggerClosedSpeech('Correctly described Alt tag: A cute golden retriever puppy sitting playfully in green grass wearing a tiny yellow birthday hat next to a single vanilla cake candle.')"
            onfocus="triggerAnnounce('Clean accessibility described alt segment option, button. Click to read alt text.')">
            Image Code Option B
          </button>
        </div>
      </div>

      <div class="blind-challenge-box">
        <div class="blind-challenge-title">Active Test Obstacle 2: Link Label Room</div>
        <p style="font-size: 0.95rem; margin-bottom: 0.75rem; opacity:0.9;">
          There are multiple links in this drawer. Challenge: Identify the correct portal leading to 'Download Syllabus PDF'.
        </p>
        <div style="display:flex; flex-direction:column; gap:0.4rem;">
          <button class="btn" style="border-color:#fff; color:#fff; background:transparent; font-size:0.8rem; text-align:left; justify-content:flex-start;"
            id="c2-b1" onclick="triggerClosedSpeech('Inaccessible feedback. Navigation leads to unidentified page.')"
            onfocus="triggerAnnounce('Link, click here. Interactive link.')">
            Link Element 1
          </button>
          <button class="btn" style="border-color:#fff; color:#fff; background:transparent; font-size:0.8rem; text-align:left; justify-content:flex-start;"
            id="c2-b2" onclick="triggerClosedSpeech('Congratulations! You successfully discovered the descriptive hyperlink labeled explicitly as Download Syllabus PDF! Sighted development standards met.')"
            onfocus="triggerAnnounce('Link, Download Syllabus PDF description. Interactive link.')">
            Link Element 2
          </button>
          <button class="btn" style="border-color:#fff; color:#fff; background:transparent; font-size:0.8rem; text-align:left; justify-content:flex-start;"
            id="c2-b3" onclick="triggerClosedSpeech('Inaccessible feedback. Navigation leads to general portal index.')"
            onfocus="triggerAnnounce('Link, read more. Interactive link.')">
            Link Element 3
          </button>
        </div>
      </div>

      <button class="btn" style="border-color:var(--accent); background:var(--accent); color:#000; margin-top:2rem;" onclick="toggleEyesClosed(false)">
        Exit Blind Simulation (Escape)
      </button>

    </div>
  </div>

  <script>
    // Inlined JavaScript Application State
    const PRESET_DATA = ${JSON.stringify(PRESETS)};
    let activePreset = 'standard';
    let currentText = PRESET_DATA.standard.text;
    let playing = false;
    let paused = false;
    let tokens = [];
    let voices = [];
    let selectedVoiceURI = '';
    let utterance = null;

    // Elements
    const txtCanvas = document.getElementById('text-canvas');
    const bPlay = document.getElementById('btn-play');
    const bPause = document.getElementById('btn-pause');
    const bStop = document.getElementById('btn-stop');
    const valRate = document.getElementById('val-rate');
    const valPitch = document.getElementById('val-pitch');
    const sliderRate = document.getElementById('rate-slider');
    const sliderPitch = document.getElementById('pitch-slider');
    const selVoice = document.getElementById('voice-select');
    const textLogs = document.getElementById('subtitles');
    const clSubtitle = document.getElementById('closed-subtitle');
    const wordBrd = document.getElementById('highlight-board');
    const wordStats = document.getElementById('word-stats');
    const visualEq = document.getElementById('visual-eq');
    const overlay = document.getElementById('eyes-closed-overlay');

    // Startup Init
    window.addEventListener('load', () => {
      txtCanvas.value = currentText;
      tokenizeAndRender();
      loadSystemVoices();
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadSystemVoices;
      }
      announceLog("Application initialized inside browser engine. High contrast profile activated.");
    });

    // Preset Switching
    function selectPreset(key) {
      activePreset = key;
      document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      
      const idMap = { standard: 'p-std', bad_alt: 'p-alt', data_table: 'p-tbl', custom: 'p-cst' };
      const activeEl = document.getElementById(idMap[key]);
      if (activeEl) activeEl.classList.add('active');

      currentText = PRESET_DATA[key].text;
      txtCanvas.value = currentText;
      stopSpeech();
      tokenizeAndRender();
      announceLog("Loaded preset template: " + PRESET_DATA[key].label);
    }

    // Tokenizer
    function tokenizeAndRender() {
      tokens = [];
      const regex = /(\\p{L}+|\\p{N}+|[^\\p{L}\\p{N}\\s]+|\\s+)/gu;
      const matches = Array.from(currentText.matchAll(regex));
      
      let id = 0;
      wordBrd.innerHTML = "";
      
      for (const match of matches) {
        const itemText = match[0];
        const start = match.index ?? 0;
        const end = start + itemText.length;
        const isWord = /[\\p{L}\\p{N}]/u.test(itemText);
        
        tokens.push({ id, text: itemText, isWord, charStart: start, charEnd: end });
        
        const span = document.createElement('span');
        span.id = "tok-" + id;
        span.className = "word";
        span.innerText = itemText;
        wordBrd.appendChild(span);
        
        id++;
      }
      wordStats.innerText = "Text contains " + tokens.filter(t => t.isWord).length + " readable words.";
    }

    function handleTextInput() {
      currentText = txtCanvas.value;
      tokenizeAndRender();
    }

    // Loads synthesized voice arrays
    function loadSystemVoices() {
      if (!window.speechSynthesis) return;
      voices = window.speechSynthesis.getVoices();
      selVoice.innerHTML = "";
      
      const en = voices.filter(v => v.lang.startsWith('en'));
      const ot = voices.filter(v => !v.lang.startsWith('en'));
      const list = [...en, ...ot];

      list.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.voiceURI;
        opt.innerText = v.name + " (" + v.lang + ")";
        if (v.default) opt.selected = true;
        selVoice.appendChild(opt);
      });

      if (list.length > 0 && !selectedVoiceURI) {
        selectedVoiceURI = list[0].voiceURI;
      }
    }

    function speechParamChanged() {
      selectedVoiceURI = selVoice.value;
      valRate.innerText = sliderRate.value;
      valPitch.innerText = sliderPitch.value;
      announceLog("TTS Speed adjusted to " + sliderRate.value + "x, pitch to " + sliderPitch.value);
    }

    // Logging & subtitle sync
    function announceLog(message) {
      textLogs.innerText = message;
      clSubtitle.innerText = message;
    }

    // Keyboard trigger announce helper
    function triggerAnnounce(phrase) {
      clSubtitle.innerText = phrase;
      // Synthesize if reader active
      if (overlay.classList.contains('active')) {
        speakSystem(phrase);
      }
    }

    function triggerClosedSpeech(phrase) {
      speakSystem(phrase, true);
    }

    function speakSystem(phrase, cancelOngoing = true) {
      if (!window.speechSynthesis) return;
      if (cancelOngoing) {
        window.speechSynthesis.cancel();
      }
      const uSystem = new SpeechSynthesisUtterance(phrase);
      const v = voices.find(x => x.voiceURI === selectedVoiceURI);
      if (v) uSystem.voice = v;
      uSystem.rate = parseFloat(sliderRate.value) * 1.1;
      uSystem.pitch = parseFloat(sliderPitch.value);
      window.speechSynthesis.speak(uSystem);
      clSubtitle.innerText = phrase;
    }

    // Main speech methods
    function startSpeech() {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      
      if (!currentText.trim()) {
        speakSystem("Canvas workspace is empty.");
        return;
      }

      utterance = new SpeechSynthesisUtterance(currentText);
      const activeVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
      if (activeVoice) utterance.voice = activeVoice;
      
      utterance.rate = parseFloat(sliderRate.value);
      utterance.pitch = parseFloat(sliderPitch.value);

      utterance.onstart = () => {
        playing = true;
        paused = false;
        visualEq.classList.add('speaking');
        announceLog("Simulating speech feedback...");
      };

      utterance.onend = () => {
        playing = false;
        paused = false;
        visualEq.classList.remove('speaking');
        announceLog("Completed reading draft.");
        clearWordHighlights();
      };

      utterance.onerror = () => {
        playing = false;
        paused = false;
        visualEq.classList.remove('speaking');
        clearWordHighlights();
      };

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const char = event.charIndex;
          const matchTok = tokens.find(t => t.isWord && char >= t.charStart && char < t.charEnd);
          if (matchTok) {
            clearWordHighlights();
            const elem = document.getElementById("tok-" + matchTok.id);
            if (elem) {
              elem.classList.add('highlighted-word');
              elem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        }
      };

      window.speechSynthesis.speak(utterance);
    }

    function pauseSpeech() {
      if (!window.speechSynthesis) return;
      if (playing) {
        if (paused) {
          window.speechSynthesis.resume();
          paused = false;
          visualEq.classList.add('speaking');
          announceLog("Resumed vocal synthesis.");
        } else {
          window.speechSynthesis.pause();
          paused = true;
          visualEq.classList.remove('speaking');
          announceLog("Voice synthesis suspended.");
        }
      }
    }

    function stopSpeech() {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      playing = false;
      paused = false;
      visualEq.classList.remove('speaking');
      clearWordHighlights();
      announceLog("Speech halted by terminal instruction.");
    }

    function clearWordHighlights() {
      document.querySelectorAll('.word').forEach(s => s.classList.remove('highlighted-word'));
    }

    // Toggle Blind simulator overlay
    function toggleEyesClosed(enable) {
      if (enable) {
        overlay.classList.add('active');
        speakSystem("Inclusion mode activated. Screen blacked out. Press Tab to find obstacles.");
      } else {
        overlay.classList.remove('active');
        speakSystem("Inclusion mode canceled. Standard sight recovered.");
      }
    }

    // Custom browser keyboard event bindings
    window.addEventListener('keydown', (e) => {
      if (document.activeElement.tagName === 'TEXTAREA') return;
      
      if (e.key === ' ') {
        e.preventDefault();
        playing ? pauseSpeech() : startSpeech();
      } else if (e.key === 'Escape') {
        stopSpeech();
        if (overlay.classList.contains('active')) {
          toggleEyesClosed(false);
        }
      } else if (e.key === '[') {
        sliderRate.value = Math.max(0.5, parseFloat(sliderRate.value) - 0.1);
        speechParamChanged();
      } else if (e.key === ']') {
        sliderRate.value = Math.min(3, parseFloat(sliderRate.value) + 0.1);
        speechParamChanged();
      }
    });

    // Custom hover and focus audio cues to help resume appeal
    document.querySelectorAll('button, select, input, textarea').forEach(el => {
      el.addEventListener('focus', () => {
        let textToRead = el.getAttribute('aria-label') || el.innerText || el.placeholder || el.id;
        textToRead += ", focused element.";
        if (overlay.classList.contains('active')) {
          triggerAnnounce(textToRead);
        }
      });
    });

  <\/script>
</body>
</html>`;

    // Download triggered using standard Client Blobs
    const blob = new Blob([htmlTemplate], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'SeeWithSound_Simulator.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    logAnnouncement("Independent HTML static app generated & downloaded successfully!");
  };

  return (
    <div className="min-h-screen bg-[#070708] text-[#FFFFFF] py-6 px-4 font-sans leading-relaxed selection:bg-[#CCFF00] selection:text-black">
      
      {/* Container Box */}
      <div className="max-w-7xl mx-auto bg-[#0E0E10] border border-[#1F1F23] p-5 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
        
        {/* Header Block */}
        <header className="border-b border-[#1F1F24] pb-5 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-[10px] font-mono font-bold tracking-widest uppercase px-2.5 py-1 bg-neutral-900 border border-neutral-800 text-[#CCFF00] mb-3">
              <span className="w-1.5 h-1.5 bg-[#CCFF00] rounded-full animate-ping"></span>
              ASSISTIVE ENGINE ONLINE
            </div>
            <h1 className="font-display font-black text-3xl sm:text-4xl tracking-tight">
              SEE<span className="text-[#CCFF00]">WITH</span>SOUND
            </h1>
            <p className="font-display text-xs sm:text-sm font-medium tracking-wide text-neutral-400 mt-1 uppercase">
              Experience the web like a blind user &bull; Screen Reader Simulator
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button 
              id="export-app-btn"
              onClick={handleExportHTML}
              onFocus={() => handleElementFocus("Export standalone html file", "button", "Click to download the code as an independent, fully-functional single file.")}
              className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-[#CCFF00] hover:text-[#CCFF00] text-sm font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all duration-150"
              aria-label="Export static single-file version of the website"
            >
              <Download size={15} />
              Export Standalone HTML
            </button>
          </div>
        </header>

        {/* Informative Header Reminder */}
        <div className="bg-[#141417] border border-[#1F1F23] border-l-4 border-[#CCFF00] text-neutral-300 p-4 mb-6 text-xs sm:text-sm flex gap-3 items-start">
          <Info className="flex-shrink-0 text-[#CCFF00] mt-0.5" size={18} />
          <div>
            <span className="font-bold text-white">Keyboard Navigation HUD:</span> Explore the console solely via commands! 
            Use <kbd className="bg-neutral-950 border border-neutral-800 text-white px-1.5 py-0.5 rounded-sm font-mono text-xs">Tab</kbd> to change focused targets, 
            <kbd className="bg-neutral-950 border border-neutral-800 text-white px-1.5 py-0.5 rounded-sm font-mono text-xs">Space</kbd> to play/pause reading, and 
            <kbd className="bg-neutral-950 border border-neutral-800 text-white px-1.5 py-0.5 rounded-sm font-mono text-xs">Escape</kbd> to interrupt. Adjust speech rates with 
            <kbd className="bg-neutral-950 border border-neutral-800 text-white px-1.5 py-0.5 rounded-sm font-mono text-xs">[</kbd> and 
            <kbd className="bg-neutral-950 border border-neutral-800 text-white px-1.5 py-0.5 rounded-sm font-mono text-xs">]</kbd>.
          </div>
        </div>

        {/* Live Audio Telemetry Indicator */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 px-1">
            <label className="block text-[10px] font-mono font-bold uppercase tracking-widest text-[#CCFF00]">
              Real-Time Audio Telemetry Subtitle HUD
            </label>
            <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest">OUTPUT: SYNTHETIC_v2.4</span>
          </div>
          <div 
            id="accessibility-hud"
            className="p-4 bg-[#070709] border border-neutral-800 border-l-4 border-[#CCFF00] text-[#CCFF00] font-mono text-sm shadow-inner min-h-[64px] flex items-center justify-between"
            role="status" 
            aria-live="assertive"
          >
            <span className="tracking-tight select-all">&gt; {accessibilitySubtitle}</span>
            {isPlaying && (
              <span className="text-[#CCFF00] text-xs font-bold animate-pulse uppercase flex items-center gap-1.5 shrink-0 bg-[#CCFF00]/10 border border-[#CCFF00]/20 px-2.5 py-1">
                <span className="w-2 h-2 rounded-full bg-[#CCFF00]"></span> Live Audio
              </span>
            )}
          </div>
        </div>

        {/* High-Impact Stat Strip Banner */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1F1F24] border border-[#1F1F24] mb-8" aria-label="Visual Impairment Statistics">
          <div className="p-6 bg-[#0E0E10]">
            <span className="block font-display font-black text-3xl sm:text-4xl text-[#CCFF00] tracking-tight mb-2">285,000,000+</span>
            <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
              individuals globally live with visually impairments. Approximately <strong className="text-white font-medium">39 million</strong> are completely blind and rely on sequential audio feedback to parse pages.
            </p>
          </div>
          <div className="p-6 bg-[#0E0E10]">
            <span className="block font-display font-black text-3xl sm:text-4xl text-[#CCFF00] tracking-tight mb-2">98.1% WCAG FAIL</span>
            <p className="text-neutral-400 text-xs sm:text-sm leading-relaxed">
              of the world's top 1,000,000 index pages carry critical compliance issues, isolating screen readers and causing severe document outline navigation failures.
            </p>
          </div>
        </section>

        {/* Main Workstation Panel (Bento Grid) */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-b border-[#1F1F24] pb-6">
          
          {/* Input Panel (Col span 7) */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between border-b border-[#1F1F24] pb-2 mb-4">
              <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-[#CCFF00]" />
                The Input Canvas
              </h2>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase border border-neutral-800 bg-[#070709] text-neutral-400">
                ACTIVE_BUFFER
              </span>
            </div>

            {/* Quick Demo Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(PRESETS).map(([key, item]) => (
                <button
                  key={key}
                  id={`preset-${key}-btn`}
                  onClick={() => selectPreset(key as keyof typeof PRESETS)}
                  onFocus={() => handleElementFocus(`${item.label} Preset`, "button", item.description)}
                  className={`px-3 py-1.5 border font-mono text-xs font-bold tracking-tight rounded-xs cursor-pointer transition-all ${
                    activePreset === key 
                      ? 'bg-[#CCFF00] text-black border-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.2)]' 
                      : 'bg-[#141417] text-neutral-400 border-[#1F1F23] hover:text-white hover:bg-neutral-800'
                  }`}
                  aria-label={`Load preset text scenario: ${item.label}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Presets Descriptions context */}
            <p className="text-xs text-neutral-400 font-mono mb-3 min-h-[32px] flex items-center gap-1.5 bg-[#070709] p-2 border border-neutral-850">
              <span className="text-[#CCFF00] font-bold">&gt;&gt;</span>
              {PRESETS[activePreset].description}
            </p>

            <textarea
              id="raw-text-area"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                handleStopSpeaking();
              }}
              onFocus={() => handleElementFocus("Paragraph Input Area", "text area editing cell", "Enter or paste standard digital wording here to simulate audio feedback.")}
              placeholder="Type or paste descriptive copy lines here..."
              className="w-full h-80 sm:h-[350px] border border-neutral-850 bg-[#070709] p-4 font-mono text-sm leading-relaxed text-white resize-none focus:outline-none focus:border-[#CCFF00]/50 transition-all duration-100"
              aria-label="Screen reader text content input. Type text here."
            />
            <div className="text-right text-[10px] font-mono text-neutral-500 mt-2 flex justify-between px-1">
              <span>STATUS: READY_TO_SPEAK</span>
              <span>CHARACTERS: {text.length} &bull; WORDS: {tokens.filter(t => t.isWord).length}</span>
            </div>
          </div>

          {/* Engine Config & Actions Panel (Col span 5) */}
          <div className="lg:col-span-5 flex flex-col justify-start">
            <div className="flex items-center justify-between border-b border-[#1F1F24] pb-2 mb-4">
              <h2 className="font-display font-bold text-sm sm:text-base uppercase tracking-wider flex items-center gap-2">
                <Sliders size={16} className="text-[#CCFF00]" />
                Synth Parameters
              </h2>
              
              {/* Animated waveform visual bars */}
              <div className="flex items-end gap-[3px] h-6 px-1" aria-hidden="true" title="Audio voice activity monitor">
                {[1, 2, 3, 4, 5, 4, 2, 1].map((col, idx) => (
                  <span 
                    key={idx}
                    style={{ animationDelay: `${idx * 0.12}s`, transformOrigin: 'bottom' }} 
                    className={`w-1 bg-[#CCFF00] rounded-full ${
                      isPlaying && !isPaused ? 'voice-bar' : 'h-1 bg-neutral-700'
                    }`} 
                  />
                ))}
              </div>
            </div>

            {/* Voice Dropdown Selection */}
            <div className="mb-4">
              <label htmlFor="voice-dropdown" className="block text-[10px] font-mono font-bold uppercase tracking-widest mb-1.5 text-neutral-450">
                Synthetic speech voice profile selection
              </label>
              <select
                id="voice-dropdown"
                value={selectedVoiceURI}
                onChange={(e) => {
                  setSelectedVoiceURI(e.target.value);
                  logAnnouncement("Changed simulator voice outline selection.");
                }}
                onFocus={() => handleElementFocus("Voice select dropdown", "dropdown", "Select a custom speech voice profile installed in your local operarting system.")}
                className="w-full text-xs font-mono border border-neutral-800 p-2.5 bg-[#070709] text-white cursor-pointer focus:outline-none focus:border-[#CCFF00]"
                aria-label="Interactive TTS Voice selector"
              >
                {voices.length === 0 ? (
                  <option>Searching local browser voices...</option>
                ) : (
                  voices.map((v) => (
                    <option key={v.voiceURI} class="bg-[#0E0E10] text-white" value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Speed Rate Range slider */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="rate-input-slider" className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-450">
                  Aural Rate Speed
                </label>
                <span className="font-mono text-xs font-bold bg-[#141417] text-[#CCFF00] border border-neutral-800 px-1.5 py-0.5">
                  {rate}x
                </span>
              </div>
              <input
                id="rate-input-slider"
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={rate}
                onChange={(e) => {
                  setRate(parseFloat(e.target.value));
                  logAnnouncement(`Speed rate threshold declared to ${e.target.value}x`);
                }}
                onFocus={() => handleElementFocus("Speech speed slider", "slider scale", "Adjust rates of synthetic spoken utterances. Real-time rates ranges from 0.5 to 3.0 speed.")}
                className="w-full h-1 cursor-pointer bg-neutral-800 rounded-lg appearance-none accent-[#CCFF00]"
                aria-label="Interactive spoken rate control slider"
              />
            </div>

            {/* Pitch range slider */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="pitch-input-slider" className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-450">
                  Voice Pitch Level
                </label>
                <span className="font-mono text-xs font-bold bg-[#141417] text-[#CCFF00] border border-neutral-800 px-1.5 py-0.5">
                  {pitch}
                </span>
              </div>
              <input
                id="pitch-input-slider"
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={pitch}
                onChange={(e) => {
                  setPitch(parseFloat(e.target.value));
                  logAnnouncement(`Voice pitch index targeted to ${e.target.value}`);
                }}
                onFocus={() => handleElementFocus("Speech pitch slider", "slider scale", "Adjust acoustic pitch thresholds ranging from 0.5 base to 2.0 soprano heights.")}
                className="w-full h-1 cursor-pointer bg-neutral-800 rounded-lg appearance-none accent-[#CCFF00]"
                aria-label="Interactive spoken pitch control slider"
              />
            </div>

            {/* Interactive Player Controls */}
            <div className="grid grid-cols-2 gap-3">
              <button
                id="start-speak-btn"
                onClick={handleStartSpeaking}
                onFocus={() => handleElementFocus("Start reading button", "primary action", "Click to launch standard voice rendering sequence on active canvas.")}
                className="col-span-2 py-3 bg-[#CCFF00] hover:bg-[#e2ff42] border border-[#CCFF00] text-black font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] shadow-[0_0_15px_rgba(204,255,0,0.15)]"
                aria-label="Start vocalizing standard canvas draft"
              >
                <Play size={16} fill="currentColor" />
                Start Reading
              </button>

              <button
                id="pause-speak-btn"
                onClick={handlePauseSpeaking}
                onFocus={() => handleElementFocus("Track Pause and Resume switcher", "action control", "Click to toggle suspension or play state of current speaking track.")}
                className="py-2.5 bg-[#0E0E10] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-all"
                aria-disabled={!isPlaying}
                aria-label="Pause or Resume current vocal draft"
              >
                <Pause size={14} />
                Pause
              </button>

              <button
                id="stop-speak-btn"
                onClick={handleStopSpeaking}
                onFocus={() => handleElementFocus("Stop synthesis button", "action control", "Interrupts active speaking queue, and resets word trackers back to starting positions.")}
                className="py-2.5 bg-[#0E0E10] hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 font-mono font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer transition-all"
                aria-label="Stop vocal speech feedback"
              >
                <Square size={14} fill="currentColor" />
                Stop
              </button>
            </div>

            {/* Immersive Blind Mode Toggler */}
            <div className="mt-8 p-4 border border-[#CCFF00]/20 bg-[#CCFF00]/5 rounded-sm relative overflow-hidden">
              <div className="flex items-center gap-2 mb-2 font-display font-bold text-[#CCFF00] text-xs uppercase tracking-wider">
                <Accessibility size={18} />
                <span>Simulate Complete Blindness</span>
              </div>
              <p className="text-[11px] text-neutral-400 mb-4 leading-normal font-mono">
                Blades out the entire screen display viewport so that you can challenge your motor and auditory memory boundaries by navigating solely via assistive hotkeys.
              </p>
              <button
                id="eyes-blackout-toggle-btn"
                onClick={toggleEyesClosedMode}
                className="w-full py-2.5 bg-neutral-900 border border-neutral-800 hover:border-[#CCFF00] hover:text-[#CCFF00] text-[#CCFF00] font-mono font-bold text-xs uppercase tracking-widest cursor-pointer transition-all flex items-center justify-center gap-2"
                aria-label="Toggle Eyes-Closed Simulator blind mode overlay"
              >
                <EyeOff size={14} />
                Activate Eyes-Closed Sim (Esc)
              </button>
            </div>

          </div>

        </main>

        {/* Live Highlighter Segment Row */}
        <div className="mt-8 p-5 border border-[#1F1F24] bg-[#0E0E10] rounded-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1F1F24] pb-2 mb-4 gap-2">
            <h3 className="font-mono text-xs font-bold tracking-widest uppercase flex items-center gap-2 text-[#CCFF00]">
              <Accessibility size={14} />
              Interactive Audio Word Streamer
            </h3>
            <span className="text-[10px] font-mono bg-neutral-900 border border-neutral-800 text-neutral-450 px-2 py-0.5">
              {isPlaying ? "Audible Synthesizer Active" : "No active speaker stream"}
            </span>
          </div>

          <div 
            id="highlight-board-viewport"
            className="p-4 bg-[#070709] border border-neutral-850 max-h-48 overflow-y-auto leading-loose text-base font-medium rounded-xs"
            style={{ scrollBehavior: 'smooth' }}
          >
            {tokens.length === 0 ? (
              <span className="text-neutral-500 italic font-mono text-xs">&gt; Write paragraphs in the input block to observe highlighting telemetry.</span>
            ) : (
              tokens.map((token) => (
                <span
                  key={token.id}
                  id={`feed-token-${token.id}`}
                  className={`inline-block mx-0.5 px-1 font-mono transition-all duration-100 uppercase text-xs rounded-xs ${
                    activeTokenId === token.id 
                      ? 'bg-[#CCFF00] text-black border border-[#CCFF00] font-bold shadow-[0_0_8px_rgba(204,255,0,0.4)]' 
                      : 'text-neutral-400'
                  }`}
                >
                  {token.text}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Informative Assistive Specs blocks */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#1F1F24] border border-[#1F1F24] mt-8" aria-label="Educational Resources">
          <div className="p-6 bg-[#0E0E10] flex gap-4">
            <Info size={32} className="text-[#CCFF00] flex-shrink-0" />
            <div>
              <h3 className="font-display font-medium text-sm text-white uppercase tracking-wider mb-2">How Screen Readers Operate</h3>
              <p className="text-neutral-450 text-xs leading-relaxed">
                Screen readers synthesize speech by scanning document structures sequentially. Blind developers navigate via key commands to leap across page targets:
              </p>
              <ul className="list-disc pl-5 mt-3 text-[11px] text-[#CCFF00] font-mono space-y-1.5">
                <li><strong>H Key:</strong> Leap directly to next Heading layouts.</li>
                <li><strong>L Key:</strong> Travel straight to next logical Link.</li>
                <li><strong>T Key:</strong> Land inside active Table grids.</li>
                <li><strong>G Key:</strong> Announces alternative text for Graphic assets.</li>
              </ul>
            </div>
          </div>

          <div className="p-6 bg-[#0E0E10] flex gap-4">
            <Accessibility size={32} className="text-[#CCFF00] flex-shrink-0" />
            <div>
              <h3 className="font-display font-medium text-sm text-white uppercase tracking-wider mb-2">Catering to Inclusive Design</h3>
              <p className="text-neutral-450 text-xs leading-relaxed">
                Creating modern digital solutions requires complete HTML integrity:
              </p>
              <ul className="list-decimal pl-5 mt-3 text-[11px] text-neutral-400 font-mono space-y-1.5">
                <li>Use <code className="bg-neutral-900 border border-neutral-800 text-white px-1.5 rounded-sm">&lt;button&gt;</code> instead of mapping clicking triggers to empty <code className="text-white">&lt;div&gt;</code>s.</li>
                <li>No vague references like "click here". Provide targets: "Download Assessment Docs".</li>
                <li>Always apply valid alt description overrides so screen readers can paint graphics to memory.</li>
              </ul>
            </div>
          </div>
        </section>

      </div>

      {/* Eyes-Closed Simulator Immersive Blackout Panel Overlay */}
      {eyesClosedMode && (
        <div 
          className="fixed inset-0 bg-[#070708] text-white z-[9999] flex flex-col items-center justify-center p-6 text-center overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Immersive Screen Reader Challenge Overlay"
        >
          <div className="max-w-2xl w-full bg-[#0E0E10] border border-[#1F1F24] p-6 sm:p-12 shadow-[0_0_50px_rgba(0,0,0,0.9)] relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#CCFF00]"></div>
            
            <div className="inline-flex items-center gap-1.5 border border-red-500/30 text-red-500 text-[9px] font-mono uppercase tracking-widest px-3 py-1 bg-red-950/20 mb-6 rounded-xs">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              Imbalance & Visual Obstacles Active
            </div>
            
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-wider mb-3">
              EMPATHY CONSOLE INITIATED
            </h2>
            <p className="text-neutral-400 text-xs sm:text-sm mb-8 leading-relaxed max-w-lg mx-auto font-mono">
              The GUI viewport is completely dark. Practice sequential browsing. Use audio telemetry subtitles and keyboard actions to navigate these virtual rooms!
            </p>

            <div className="mb-6 flex gap-2 justify-center flex-wrap">
              <button 
                id="c-intro-tab"
                onClick={() => {
                  setActiveChallenge('intro');
                  speakImmediate("Obstacle Intro panel dashboard active.", true);
                }}
                className={`px-3 py-1.5 font-mono text-xs border cursor-pointer uppercase transition-all ${activeChallenge === 'intro' ? 'bg-[#CCFF00] text-black border-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.2)]' : 'bg-[#141417] text-neutral-400 border-neutral-800'}`}
                aria-label="Hop to Obstacle Room Intro"
              >
                1. Intro Hub
              </button>
              <button 
                id="c-alt-tab"
                onClick={() => {
                  setActiveChallenge('mystery-alt');
                  speakImmediate("Obstacle Image Alt audit workspace loaded.", true);
                }}
                className={`px-3 py-1.5 font-mono text-xs border cursor-pointer uppercase transition-all ${activeChallenge === 'mystery-alt' ? 'bg-[#CCFF00] text-black border-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.2)]' : 'bg-[#141417] text-neutral-400 border-neutral-800'}`}
                aria-label="Hop to Obstacle Mystery Alts"
              >
                2. Image Alt Room
              </button>
              <button 
                id="c-links-tab"
                onClick={() => {
                  setActiveChallenge('link-safari');
                  speakImmediate("Obstacle Link label safari target active.", true);
                }}
                className={`px-3 py-1.5 font-mono text-xs border cursor-pointer uppercase transition-all ${activeChallenge === 'link-safari' ? 'bg-[#CCFF00] text-black border-[#CCFF00] shadow-[0_0_10px_rgba(204,255,0,0.2)]' : 'bg-[#141417] text-neutral-400 border-neutral-800'}`}
                aria-label="Hop to Obstacle Category Links"
              >
                3. Link Hunt Room
              </button>
            </div>

            {/* Simulated Voice Output for Deaf Accessibility */}
            <div className="p-4 bg-[#070709] border border-neutral-800 text-left font-mono text-xs max-w-xl mx-auto mb-6">
              <span className="text-[#CCFF00] font-bold uppercase text-[9px] tracking-widest block mb-1">
                Simulated Screen Reader Telemetry:
              </span>
              <p className="text-[#CCFF00] min-h-[48px] flex items-center leading-relaxed">
                &gt; {accessibilitySubtitle}
              </p>
            </div>

            {/* Challenge Panel Rendering */}
            <div className="border border-neutral-850 bg-[#070709] p-5 max-w-xl mx-auto mb-8 rounded-xs text-left font-mono text-xs">
              {activeChallenge === 'intro' && (
                <div>
                  <h4 className="text-[10px] text-[#CCFF00] uppercase font-bold tracking-widest mb-2">Introduction Module</h4>
                  <p className="text-neutral-400 leading-relaxed mb-4">
                    In this mode, elements will speak out loud when you click or focus into them! 
                    Challenge: Navigate to the other challenge tabs by pressing <kbd className="bg-neutral-900 border border-neutral-800 text-white px-1 py-0.5 font-mono text-[9px]">Tab</kbd> or clicking them, then test your accessible design abilities.
                  </p>
                  <p className="text-neutral-500 italic text-[10px]">
                    Press Shift+Tab to back up, and hit Tab to explore active challenge modules.
                  </p>
                </div>
              )}

              {activeChallenge === 'mystery-alt' && (
                <div>
                  <h4 className="text-[10px] text-[#CCFF00] uppercase font-bold tracking-widest mb-2">Obstacle 1: Image Alternative tag test</h4>
                  <p className="text-neutral-400 leading-relaxed mb-4">
                    Examine image code buttons A and B. Listen carefully to which code snippet explains the picture perfectly instead of outputting raw text.
                  </p>
                  
                  <div className="flex gap-2 flex-col sm:flex-row mt-4">
                    <button
                      onClick={() => {
                        speakImmediate("Focused Alternate Option A. Rendered source tags outline: Image tag with empty alt attribute. File reference read: IMG, underscore, 99283, underscore, golden, final, dot, png. Simulation: User is left clueless.", true);
                        setUserAnswerChallenge1('A');
                      }}
                      onFocus={() => handleElementFocus("Alternate image description Code option A", "button", "Launches vocal mockup of image without alt parameters.")}
                      className="px-4 py-2 font-mono text-xs font-bold border border-neutral-800 bg-[#0E0E10] text-[#CCFF00] hover:border-[#CCFF00] cursor-pointer flex-1 transition-all"
                    >
                      Audit Option A
                    </button>
                    <button
                      onClick={() => {
                        speakImmediate("Focused Alternate Option B. Rendered source tags outline: Image tag with correct Alt description. Voice reading: A playful golden retriever puppy sitting in green grass wearing a bright red birthday party hat. Simulation: User understands perfectly.", true);
                        setUserAnswerChallenge1('B');
                      }}
                      onFocus={() => handleElementFocus("Alternate image description Code option B", "button", "Launches accessible description speech markup.")}
                      className="px-4 py-2 font-mono text-xs font-bold border border-neutral-800 bg-[#0E0E10] text-[#CCFF00] hover:border-[#CCFF00] cursor-pointer flex-1 transition-all"
                    >
                      Audit Option B
                    </button>
                  </div>

                  {userAnswerChallenge1 && (
                    <div className="mt-4 p-3 bg-neutral-900 border-l border-[#CCFF00] text-[11px] text-neutral-300">
                      {userAnswerChallenge1 === 'B' ? (
                        <span className="flex items-center gap-2 text-green-400 font-bold uppercase tracking-wider">
                          <CheckCircle size={12} /> Correct choice! Proper alt descriptions build equal opportunities.
                        </span>
                      ) : (
                        <span className="text-red-400 font-bold uppercase tracking-wider">
                          Option A left the user clueless. Scribes need valid descriptive alternate parameters!
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeChallenge === 'link-safari' && (
                <div>
                  <h4 className="text-[10px] text-[#CCFF00] uppercase font-bold tracking-widest mb-2">Obstacle 2: Link Label Safari</h4>
                  <p className="text-neutral-400 leading-relaxed mb-4">
                    A blind user navigates sequential page interactive anchors. Try focusing the buttons below and find the explicit target anchor for 'Download Syllabus PDF'.
                  </p>

                  <div className="flex flex-col gap-2 mt-4">
                    <button
                      onClick={() => speakImmediate("You focused an anchor. Voice reports: Link, Click here. Destination unknown to reader.", true)}
                      onFocus={() => handleElementFocus("Link element sample 1", "anchor link", "Vocal reading: Click here.")}
                      className="px-3 py-2 font-mono text-left border border-neutral-850 bg-transparent text-[#CCFF00] hover:border-[#CCFF00] cursor-pointer transition-all"
                    >
                      Course Portal Anchor 1
                    </button>
                    <button
                      onClick={() => speakImmediate("You focused an anchor. Voice reports: Link, Read more. Destination unknown.", true)}
                      onFocus={() => handleElementFocus("Link element sample 2", "anchor link", "Vocal reading: Read more.")}
                      className="px-3 py-2 font-mono text-left border border-neutral-850 bg-transparent text-[#CCFF00] hover:border-[#CCFF00] cursor-pointer transition-all"
                    >
                      Course Portal Anchor 2
                    </button>
                    <button
                      onClick={() => {
                        speakImmediate("Success! Voice reports: Link, Download Course Outline Syllabus PDF. Sighted standards met perfectly! User knows where navigation leads.", true);
                        setChallenge2Completed(true);
                      }}
                      onFocus={() => handleElementFocus("Link element sample 3", "anchor link", "Vocal reading: Download Course Outline Syllabus PDF.")}
                      className="px-3 py-2 font-mono text-left border border-neutral-750 bg-transparent text-[#CCFF00] hover:border-[#CCFF00] cursor-pointer transition-all"
                    >
                      Course Portal Anchor 3
                    </button>
                  </div>

                  {challenge2Completed && (
                    <div className="mt-4 p-3 bg-neutral-900 border-l border-green-500 text-[11px] text-green-400 flex items-center gap-2 font-bold uppercase tracking-wider">
                      <CheckCircle size={12} /> Outstanding! Sighted users saved valuable seconds of sequential browsing.
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={toggleEyesClosedMode}
              className="py-3 px-8 bg-[#CCFF00] hover:bg-[#e2ff42] text-[#070708] font-mono font-black text-xs uppercase tracking-wider cursor-pointer border-none shadow-[0_0_15px_rgba(204,255,0,0.2)]"
              aria-label="Exit simulated blackout mode and return to main interface page"
            >
              Exit Simulation Toggle (Esc)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
