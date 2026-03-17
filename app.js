    const BASE_IMAGE_SIZE = 1024;
    const DEFAULT_HOLE_Y_OFFSET = -10;

    const LEVELS = {
      1: {
        image: "level1.png",
        // Level 1 anchor points were sampled lower than the visible hole rim.
        holeYOffset: -40,
        holeSizeScale: 1.12,
        holePoints: [
          [275, 243], [511, 245], [747, 245],
          [269, 407], [513, 403], [757, 408],
          [255, 592], [513, 584], [771, 583]
        ]
      },
      2: {
        image: "level2.png",
        contentScaleY: 1.26,
        holePoints: [
          [217, 255], [412, 256], [610, 255], [806, 255],
          [208, 371], [409, 371], [616, 370], [818, 370],
          [193, 492], [404, 493], [620, 492], [832, 492]
        ]
      },
      3: {
        image: "level3.png",
        holeYOffset: -12,
        holePoints: [
          [230, 197], [417, 197], [607, 197], [795, 197],
          [217, 301], [414, 301], [612, 301], [809, 301],
          [204, 405], [408, 406], [616, 406], [821, 406],
          [191, 523], [403, 524], [622, 524], [834, 524]
        ]
      },
      4: {
        image: "level4.png",
        holeYOffset: -12,
        holePoints: [
          [177, 210], [340, 210], [511, 210], [680, 210], [848, 210],
          [165, 308], [336, 308], [511, 308], [686, 308], [860, 308],
          [154, 411], [331, 411], [512, 411], [692, 412], [871, 412],
          [143, 522], [326, 522], [512, 522], [698, 523], [884, 523]
        ]
      },
      5: {
        image: "level5.png",
        holeYOffset: -10,
        holePoints: [
          [181, 183], [342, 183], [510, 183], [676, 183], [836, 183],
          [173, 274], [338, 274], [510, 274], [680, 274], [849, 274],
          [164, 371], [336, 371], [510, 371], [686, 371], [861, 371],
          [153, 476], [331, 476], [511, 476], [691, 476], [872, 477],
          [142, 588], [327, 588], [511, 588], [698, 588], [885, 588]
        ]
      }
    };

    const SCORE_PER_HIT = 5;
    const PASS_SCORE = 50;
    const MAX_MISS = 5;
    const FINAL_LEVEL = 4;

    const levelText = document.getElementById("levelText");
    const scoreText = document.getElementById("scoreText");
    const missText = document.getElementById("missText");
    const boardWrap = document.getElementById("boardWrap");
    const playArea = document.getElementById("playArea");
    const holesZone = document.getElementById("holesZone");
    const fxLayer = document.getElementById("fxLayer");
    const machineImage = document.getElementById("machineImage");
    const statusEl = document.getElementById("status");
    const overlay = document.getElementById("overlay");
    const overlayHero = document.getElementById("overlayHero");
    const overlayImage = document.getElementById("overlayImage");
    const restartBtn = document.getElementById("restartBtn");

    let level = 1;
    let score = 0;
    let totalScore = 0;
    let miss = 0;
    let running = false;
    let turnTimer = null;
    let statusTimer = null;
    let audioCtx = null;
    let bgmTimer = null;
    let bgmBarIndex = 0;

    let moles = [];
    const riseTimerIds = new Set();
    const SEGMENT_NAMES = ["a", "b", "c", "d", "e", "f", "g"];
    const SEGMENT_MAP = {
      "0": ["a", "b", "c", "d", "e", "f"],
      "1": ["b", "c"],
      "2": ["a", "b", "d", "e", "g"],
      "3": ["a", "b", "c", "d", "g"],
      "4": ["b", "c", "f", "g"],
      "5": ["a", "c", "d", "f", "g"],
      "6": ["a", "c", "d", "e", "f", "g"],
      "7": ["a", "b", "c"],
      "8": ["a", "b", "c", "d", "e", "f", "g"],
      "9": ["a", "b", "c", "d", "f", "g"]
    };
    const BGM_BAR_LENGTH_MS = 1920;
    const BGM_MELODY_BARS = [
      [659.25, 783.99, 880.0, 783.99, 659.25, 783.99, 880.0, 1046.5],
      [1046.5, 880.0, 783.99, 659.25, 783.99, 880.0, 783.99, 659.25]
    ];
    const BGM_BASS_BARS = [
      [261.63, 261.63, 329.63, 392.0],
      [220.0, 220.0, 261.63, 392.0]
    ];

    function getLevelTurnConfig(currentLevel, levelScore) {
      if (currentLevel === 1) {
        if (levelScore >= 30) return { intervalMs: 1960, upDurationMs: 1760, upCount: 2, staggerMs: 0 };
        return { intervalMs: 2440, upDurationMs: 1940, upCount: 1, staggerMs: 0 };
      }

      if (currentLevel === 2) {
        if (levelScore >= 30) return { intervalMs: 1780, upDurationMs: 1560, upCount: 2, staggerMs: 0 };
        return { intervalMs: 2240, upDurationMs: 1840, upCount: 1, staggerMs: 0 };
      }

      if (currentLevel === 3) {
        if (levelScore >= 40) return { intervalMs: 1520, upDurationMs: 1420, upCount: 3, staggerMs: 0 };
        if (levelScore >= 20) return { intervalMs: 1860, upDurationMs: 1620, upCount: 2, staggerMs: 0 };
        return { intervalMs: 2280, upDurationMs: 1860, upCount: 1, staggerMs: 0 };
      }

      return { intervalMs: 1180, upDurationMs: 1740, upCount: 2, staggerMs: 0 };
    }

    function showStatus(text, duration = 1100) {
      clearTimeout(statusTimer);
      statusEl.textContent = text;
      statusEl.classList.add("show");
      statusTimer = setTimeout(() => statusEl.classList.remove("show"), duration);
    }

    function renderSegmentDisplay(target, value) {
      const text = String(value);
      target.replaceChildren();

      for (const char of text) {
        const digit = document.createElement("span");
        const activeSegments = new Set(SEGMENT_MAP[char] ?? []);

        digit.className = "segment-digit";

        for (const segmentName of SEGMENT_NAMES) {
          const segment = document.createElement("span");
          segment.className = `seg ${segmentName}${activeSegments.has(segmentName) ? " on" : ""}`;
          digit.appendChild(segment);
        }

        target.appendChild(digit);
      }
    }

    function updateHud() {
      const heartsLeft = Math.max(0, MAX_MISS - miss);
      const levelValue = String(level).padStart(2, "0");
      const scoreValue = String(score).padStart(3, "0");

      levelText.setAttribute("aria-label", `레벨 ${level}`);
      scoreText.setAttribute("aria-label", `점수 ${score}점`);
      renderSegmentDisplay(levelText, levelValue);
      renderSegmentDisplay(scoreText, scoreValue);
      missText.setAttribute("aria-label", `남은 하트 ${heartsLeft}개`);
      missText.replaceChildren();

      for (let i = 0; i < MAX_MISS; i += 1) {
        const heart = document.createElement("span");
        heart.className = `life-heart ${i < heartsLeft ? "on" : "off"}`;
        heart.textContent = "♥";
        missText.appendChild(heart);
      }
    }

    function clearTimers() {
      clearTimeout(turnTimer);
      turnTimer = null;
      for (const timerId of riseTimerIds) {
        clearTimeout(timerId);
      }
      riseTimerIds.clear();

      for (const mole of moles) {
        if (mole.timeoutId) {
          clearTimeout(mole.timeoutId);
          mole.timeoutId = null;
        }
      }
    }

    function getAudioContext() {
      if (audioCtx) return audioCtx;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      audioCtx = new AudioContextClass();
      return audioCtx;
    }

    function unlockAudio() {
      const ctx = getAudioContext();
      if (!ctx || ctx.state !== "suspended") return;
      ctx.resume().catch(() => {});
    }

    function playTonePattern(pattern) {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") {
        ctx.resume().then(() => playTonePattern(pattern)).catch(() => {});
        return;
      }
      if (ctx.state !== "running") return;

      let start = ctx.currentTime + 0.01;

      for (const tone of pattern) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = tone.type ?? "triangle";
        osc.frequency.setValueAtTime(tone.freq, start);
        osc.frequency.exponentialRampToValueAtTime(tone.endFreq ?? tone.freq, start + tone.duration);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(tone.gain ?? 0.05, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + tone.duration + 0.02);
        start += tone.step ?? Math.max(0.08, tone.duration * 0.82);
      }
    }

    function playHitSound() {
      playTonePattern([
        { freq: 740, endFreq: 980, duration: 0.12, gain: 0.045, type: "triangle", step: 0.1 },
        { freq: 980, endFreq: 1320, duration: 0.18, gain: 0.04, type: "triangle" }
      ]);
    }

    function playMissSound() {
      playTonePattern([
        { freq: 420, endFreq: 280, duration: 0.16, gain: 0.055, type: "square", step: 0.12 },
        { freq: 280, endFreq: 210, duration: 0.22, gain: 0.045, type: "sawtooth" }
      ]);
    }

    function buildToneSequence(notes, options) {
      return notes.map((freq) => ({
        freq,
        endFreq: freq,
        duration: options.duration,
        gain: options.gain,
        type: options.type,
        step: options.step
      }));
    }

    function playBgmBar() {
      const barIndex = bgmBarIndex % BGM_MELODY_BARS.length;
      playTonePattern(buildToneSequence(BGM_MELODY_BARS[barIndex], {
        duration: 0.16,
        gain: 0.016,
        type: "triangle",
        step: 0.24
      }));
      playTonePattern(buildToneSequence(BGM_BASS_BARS[barIndex], {
        duration: 0.34,
        gain: 0.011,
        type: "sine",
        step: 0.48
      }));
      bgmBarIndex += 1;
    }

    function startBgm() {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === "suspended") {
        ctx.resume().then(startBgm).catch(() => {});
        return;
      }
      if (bgmTimer) return;

      bgmBarIndex = 0;
      playBgmBar();
      bgmTimer = setInterval(playBgmBar, BGM_BAR_LENGTH_MS);
    }

    function stopBgm() {
      if (bgmTimer) {
        clearInterval(bgmTimer);
        bgmTimer = null;
      }
      bgmBarIndex = 0;
    }

    function setOverlayHeroImage(src, altText) {
      overlayImage.onload = null;
      overlayImage.onerror = null;
      overlayImage.hidden = true;
      overlayHero.classList.remove("show", "empty");

      if (!src) {
        overlayImage.removeAttribute("src");
        overlayImage.alt = "";
        overlayHero.setAttribute("aria-hidden", "true");
        return;
      }

      overlayImage.alt = altText;
      overlayHero.classList.add("show");
      overlayHero.setAttribute("aria-hidden", "false");
      overlayImage.onload = () => {
        overlayHero.classList.remove("empty");
        overlayImage.hidden = false;
      };
      overlayImage.onerror = () => {
        overlayImage.hidden = true;
        overlayHero.classList.add("empty");
      };
      overlayImage.src = src;
    }

    function showOverlayScreen(options) {
      overlay.dataset.mode = options.mode;
      restartBtn.textContent = options.buttonText;
      setOverlayHeroImage(options.imageSrc ?? "", options.imageAlt ?? "");
      overlay.classList.add("show");
    }

    function spawnHitEffect(target) {
      const playRect = playArea.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const burst = document.createElement("div");
      const badge = document.createElement("div");

      burst.className = "hit-burst";
      burst.style.left = `${targetRect.left - playRect.left + (targetRect.width / 2)}px`;
      burst.style.top = `${targetRect.top - playRect.top + (targetRect.height / 2) - (targetRect.height * 0.2)}px`;

      badge.className = "hit-badge";
      badge.textContent = `+${SCORE_PER_HIT}`;

      burst.appendChild(badge);
      fxLayer.appendChild(burst);
      burst.addEventListener("animationend", () => burst.remove(), { once: true });
    }

    function spawnMissEffect(target) {
      if (!target) return;

      const playRect = playArea.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const burst = document.createElement("div");
      const flash = document.createElement("div");
      const bomb = document.createElement("div");

      burst.className = "miss-burst";
      burst.style.left = `${targetRect.left - playRect.left + (targetRect.width / 2)}px`;
      burst.style.top = `${targetRect.top - playRect.top + (targetRect.height / 2) - (targetRect.height * 0.1)}px`;

      flash.className = "miss-flash";
      bomb.className = "miss-bomb";

      burst.appendChild(flash);
      burst.appendChild(bomb);
      fxLayer.appendChild(burst);
      burst.addEventListener("animationend", () => burst.remove(), { once: true });
    }

    function setMoleDown(index) {
      const mole = moles[index];
      mole.isUp = false;
      mole.button.classList.remove("up");
      mole.button.classList.add("down");
      mole.img.src = "seat_sprite.png";
    }

    function registerMiss(target = null) {
      if (!running) return;
      playMissSound();
      spawnMissEffect(target);
      miss += 1;
      updateHud();

      if (miss >= MAX_MISS) {
        endGame(false);
      }
    }

    function setMoleUp(index, duration) {
      const mole = moles[index];
      if (!mole || mole.isUp) return;

      mole.isUp = true;
      mole.button.classList.remove("down");
      mole.button.classList.add("up");
      mole.img.src = "stand_sprite.png";
      mole.timeoutId = setTimeout(() => {
        mole.timeoutId = null;
        if (!running || !mole.isUp) return;
        setMoleDown(index);
        registerMiss(mole.button);
      }, duration);
    }

    function scheduleMoleRise(index, delayMs, duration) {
      if (delayMs <= 0) {
        setMoleUp(index, duration);
        return;
      }

      let timerId = null;
      timerId = setTimeout(() => {
        riseTimerIds.delete(timerId);
        if (!running) return;
        setMoleUp(index, duration);
      }, delayMs);
      riseTimerIds.add(timerId);
    }

    function handleMoleTap(index, event) {
      event.preventDefault();
      unlockAudio();
      if (!running) return;

      const mole = moles[index];
      if (!mole) return;

      if (mole.isUp) {
        if (mole.timeoutId) {
          clearTimeout(mole.timeoutId);
          mole.timeoutId = null;
        }
        setMoleDown(index);
        playHitSound();
        spawnHitEffect(mole.button);
        score += SCORE_PER_HIT;
        totalScore += SCORE_PER_HIT;
        updateHud();

        if (score >= PASS_SCORE) {
          passLevel();
        }
        return;
      }

      registerMiss(mole.button);
    }

    function pickRandomDownMoles(count) {
      const downIndexes = [];
      for (let i = 0; i < moles.length; i += 1) {
        if (!moles[i].isUp) downIndexes.push(i);
      }

      for (let i = downIndexes.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = downIndexes[i];
        downIndexes[i] = downIndexes[j];
        downIndexes[j] = temp;
      }

      return downIndexes.slice(0, count);
    }

    function gameTurn() {
      if (!running) return;

      const stage = getLevelTurnConfig(level, score);
      const targets = pickRandomDownMoles(stage.upCount);

      for (let i = 0; i < targets.length; i += 1) {
        scheduleMoleRise(targets[i], (stage.staggerMs ?? 0) * i, stage.upDurationMs);
      }

      turnTimer = setTimeout(gameTurn, stage.intervalMs);
    }

    function layoutPlayArea() {
      const size = Math.floor(Math.min(boardWrap.clientWidth, boardWrap.clientHeight));
      playArea.style.width = `${size}px`;
      playArea.style.height = `${size}px`;
      playArea.style.left = `${Math.floor((boardWrap.clientWidth - size) / 2)}px`;
      playArea.style.top = `${Math.floor((boardWrap.clientHeight - size) / 2)}px`;
    }

    function buildBoard() {
      clearTimers();
      holesZone.innerHTML = "";
      fxLayer.innerHTML = "";
      moles = [];
      layoutPlayArea();

      const config = LEVELS[level];
      machineImage.src = config.image;
      machineImage.style.transform = config.contentScaleY ? `scaleY(${config.contentScaleY})` : "";
      const points = config.holePoints;
      const holeYOffset = DEFAULT_HOLE_Y_OFFSET + (config.holeYOffset ?? 0);
      const holeSizeScale = config.holeSizeScale ?? 1;
      const contentScaleY = config.contentScaleY ?? 1;
      const contentCenterY = BASE_IMAGE_SIZE / 2;

      for (let i = 0; i < points.length; i += 1) {
        const [x, originY] = points[i];
        const adjustedY = originY + holeYOffset;
        const scaledY = contentCenterY + ((adjustedY - contentCenterY) * contentScaleY);
        const y = Math.max(0, Math.min(BASE_IMAGE_SIZE, scaledY));
        const holeSize = Math.round((86 + (y / BASE_IMAGE_SIZE) * 24) * holeSizeScale);

        const button = document.createElement("button");
        button.className = "mole-btn down";
        button.type = "button";
        button.style.left = `${(x / BASE_IMAGE_SIZE) * 100}%`;
        button.style.top = `${(y / BASE_IMAGE_SIZE) * 100}%`;
        button.style.width = `${holeSize}px`;
        button.style.height = `${holeSize}px`;
        button.setAttribute("aria-label", `${i + 1}번 구멍`);

        const clip = document.createElement("div");
        clip.className = "mole-clip";

        const img = document.createElement("img");
        img.className = "mole-img";
        img.src = "seat_sprite.png";
        img.alt = "앉아 있는 두더지";

        clip.appendChild(img);
        button.appendChild(clip);
        button.addEventListener("pointerdown", (event) => handleMoleTap(i, event), { passive: false });

        holesZone.appendChild(button);
        moles.push({ isUp: false, timeoutId: null, img, button });
      }
    }

    function startLevel() {
      running = false;
      clearTimers();
      buildBoard();
      updateHud();
      showStatus(`LEVEL ${level} 시작`);

      setTimeout(() => {
        if (overlay.classList.contains("show")) return;
        running = true;
        gameTurn();
      }, 900);
    }

    function passLevel() {
      running = false;
      clearTimers();

      if (level >= FINAL_LEVEL) {
        endGame(true);
        return;
      }

      level += 1;
      score = 0;
      miss = 0;
      startLevel();
    }

    function endGame(isClear) {
      running = false;
      clearTimers();
      stopBgm();
      statusEl.classList.remove("show");

      if (isClear) {
        showOverlayScreen({
          mode: "clear",
          buttonText: "처음으로 가기",
          imageSrc: "clear.png",
          imageAlt: "최종 클리어 이미지"
        });
      } else {
        showOverlayScreen({
          mode: "gameover",
          buttonText: "처음으로 가기",
          imageSrc: "gameover.png",
          imageAlt: "게임 오버 이미지"
        });
      }
    }

    function startNewGame() {
      level = 1;
      score = 0;
      totalScore = 0;
      miss = 0;
      overlay.classList.remove("show");
      startBgm();
      startLevel();
    }

    function showStartScreen() {
      running = false;
      clearTimers();
      stopBgm();
      level = 1;
      score = 0;
      totalScore = 0;
      miss = 0;
      buildBoard();
      updateHud();
      statusEl.classList.remove("show");
      showOverlayScreen({
        mode: "start",
        buttonText: "시작하기",
        imageSrc: "start.png",
        imageAlt: "게임 시작 이미지"
      });
    }

    restartBtn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      unlockAudio();
      if (overlay.dataset.mode === "start") {
        startNewGame();
        return;
      }
      showStartScreen();
    }, { passive: false });

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("resize", layoutPlayArea);

    window.addEventListener("load", () => {
      showStartScreen();
    });
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
