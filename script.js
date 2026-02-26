/**
 * Romantic Birthday Page - Interactive Web Application
 * Vanilla JavaScript - No frameworks
 */

/* ========== CONFIGURATION - Edit letter text here ========== */
const LETTER_CONFIG = {
  greeting: 'Hola mi gordita,',
  letterFilePath: 'letter.txt',
  signature: 'It was always you...'
};

/* Cached letter body content (loaded from letter.txt) */
let letterBodyContent = '';

/* ========== Game Constants ========== */
const GAME_CONFIG = {
  totalHearts: 17,
  timeLimit: 55,
  heartSpawnInterval: 800,
  maxHeartsOnScreen: 5,
  pochitaImagePath: 'assets/pochita.png',
};

/* ========== DOM Elements ========== */
const heroSection = document.getElementById('hero');
const gameSection = document.getElementById('game');
const letterSection = document.getElementById('letter');
const btnPlay = document.getElementById('btnPlay');
const gameArea = document.getElementById('gameArea');
const heartsCountEl = document.getElementById('heartsCount');
const timeLeftEl = document.getElementById('timeLeft');
const gameMessage = document.getElementById('gameMessage');
const messageText = document.getElementById('messageText');
const btnRetry = document.getElementById('btnRetry');
const envelopeContainer = document.getElementById('envelopeContainer');
const envelope = document.getElementById('envelope');
const letterContainer = document.getElementById('letterContainer');
const letterGreeting = document.getElementById('letterGreeting');
const letterBody = document.getElementById('letterBody');
const letterSignature = document.getElementById('letterSignature');
const confettiContainer = document.getElementById('confettiContainer');
const photoFinaleSection = document.getElementById('photoFinale');
const ambientMusic = document.getElementById('ambientMusic');
const particlesContainer = document.getElementById('particles');

/* ========== State ========== */
let gameState = {
  heartsCaught: 0,
  timeRemaining: GAME_CONFIG.timeLimit,
  timerId: null,
  spawnIntervalId: null,
  heartsOnScreen: 0,
  isGameOver: false,
  hasWon: false,
};

/* ========== Audio ========== */
let audioContext = null;

/**
 * Plays a rupee-like chime (Legend of Zelda style) on each catch
 */
function playRupeeSound() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.setValueAtTime(1174, now + 0.06);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174, now + 0.06);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.18);
  } catch (_) {}
}

/**
 * Returns (and initializes if needed) the Web Audio context
 */
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}

/**
 * Plays a victory fanfare (MIDI-style) when the letter opens
 */
function playVictoryFanfare() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50];
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.2, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    gainNode.connect(ctx.destination);
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.15);
      osc.connect(gainNode);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.4);
    });
  } catch (_) {}
}

/* ========== Initialization ========== */
function init() {
  createParticles();
  bindEvents();
  loadLetterContent();
}

/**
 * Loads letter body content from letter.txt
 */
async function loadLetterContent() {
  try {
    const response = await fetch(LETTER_CONFIG.letterFilePath);
    if (response.ok) {
      letterBodyContent = (await response.text()).trim();
    }
  } catch (_) {
    letterBodyContent = '';
  }
}

/**
 * Creates floating particles in the hero section
 */
function createParticles() {
  const particleCount = 25;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.top = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 5}s`;
    particlesContainer.appendChild(particle);
  }
}

/**
 * Binds all event listeners
 */
function bindEvents() {
  btnPlay.addEventListener('click', handlePlayClick);
  btnRetry.addEventListener('click', handleRetryClick);
  document.addEventListener('click', handleFirstInteraction);
}

/**
 * Handles first user interaction (for unmuting audio)
 */
function handleFirstInteraction() {
  if (ambientMusic.src && ambientMusic.paused) {
    ambientMusic.muted = false;
    ambientMusic.volume = 0.2;
    ambientMusic.play().catch(() => {});
  }
  document.removeEventListener('click', handleFirstInteraction);
}

/**
 * Smooth scroll to game section and start game
 */
function handlePlayClick() {
  gameSection.scrollIntoView({ behavior: 'smooth' });
  setTimeout(startGame, 800);
}

/**
 * Starts the Catch the Hearts game
 */
function startGame() {
  resetGameState();
  updateGameUI();
  gameMessage.classList.remove('visible');
  messageText.textContent = '';
  btnRetry.hidden = true;
  gameArea.innerHTML = '';
  gameState.isGameOver = false;
  gameState.hasWon = false;
  startTimer();
  startHeartSpawning();
}

/**
 * Resets game state to initial values
 */
function resetGameState() {
  gameState.heartsCaught = 0;
  gameState.timeRemaining = GAME_CONFIG.timeLimit;
  gameState.heartsOnScreen = 0;
  if (gameState.timerId) clearInterval(gameState.timerId);
  if (gameState.spawnIntervalId) clearInterval(gameState.spawnIntervalId);
}

/**
 * Updates hearts count and time display
 */
function updateGameUI() {
  heartsCountEl.textContent = gameState.heartsCaught;
  timeLeftEl.textContent = gameState.timeRemaining;
}

/**
 * Starts the countdown timer
 */
function startTimer() {
  gameState.timerId = setInterval(() => {
    gameState.timeRemaining--;
    timeLeftEl.textContent = gameState.timeRemaining;
    if (gameState.timeRemaining <= 0) {
      endGame(false);
    }
  }, 1000);
}

/**
 * Spawns hearts at random positions within the game area
 */
function startHeartSpawning() {
  gameState.spawnIntervalId = setInterval(() => {
    if (gameState.isGameOver) return;
    if (gameState.heartsOnScreen >= GAME_CONFIG.maxHeartsOnScreen) return;
    spawnHeart();
  }, GAME_CONFIG.heartSpawnInterval);
}

/**
 * Creates and appends a single clickable Pochita to the game area
 */
function spawnHeart() {
  const target = document.createElement('div');
  target.className = 'game-target';
  const img = document.createElement('img');
  img.src = GAME_CONFIG.pochitaImagePath;
  img.alt = 'Pochita';
  img.draggable = false;
  img.onerror = () => {
    img.style.display = 'none';
    target.appendChild(document.createTextNode('❤️'));
    target.classList.add('fallback-emoji');
  };
  target.appendChild(img);
  target.setAttribute('role', 'button');
  target.setAttribute('tabindex', '0');
  target.setAttribute('aria-label', 'Catch Pochita');
  const width = gameArea.offsetWidth || 400;
  const height = gameArea.offsetHeight || 300;
  const size = 56;
  const maxX = Math.max(0, width - size - 20);
  const maxY = Math.max(0, height - size - 20);
  target.style.left = `${Math.random() * maxX + 10}px`;
  target.style.top = `${Math.random() * maxY + 10}px`;
  target.addEventListener('click', () => catchHeart(target));
  target.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      catchHeart(target);
    }
  });
  gameArea.appendChild(target);
  gameState.heartsOnScreen++;
}

/**
 * Handles Pochita catch - plays rupee sound, removes target, updates count, checks win
 */
function catchHeart(targetEl) {
  if (gameState.isGameOver) return;
  if (targetEl.classList.contains('caught')) return;
  targetEl.classList.add('caught');
  playRupeeSound();
  gameState.heartsCaught++;
  gameState.heartsOnScreen--;
  heartsCountEl.textContent = gameState.heartsCaught;
  setTimeout(() => targetEl.remove(), 400);
  if (gameState.heartsCaught >= GAME_CONFIG.totalHearts) {
    endGame(true);
  }
}

/**
 * Ends the game - shows message and either retry or reveals letter
 */
function endGame(won) {
  gameState.isGameOver = true;
  clearInterval(gameState.timerId);
  clearInterval(gameState.spawnIntervalId);
  gameArea.querySelectorAll('.game-target').forEach((t) => t.remove());
  gameState.heartsOnScreen = 0;
  if (won) {
    gameState.hasWon = true;
    triggerVictory();
  } else {
    messageText.textContent = 'Love is patient… try again ❤️';
    gameMessage.classList.add('visible');
    btnRetry.hidden = false;
  }
}

/**
 * Handles retry button click
 */
function handleRetryClick() {
  startGame();
}

/**
 * Triggers victory sequence: confetti, scroll to letter, envelope animation
 */
function triggerVictory() {
  createConfetti();
  letterSection.hidden = false;
  letterSection.setAttribute('aria-hidden', 'false');
  letterSection.scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => {
    letterGreeting.textContent = LETTER_CONFIG.greeting;
    letterSignature.textContent = LETTER_CONFIG.signature;
    envelope.classList.add('open');
    playVictoryFanfare();
    setTimeout(() => {
      letterContainer.classList.add('revealed');
      startTypingAnimation();
    }, 800);
  }, 500);
}

/**
 * Creates elegant confetti effect on victory
 */
function createConfetti() {
  const colors = ['#e8a0bf', '#f0c4d4', '#c9a0dc', '#a78bfa'];
  const shapes = ['❤️', '✨', '•'];
  for (let i = 0; i < 40; i++) {
    const confetti = document.createElement('span');
    confetti.className = 'confetti';
    const isHeart = Math.random() > 0.6;
    if (isHeart) {
      confetti.classList.add('heart');
      confetti.textContent = '❤️';
    } else {
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    }
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
    confettiContainer.appendChild(confetti);
    setTimeout(() => confetti.remove(), 4000);
  }
}

/**
 * Types the letter content character by character with blinking cursor
 */
function startTypingAnimation() {
  const fullText = letterBodyContent || '\n\n(Unable to load letter content.)';
  let index = 0;
  const typingSpeed = 35;
  function typeNextChar() {
    if (index < fullText.length) {
      const char = fullText[index];
      const typedSoFar = fullText.slice(0, index + 1);
      const displayText = typedSoFar.replace(/\n/g, '<br>');
      letterBody.innerHTML = displayText + '<span class="typing-cursor"></span>';
      index++;
      setTimeout(typeNextChar, char === '\n' ? typingSpeed * 2 : typingSpeed);
    } else {
      letterBody.innerHTML = fullText.replace(/\n/g, '<br>');
      revealPhotoFinale();
    }
  }
  typeNextChar();
}

/**
 * Reveals the photo finale section with romantic transition
 */
function revealPhotoFinale() {
  photoFinaleSection.hidden = false;
  photoFinaleSection.setAttribute('aria-hidden', 'false');
  setTimeout(() => {
    photoFinaleSection.classList.add('visible');
    photoFinaleSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 100);
}

/* ========== Run ========== */
init();
