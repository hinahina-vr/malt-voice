import { chatGptFreePrompt, chatGptPlusPrompt, geminiPrompts } from './prompts.js';

const editions = {
  'chatgpt-free': {
    platform: 'ChatGPT',
    title: 'ChatGPT用・短い版',
    description: 'Free / Go向け。1,500文字枠に収まる圧縮版。',
    parts: [chatGptFreePrompt],
    fileName: 'hinahina-chatgpt-free-go-1500.txt',
  },
  'chatgpt-plus': {
    platform: 'ChatGPT',
    title: 'ChatGPT用・フル版',
    description: 'Plus以上の対象プラン向け。Free / Goでは使えない、5,000文字枠の完全版。',
    parts: [chatGptPlusPrompt],
    fileName: 'hinahina-chatgpt-plus-5000.txt',
  },
  gemini: {
    platform: 'Gemini',
    title: `Gemini用・${geminiPrompts.length}分割`,
    description: `Gemini向け。各パートを440文字以下にした${geminiPrompts.length}分割版。`,
    parts: geminiPrompts,
    fileName: `hinahina-gemini-${geminiPrompts.length}parts.txt`,
  },
};

const numberFormatter = new Intl.NumberFormat('ja-JP');
const validEditionIds = new Set(Object.keys(editions));

const elements = {
  setup: document.querySelector('#setup'),
  panel: document.querySelector('#edition-panel'),
  tabs: [...document.querySelectorAll('[data-tab]')],
  selectButtons: [...document.querySelectorAll('[data-select-edition]')],
  selectedPlatform: document.querySelector('[data-selected-platform]'),
  selectedTitle: document.querySelector('[data-selected-title]'),
  selectedDescription: document.querySelector('[data-selected-description]'),
  totalCount: document.querySelector('[data-total-count]'),
  partCount: document.querySelector('[data-part-count]'),
  promptLabel: document.querySelector('[data-prompt-label]'),
  currentCount: document.querySelector('[data-current-count]'),
  promptPreview: document.querySelector('[data-prompt-preview]'),
  copyPrompt: document.querySelector('[data-copy-prompt]'),
  copyPromptLabel: document.querySelector('[data-copy-prompt-label]'),
  copyPromptToolbar: document.querySelector('[data-copy-prompt-toolbar]'),
  copyFeedbackButtons: [...document.querySelectorAll('[data-copy-feedback]')],
  nextPart: document.querySelector('[data-next-part]'),
  download: document.querySelector('[data-download]'),
  geminiNav: document.querySelector('[data-gemini-nav]'),
  partButtons: document.querySelector('[data-part-buttons]'),
  partPrev: document.querySelector('[data-part-prev]'),
  partNext: document.querySelector('[data-part-next]'),
  shareX: document.querySelector('[data-share-x]'),
  shareNative: document.querySelector('[data-share-native]'),
  guidePlatform: document.querySelector('[data-guide-platform]'),
  geminiPartCounts: [...document.querySelectorAll('[data-gemini-part-count]')],
  platformGuides: [...document.querySelectorAll('[data-platform-guide]')],
  summonIntro: document.querySelector('[data-summon-intro]'),
  summonSkip: document.querySelector('[data-summon-skip]'),
  summonReplay: document.querySelector('[data-summon-replay]'),
  characterTabs: [...document.querySelectorAll('[data-character-tab]')],
  characterPanels: [...document.querySelectorAll('[data-character-panel]')],
  characterSelectButtons: [...document.querySelectorAll('[data-character-select]')],
  setupNav: document.querySelector('[data-setup-nav]'),
  setupNavLabel: document.querySelector('[data-setup-nav-label]'),
  toast: document.querySelector('[data-toast]'),
};

let currentEditionId = 'chatgpt-plus';
let currentPartIndex = 0;
let toastTimer = null;
let summonTimer = null;
let summonExitTimer = null;
let summonRunId = 0;
let currentCharacterId = 'hinahina';
const copyFeedbackTimers = new WeakMap();
const MATRIX_GLYPHS = Array.from('01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホΞλΩ∆◇◆░▒▓');
const screenFieldAnimations = new WeakMap();
const screenFieldTargets = new Set();
const scrambledSections = new WeakSet();
let scrambleObserver = null;
let interfaceDecodeRun = 0;

const validCharacterIds = new Set(['hinahina', 'kai']);
const openingVariant = new URLSearchParams(window.location.search).get('opening');
const POP_OPENING_DURATION = 7400;
const DEFAULT_OPENING_DURATION = 8500;

if (openingVariant === 'pop') {
  elements.summonIntro?.classList.add('is-pop-opening');
}

function preloadOpeningImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener('load', () => {
      if (typeof image.decode === 'function') {
        image.decode().catch(() => {}).finally(resolve);
        return;
      }
      resolve();
    }, { once: true });
    image.addEventListener('error', resolve, { once: true });
    image.src = src;
  });
}

const openingAssetsReady = Promise.all([
  preloadOpeningImage('/hinahina/images/eyecatch-lively-v7.jpg'),
  preloadOpeningImage('/hinahina/images/header-keyvisual-preferred-v6.webp'),
  preloadOpeningImage('/hinahina/images/avatar-kai-cute-v3.webp'),
  preloadOpeningImage('/hinahina/images/avatar-hinahina-cute-v3.webp'),
  preloadOpeningImage('/hinahina/images/malt-battle-ai-logo-v3.png'),
]);

function splitScrambleText(text) {
  if (typeof Intl.Segmenter === 'function') {
    const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
    return [...segmenter.segment(text)].map((entry) => entry.segment);
  }
  return Array.from(text);
}

function screenFieldText(target) {
  return [...target.childNodes].map((node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.nodeValue;
    if (node instanceof HTMLBRElement) return '\n';
    return '';
  }).join('').trim();
}

function hasVisiblePseudoContent(target) {
  return ['::before', '::after'].some((pseudo) => {
    const content = getComputedStyle(target, pseudo).content;
    return content && content !== 'none' && content !== 'normal';
  });
}

function clearScreenScramble(target, animation) {
  if (animation && screenFieldAnimations.get(target) !== animation) return;
  target.removeAttribute('data-screen-scrambling');
  target.removeAttribute('data-screen-scramble');
  target.style.removeProperty('--screen-scramble-color');
  if (animation?.addedPosition) target.style.removeProperty('position');
  screenFieldAnimations.delete(target);
  screenFieldTargets.delete(target);
}

function cancelScreenScramble(target) {
  if (!target) return;
  const animation = screenFieldAnimations.get(target);
  if (animation?.frame) cancelAnimationFrame(animation.frame);
  if (animation?.timer) clearTimeout(animation.timer);
  clearScreenScramble(target, animation);
}

function cancelScreenScrambles(root = document) {
  if (!root) return;
  [...screenFieldTargets].forEach((target) => {
    if (root === document || target === root || root.contains(target)) {
      cancelScreenScramble(target);
    }
  });
}

function scrambleScreenField(target, text, { delay = 0, duration = 480 } = {}) {
  if (!target || !text) return;
  cancelScreenScramble(target);

  const characters = splitScrambleText(text);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !characters.length) return;

  const animation = { frame: 0, timer: 0, lastDraw: 0, addedPosition: false };
  screenFieldAnimations.set(target, animation);
  screenFieldTargets.add(target);
  const drawNoise = (settledCount) => characters.map((character, index) => {
    if (index < settledCount || /\s/u.test(character)) return character;
    return MATRIX_GLYPHS[Math.floor(Math.random() * MATRIX_GLYPHS.length)];
  }).join('');

  animation.timer = setTimeout(() => {
    animation.timer = 0;
    if (screenFieldAnimations.get(target) !== animation || !target.isConnected) {
      clearScreenScramble(target, animation);
      return;
    }

    const startedAt = performance.now();
    if (getComputedStyle(target).position === 'static') {
      target.style.position = 'relative';
      animation.addedPosition = true;
    }
    target.style.setProperty('--screen-scramble-color', getComputedStyle(target).color);
    target.dataset.screenScrambling = 'true';
    target.dataset.screenScramble = drawNoise(0);

    const draw = (now) => {
      if (screenFieldAnimations.get(target) !== animation || !target.isConnected) return;
      const progress = Math.min(1, (now - startedAt) / duration);
      if (progress >= 1) {
        clearScreenScramble(target, animation);
        return;
      }
      if (now - animation.lastDraw >= 32) {
        const eased = 1 - Math.pow(1 - progress, 2.5);
        target.dataset.screenScramble = drawNoise(Math.floor(characters.length * eased));
        animation.lastDraw = now;
      }
      animation.frame = requestAnimationFrame(draw);
    };
    animation.frame = requestAnimationFrame(draw);
  }, delay);
}

function scrambleInterface(root, { screen = 'interface', maxStagger = 320 } = {}) {
  if (!root) return;
  interfaceDecodeRun += 1;
  document.body.dataset.interfaceDecode = screen;
  document.body.dataset.interfaceDecodeRun = String(interfaceDecodeRun);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const blockedSelector = [
    'script', 'style', 'template', 'svg', 'canvas', 'input', 'textarea', 'select', 'option',
    '[hidden]', '[inert]', '[aria-hidden="true"]', '[data-screen-scramble="off"]', '.sr-only',
    '[data-scrambling]', '[data-model-scrambling]', '.summon-intro',
  ].join(',');
  const candidates = [root, ...root.querySelectorAll('*')].filter((target) => {
    if (!(target instanceof HTMLElement) || target.matches(blockedSelector) || target.closest(blockedSelector)) return false;
    if ([...target.children].some((child) => !(child instanceof HTMLBRElement) && child.tagName !== 'WBR')) return false;
    if (!screenFieldText(target)) return false;
    if (!target.getClientRects().length) return false;
    const style = getComputedStyle(target);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return !hasVisiblePseudoContent(target);
  });

  candidates.forEach((target, index) => {
    const text = screenFieldText(target);
    const delay = Math.min(maxStagger, index * 15) + ((index * 13) % 24);
    const duration = Math.min(720, 350 + text.length * 7 + (index % 4) * 34);
    scrambleScreenField(target, text, { delay, duration });
  });
  document.body.dataset.interfaceDecodeFields = String(candidates.length);
}

function queueOpeningScramble(selector, delay, duration = 480, { fullText = false, stagger = 0 } = {}) {
  elements.summonIntro.querySelectorAll(selector).forEach((target, index) => {
    const text = fullText ? target.textContent.trim() : screenFieldText(target);
    scrambleScreenField(target, text, { delay: delay + (index * stagger), duration });
  });
}

function playOpeningScrambles() {
  if (elements.summonIntro.classList.contains('is-pop-opening')) {
    queueOpeningScramble('.pop-prologue-code', 120, 430);
    queueOpeningScramble('.pop-prologue-season', 180, 460);
    queueOpeningScramble('.pop-panel-kai .pop-character-file', 1180, 420);
    queueOpeningScramble('.pop-panel-kai .pop-character-lockup h2', 1240, 500);
    queueOpeningScramble('.pop-panel-kai .pop-character-lockup > p:not(.pop-character-file)', 1320, 540);
    queueOpeningScramble('.pop-panel-kai .pop-character-lockup small', 1380, 500);
    queueOpeningScramble('.pop-panel-hinahina .pop-character-file', 2480, 420);
    queueOpeningScramble('.pop-panel-hinahina .pop-character-lockup h2', 2540, 540);
    queueOpeningScramble('.pop-panel-hinahina .pop-character-lockup > p:not(.pop-character-file)', 2620, 580);
    queueOpeningScramble('.pop-panel-hinahina .pop-character-lockup small', 2680, 500);
    queueOpeningScramble('.pop-montage-label', 3680, 460);
    queueOpeningScramble('.pop-word-rails strong', 3740, 520, { stagger: 90 });
    queueOpeningScramble('.pop-word-rails small', 3780, 440, { stagger: 90 });
    queueOpeningScramble('.pop-final-file', 5180, 440);
    queueOpeningScramble('.pop-final-tagline > span', 5300, 480);
    queueOpeningScramble('.pop-final-tagline strong', 5380, 650);
    queueOpeningScramble('.pop-final-hello', 5660, 560);
    return;
  }

  queueOpeningScramble('.opening-prelude span', 4860, 430, { stagger: 70 });
  queueOpeningScramble('.opening-title-kicker', 5040, 500);
  queueOpeningScramble('.opening-title-main', 5120, 650);
  queueOpeningScramble('.opening-title-sub', 5260, 500);
  queueOpeningScramble('.opening-copy > span:first-child', 5780, 420);
  queueOpeningScramble('.opening-copy-prefix', 6000, 420);
  queueOpeningScramble('.opening-copy strong', 6050, 620);
  queueOpeningScramble('.opening-footer span', 6360, 430, { stagger: 70 });
}

function scrambleHero() {
  scrambleInterface(document.querySelector('.hero-copy'), { screen: 'hero', maxStagger: 230 });
}

function initSectionScrambles() {
  if (scrambleObserver || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const selectors = [
    '.persona-switcher',
    '#hinahina-editions-panel .section-heading',
    '.edition-grid',
    '.plan-warning',
    '.setup-heading',
    '.setup-stage',
    '.aftertalk-intro',
    '.aftertalk-line',
    '.share-band .section-shell',
  ];
  const targets = selectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
  scrambleObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting || scrambledSections.has(entry.target)) return;
      scrambledSections.add(entry.target);
      scrambleObserver.unobserve(entry.target);
      scrambleInterface(entry.target, { screen: 'section', maxStagger: 260 });
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
  targets.forEach((target) => scrambleObserver.observe(target));
}

function clampProgress(value) {
  return Math.min(1, Math.max(0, value));
}

function segmentProgress(value, start, end) {
  return clampProgress((value - start) / Math.max(0.001, end - start));
}

function easeOutCubic(value) {
  return 1 - ((1 - value) ** 3);
}

function initScrollCinema() {
  const scenes = [...document.querySelectorAll('[data-scroll-scene]')];
  if (!scenes.length) return;

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const chapterNumber = document.querySelector('[data-chapter-number]');
  const chapterLabel = document.querySelector('[data-chapter-label]');
  const chapterProgress = document.querySelector('[data-page-progress]');
  const chapterLinks = [...document.querySelectorAll('[data-chapter-link]')];
  const hero = document.querySelector('#hero');
  const conversation = document.querySelector('#conversation');
  const conversationViewport = conversation?.querySelector('[data-conversation-viewport]');
  const conversationTrack = conversation?.querySelector('[data-conversation-track]');
  const conversationTurnCurrent = conversation?.querySelector('[data-conversation-turn-current]');
  const bridge = document.querySelector('#distillation');
  const aftertalk = document.querySelector('#aftertalk');
  const share = document.querySelector('#share');
  let activeScene = null;
  let scrollFrame = 0;

  const revealGroups = [
    { selector: '.conversation-heading', variant: 'left' },
    { selector: '.persona-switcher', variant: 'up' },
    { selector: '#hinahina-editions-panel .section-heading', variant: 'left', delay: 70 },
    { selector: '.edition-card', variant: 'tilt', delay: 120, stagger: 120 },
    { selector: '.plan-warning', variant: 'wipe', delay: 180 },
    { selector: '.persona-upcoming-copy', variant: 'left' },
    { selector: '.persona-upcoming-visual', variant: 'right', delay: 120 },
    { selector: '.setup-heading', variant: 'left' },
    { selector: '.setup-stage', variant: 'stage', delay: 80, stagger: 100 },
    { selector: '.aftertalk-cast-kai', variant: 'left' },
    { selector: '.aftertalk-heading', variant: 'scale', delay: 100 },
    { selector: '.aftertalk-cast-hinahina', variant: 'right', delay: 160 },
    { selector: '.aftertalk-line', variant: (target) => target.classList.contains('aftertalk-line-kai') ? 'left' : 'right' },
    { selector: '.share-layout > div:first-child', variant: 'left' },
    { selector: '.share-actions', variant: 'right', delay: 140 },
  ];

  const revealTargets = [];
  revealGroups.forEach(({ selector, variant, delay = 0, stagger = 0 }) => {
    document.querySelectorAll(selector).forEach((target, index) => {
      target.dataset.scrollReveal = typeof variant === 'function' ? variant(target) : variant;
      target.style.setProperty('--reveal-delay', `${Math.min(520, delay + (index * stagger))}ms`);
      revealTargets.push(target);
    });
  });

  if (reducedMotion.matches || !('IntersectionObserver' in window)) {
    revealTargets.forEach((target) => target.classList.add('is-revealed'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach((target) => revealObserver.observe(target));
  }

  const conversationSequence = conversationTrack
    ? [...conversationTrack.querySelectorAll('.conversation-turn')].map((message) => {
      const textTarget = message.querySelector('.conversation-text');
      if (!textTarget) return { message, characters: [] };

      const text = textTarget.textContent.trim();
      const accessibleText = document.createElement('span');
      accessibleText.className = 'sr-only';
      accessibleText.textContent = text;
      const visualText = document.createElement('span');
      visualText.className = 'conversation-typewriter';
      visualText.setAttribute('aria-hidden', 'true');
      const characters = splitScrambleText(text).map((value) => {
        const character = document.createElement('span');
        character.className = 'conversation-character';
        character.textContent = /\s/u.test(value) ? '\u00a0' : value;
        visualText.append(character);
        return character;
      });
      textTarget.replaceChildren(accessibleText, visualText);
      return { message, characters, visibleCharacterCount: 0 };
    })
    : [];
  let conversationMetricsDirty = true;
  let conversationMessageShifts = [];

  function updateConversationCinema(viewportHeight) {
    if (!conversation || !conversationSequence.length || !conversationViewport || !conversationTrack) return;

    if (reducedMotion.matches) {
      conversation.style.setProperty('--conversation-line-progress', '1');
      conversation.style.setProperty('--conversation-cue-opacity', '0');
      conversationTrack.style.transform = 'none';
      conversationSequence.forEach((entry) => {
        const { message, characters } = entry;
        message.style.opacity = '1';
        message.style.transform = 'none';
        for (let index = entry.visibleCharacterCount; index < characters.length; index += 1) {
          characters[index].classList.add('is-visible');
        }
        entry.visibleCharacterCount = characters.length;
      });
      if (conversationTurnCurrent) conversationTurnCurrent.textContent = '05';
      return;
    }

    const rect = conversation.getBoundingClientRect();
    const stickyOffset = window.innerWidth <= 640 ? 64 : 72;
    const stickyHeight = Math.max(1, viewportHeight - stickyOffset);
    const pinDistance = Math.max(1, rect.height - stickyHeight);
    const progress = clampProgress((stickyOffset - rect.top) / pinDistance);
    const sequenceStart = 0.055;
    const sequenceEnd = 0.91;
    const step = (sequenceEnd - sequenceStart) / conversationSequence.length;
    let activeIndex = -1;
    let activeLocalProgress = 0;

    conversation.style.setProperty('--conversation-progress', progress.toFixed(4));
    conversation.style.setProperty('--conversation-line-progress', segmentProgress(progress, 0.035, 0.94).toFixed(3));
    conversation.style.setProperty('--conversation-cue-opacity', (1 - segmentProgress(progress, 0.015, 0.12)).toFixed(3));
    conversation.style.setProperty('--conversation-cue-shift', `${(-8 * segmentProgress(progress, 0.015, 0.12)).toFixed(2)}px`);

    conversationSequence.forEach((entry, index) => {
      const { message, characters } = entry;
      const start = sequenceStart + (step * index);
      const localProgress = segmentProgress(progress, start, start + (step * 0.82));
      const bubbleProgress = easeOutCubic(segmentProgress(localProgress, 0, 0.34));
      const textProgress = segmentProgress(localProgress, 0.16, 1);
      const direction = message.classList.contains('conversation-turn-user') ? 1 : -1;
      const horizontalShift = direction * (18 * (1 - bubbleProgress));
      const verticalShift = 9 * (1 - bubbleProgress);
      const visibleCharacterCount = Math.ceil(characters.length * textProgress);

      message.style.opacity = bubbleProgress.toFixed(3);
      message.style.transform = `translate3d(${horizontalShift.toFixed(2)}px, ${verticalShift.toFixed(2)}px, 0)`;
      message.style.pointerEvents = bubbleProgress > 0.98 ? '' : 'none';
      if (visibleCharacterCount > entry.visibleCharacterCount) {
        for (let characterIndex = entry.visibleCharacterCount; characterIndex < visibleCharacterCount; characterIndex += 1) {
          characters[characterIndex].classList.add('is-visible');
        }
      } else if (visibleCharacterCount < entry.visibleCharacterCount) {
        for (let characterIndex = visibleCharacterCount; characterIndex < entry.visibleCharacterCount; characterIndex += 1) {
          characters[characterIndex].classList.remove('is-visible');
        }
      }
      entry.visibleCharacterCount = visibleCharacterCount;

      if (localProgress > 0) {
        activeIndex = index;
        activeLocalProgress = localProgress;
      }
    });

    const currentTurn = activeIndex < 0 ? 0 : Math.ceil((activeIndex + 1) / 2);
    if (conversationTurnCurrent) conversationTurnCurrent.textContent = String(currentTurn).padStart(2, '0');

    if (activeIndex < 0) {
      conversationTrack.style.transform = 'translate3d(0, 0, 0)';
      return;
    }

    if (conversationMetricsDirty) {
      const viewportHeight = conversationViewport.clientHeight;
      const viewportSpace = Math.max(1, viewportHeight - 28);
      const maxShift = Math.max(0, conversationTrack.scrollHeight - viewportHeight);
      conversationMessageShifts = conversationSequence.map(({ message }) => (
        Math.min(maxShift, Math.max(0, message.offsetTop + message.offsetHeight - viewportSpace))
      ));
      conversationMetricsDirty = false;
    }
    const previousShift = activeIndex > 0 ? conversationMessageShifts[activeIndex - 1] : 0;
    const currentShift = conversationMessageShifts[activeIndex] || 0;
    const shiftProgress = easeOutCubic(segmentProgress(activeLocalProgress, 0, 0.58));
    const trackShift = previousShift + ((currentShift - previousShift) * shiftProgress);
    conversationTrack.style.transform = `translate3d(0, ${(-trackShift).toFixed(2)}px, 0)`;
  }

  function setActiveScene(scene) {
    if (!scene || activeScene === scene) return;
    activeScene = scene;
    root.dataset.activeChapter = scene.id;
    const number = scene.dataset.chapterNumber || '00';
    const label = scene.dataset.chapterLabel || 'OPENING';
    if (chapterNumber) chapterNumber.textContent = number;
    if (chapterLabel) chapterLabel.textContent = label;
    chapterLinks.forEach((link) => {
      const isCurrent = link.dataset.chapterLink === scene.id;
      link.toggleAttribute('aria-current', isCurrent);
      link.classList.toggle('is-current', isCurrent);
    });
  }

  function updateScrollCinema() {
    scrollFrame = 0;
    const viewportHeight = Math.max(1, window.innerHeight);
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
    const pageProgress = clampProgress(window.scrollY / maxScroll);
    root.style.setProperty('--page-progress', pageProgress.toFixed(4));
    if (chapterProgress) chapterProgress.style.transform = `scaleY(${pageProgress})`;

    const focusLine = viewportHeight * 0.46;
    let closestScene = scenes[0];
    let closestDistance = Number.POSITIVE_INFINITY;

    scenes.forEach((scene) => {
      const rect = scene.getBoundingClientRect();
      const progress = clampProgress((viewportHeight * 0.88 - rect.top) / (rect.height + viewportHeight * 0.76));
      scene.style.setProperty('--scene-progress', progress.toFixed(4));
      const distance = rect.top <= focusLine && rect.bottom >= focusLine
        ? 0
        : Math.min(Math.abs(rect.top - focusLine), Math.abs(rect.bottom - focusLine));
      if (distance < closestDistance) {
        closestDistance = distance;
        closestScene = scene;
      }
    });

    if (pageProgress > 0.985) closestScene = scenes[scenes.length - 1];

    setActiveScene(closestScene);

    if (hero) {
      const rect = hero.getBoundingClientRect();
      const exit = clampProgress(-rect.top / Math.max(1, rect.height * 0.78));
      hero.style.setProperty('--hero-bg-scale', (1.002 + exit * 0.065).toFixed(4));
      hero.style.setProperty('--hero-bg-shift', `${(-22 * exit).toFixed(2)}px`);
      hero.style.setProperty('--hero-copy-shift', `${(-58 * exit).toFixed(2)}px`);
      hero.style.setProperty('--hero-copy-opacity', clampProgress(1 - exit * 1.16).toFixed(3));
      hero.style.setProperty('--hero-cast-shift', `${(-34 * exit).toFixed(2)}px`);
      hero.style.setProperty('--hero-scrim-opacity', (1 - exit * 0.34).toFixed(3));
    }

    if (conversation) {
      updateConversationCinema(viewportHeight);
    }

    if (bridge) {
      const rect = bridge.getBoundingClientRect();
      const pinDistance = Math.max(1, rect.height - viewportHeight);
      const entryProgress = clampProgress((viewportHeight - rect.top) / viewportHeight);
      const pinnedProgress = clampProgress(-rect.top / pinDistance);
      const progress = clampProgress((viewportHeight - rect.top) / Math.max(1, rect.height));
      const imageReveal = segmentProgress(entryProgress, 0.02, 1) ** 1.35;
      const originTravel = easeOutCubic(segmentProgress(entryProgress, 0.02, 0.9));
      const restingOriginY = window.innerWidth <= 640 ? 62 : 49;
      const originY = 4 + ((restingOriginY - 4) * originTravel);
      const copyIn = easeOutCubic(segmentProgress(pinnedProgress, 0.04, 0.31));
      const copyOut = segmentProgress(pinnedProgress, 0.84, 0.98);
      const copyOpacity = copyIn * (1 - copyOut);
      const bloomIn = segmentProgress(pinnedProgress, 0.24, 0.58);
      const bloomOut = segmentProgress(pinnedProgress, 0.8, 0.96);
      bridge.style.setProperty('--bridge-progress', progress.toFixed(4));
      bridge.style.setProperty('--bridge-clip', `${(8 + imageReveal * 142).toFixed(2)}%`);
      bridge.style.setProperty('--bridge-image-scale', (1.16 - imageReveal * 0.14).toFixed(4));
      bridge.style.setProperty('--bridge-origin-y', `${originY.toFixed(2)}%`);
      bridge.style.setProperty('--bridge-copy-opacity', copyOpacity.toFixed(3));
      bridge.style.setProperty('--bridge-copy-shift', `${((1 - copyIn) * 44 - copyOut * 24).toFixed(2)}px`);
      bridge.style.setProperty('--bridge-rule-progress', segmentProgress(pinnedProgress, 0.18, 0.5).toFixed(3));
      bridge.style.setProperty('--bridge-veil-opacity', (0.82 - imageReveal * 0.54).toFixed(3));
      bridge.style.setProperty('--bridge-bloom-opacity', (bloomIn * (1 - bloomOut) * 0.88).toFixed(3));
      bridge.style.setProperty('--bridge-light-shift', `${(-28 + pinnedProgress * 56).toFixed(2)}%`);
    }

    if (aftertalk) {
      const progress = Number(aftertalk.style.getPropertyValue('--scene-progress')) || 0;
      aftertalk.style.setProperty('--aftertalk-line-progress', segmentProgress(progress, 0.04, 0.92).toFixed(3));
      aftertalk.style.setProperty('--aftertalk-kai-drift', `${((progress - 0.5) * 22).toFixed(2)}px`);
      aftertalk.style.setProperty('--aftertalk-hinahina-drift', `${((0.5 - progress) * 22).toFixed(2)}px`);
    }

    if (share) {
      const progress = Number(share.style.getPropertyValue('--scene-progress')) || 0;
      share.style.setProperty('--share-bloom-progress', segmentProgress(progress, 0.06, 0.68).toFixed(3));
      share.style.setProperty('--share-sweep-shift', `${(-42 + progress * 84).toFixed(2)}%`);
    }
  }

  function requestScrollCinemaUpdate() {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateScrollCinema);
  }

  root.classList.add('has-scroll-cinema');
  window.addEventListener('scroll', requestScrollCinemaUpdate, { passive: true });
  window.addEventListener('resize', () => {
    conversationMetricsDirty = true;
    requestScrollCinemaUpdate();
  });
  window.addEventListener('pageshow', requestScrollCinemaUpdate);
  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(() => {
      conversationMetricsDirty = true;
      requestScrollCinemaUpdate();
    });
    resizeObserver.observe(document.querySelector('main'));
    if (conversationViewport) resizeObserver.observe(conversationViewport);
    if (conversationTrack) resizeObserver.observe(conversationTrack);
  }
  requestScrollCinemaUpdate();
}

function hideSummon() {
  summonRunId += 1;
  cancelScreenScrambles(elements.summonIntro);
  elements.summonIntro.hidden = true;
  elements.summonIntro.classList.remove('is-active', 'is-leaving');
  document.body.classList.remove('is-summoning');
  document.body.dataset.scrambleReady = 'true';
  window.requestAnimationFrame(() => {
    scrambleHero();
    initSectionScrambles();
  });
}

function finishSummon() {
  summonRunId += 1;
  window.clearTimeout(summonTimer);
  window.clearTimeout(summonExitTimer);
  cancelScreenScrambles(elements.summonIntro);
  elements.summonIntro.classList.add('is-leaving');
  summonExitTimer = window.setTimeout(hideSummon, 1050);
}

async function playSummon() {
  if (!elements.summonIntro) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hideSummon();
    return;
  }

  window.clearTimeout(summonTimer);
  window.clearTimeout(summonExitTimer);
  cancelScreenScrambles(elements.summonIntro);
  cancelScreenScrambles(document.querySelector('.hero-copy'));
  const runId = ++summonRunId;
  elements.summonIntro.classList.remove('is-active', 'is-leaving');
  elements.summonIntro.hidden = false;
  document.body.classList.add('is-summoning');

  await openingAssetsReady;
  if (runId !== summonRunId || elements.summonIntro.hidden) return;

  void elements.summonIntro.offsetWidth;
  window.requestAnimationFrame(() => {
    if (runId !== summonRunId || elements.summonIntro.hidden) return;
    elements.summonIntro.classList.add('is-active');
    playOpeningScrambles();
    const duration = elements.summonIntro.classList.contains('is-pop-opening')
      ? POP_OPENING_DURATION
      : DEFAULT_OPENING_DURATION;
    summonTimer = window.setTimeout(finishSummon, duration);
  });
}

function formatCount(value) {
  return numberFormatter.format(value);
}

function getEdition() {
  return editions[currentEditionId];
}

function getCurrentPrompt() {
  return getEdition().parts[currentPartIndex];
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove('is-visible');
  }, 2200);
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('copy failed');
}

function resetCopyFeedback(button) {
  if (!button) return;

  window.clearTimeout(copyFeedbackTimers.get(button));
  copyFeedbackTimers.delete(button);

  const label = button.querySelector('[data-copy-feedback-label]');
  if (label && button.dataset.copyDefaultLabel) {
    label.textContent = button.dataset.copyDefaultLabel;
  }

  delete button.dataset.copyDefaultLabel;
  button.classList.remove('is-copied');
  button.querySelector('[data-copy-icon="copy"]')?.removeAttribute('hidden');
  button.querySelector('[data-copy-icon="success"]')?.setAttribute('hidden', '');
}

function showCopyFeedback(button, successLabel = 'コピーしました') {
  if (!button) return;

  resetCopyFeedback(button);
  const label = button.querySelector('[data-copy-feedback-label]');
  if (!label) return;

  button.dataset.copyDefaultLabel = label.textContent;
  label.textContent = successLabel;
  button.classList.add('is-copied');
  button.querySelector('[data-copy-icon="copy"]')?.setAttribute('hidden', '');
  button.querySelector('[data-copy-icon="success"]')?.removeAttribute('hidden');

  copyFeedbackTimers.set(button, window.setTimeout(() => {
    resetCopyFeedback(button);
  }, 1800));
}

function buildDownloadText() {
  const edition = getEdition();
  if (edition.parts.length === 1) return edition.parts[0];

  return edition.parts
    .map((part, index) => `===== ${index + 1}/${edition.parts.length} =====\n${part}`)
    .join('\n\n');
}

function downloadEdition() {
  const edition = getEdition();
  const blob = new Blob([buildDownloadText()], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = edition.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
  showCopyFeedback(elements.download, '保存しました');
}

function renderPartButtons() {
  const edition = getEdition();
  elements.partButtons.replaceChildren(
    ...edition.parts.map((_, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'part-button';
      button.textContent = index + 1;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-label', `Gemini ${index + 1}/${edition.parts.length}`);
      button.setAttribute('aria-selected', String(index === currentPartIndex));
      button.addEventListener('click', () => selectPart(index));
      return button;
    }),
  );
}

function renderEdition() {
  elements.copyFeedbackButtons.forEach(resetCopyFeedback);
  const edition = getEdition();
  const prompt = getCurrentPrompt();
  const isGemini = currentEditionId === 'gemini';
  const totalLength = edition.parts.reduce((sum, part) => sum + part.length, 0);

  elements.selectedPlatform.textContent = edition.platform;
  elements.selectedTitle.textContent = edition.title;
  elements.selectedDescription.textContent = edition.description;
  elements.totalCount.textContent = formatCount(totalLength);
  elements.partCount.textContent = edition.parts.length;
  elements.promptPreview.textContent = prompt;
  elements.currentCount.textContent = formatCount(prompt.length);
  elements.promptLabel.textContent = isGemini
    ? `カスタム指示 ${currentPartIndex + 1} / ${edition.parts.length}`
    : 'カスタム指示';
  elements.copyPromptLabel.textContent = isGemini
    ? `${currentPartIndex + 1}/${edition.parts.length}をコピー`
    : 'この本文をコピー';
  elements.geminiNav.hidden = !isGemini;
  elements.nextPart.hidden = !isGemini || currentPartIndex === edition.parts.length - 1;
  elements.partPrev.disabled = currentPartIndex === 0;
  elements.partNext.disabled = currentPartIndex === edition.parts.length - 1;
  elements.guidePlatform.textContent = edition.platform;
  elements.geminiPartCounts.forEach((count) => {
    count.textContent = editions.gemini.parts.length;
  });

  const activeGuide = isGemini ? 'gemini' : 'chatgpt';
  elements.platformGuides.forEach((guide) => {
    guide.hidden = guide.dataset.platformGuide !== activeGuide;
  });

  if (isGemini) renderPartButtons();

  elements.tabs.forEach((tab) => {
    const selected = tab.dataset.tab === currentEditionId;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  const activeTab = elements.tabs.find((tab) => tab.dataset.tab === currentEditionId);
  elements.panel.setAttribute('aria-labelledby', activeTab.id);
}

function selectPart(index) {
  const maxIndex = getEdition().parts.length - 1;
  currentPartIndex = Math.max(0, Math.min(index, maxIndex));
  renderEdition();
  elements.promptPreview.scrollTop = 0;
}

function selectEdition(editionId, options = {}) {
  if (!validEditionIds.has(editionId)) return;
  const { scroll = false, updateHash = true } = options;
  currentEditionId = editionId;
  currentPartIndex = 0;
  renderEdition();

  if (updateHash) {
    const url = new URL(window.location.href);
    url.hash = editionId;
    history.replaceState(null, '', url);
  }

  if (scroll) {
    elements.setup.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function selectCharacter(characterId, options = {}) {
  if (!validCharacterIds.has(characterId)) return;
  const { focus = false } = options;
  const isHinahina = characterId === 'hinahina';
  currentCharacterId = characterId;

  elements.characterTabs.forEach((tab) => {
    const selected = tab.dataset.characterTab === currentCharacterId;
    tab.classList.toggle('is-active', selected);
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  elements.characterPanels.forEach((panel) => {
    panel.hidden = panel.dataset.characterPanel !== currentCharacterId;
  });

  elements.setup.hidden = !isHinahina;
  elements.setupNav?.setAttribute('href', isHinahina ? '#setup' : '#editions');
  if (elements.setupNavLabel) {
    elements.setupNavLabel.textContent = isHinahina ? '設定する' : '近日登場';
  }
  document.body.dataset.activePersona = currentCharacterId;

  if (focus) {
    elements.characterTabs.find((tab) => tab.dataset.characterTab === currentCharacterId)?.focus();
  }
}

async function copyCurrentPrompt({ advance = false, trigger = null } = {}) {
  try {
    const edition = getEdition();
    const copiedPart = currentPartIndex + 1;
    await copyText(getCurrentPrompt());
    if (trigger) {
      showCopyFeedback(trigger);
    } else {
      showToast(edition.parts.length > 1 ? `${copiedPart}/${edition.parts.length}の本文をコピーした` : '本文をコピーした');
    }

    if (advance && currentPartIndex < edition.parts.length - 1) {
      selectPart(currentPartIndex + 1);
    }
  } catch {
    showToast('コピーできなかった。本文を選択してね');
  }
}

elements.tabs.forEach((tab) => {
  tab.addEventListener('click', () => selectEdition(tab.dataset.tab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = elements.tabs.indexOf(tab);
    const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
    const nextIndex = (currentIndex + direction + elements.tabs.length) % elements.tabs.length;
    const nextTab = elements.tabs[nextIndex];
    selectEdition(nextTab.dataset.tab);
    nextTab.focus();
  });
});

elements.characterTabs.forEach((tab) => {
  tab.addEventListener('click', () => selectCharacter(tab.dataset.characterTab));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const currentIndex = elements.characterTabs.indexOf(tab);
    const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
    const nextIndex = (currentIndex + direction + elements.characterTabs.length) % elements.characterTabs.length;
    const nextTab = elements.characterTabs[nextIndex];
    selectCharacter(nextTab.dataset.characterTab, { focus: true });
  });
});

elements.characterSelectButtons.forEach((button) => {
  button.addEventListener('click', () => selectCharacter(button.dataset.characterSelect, { focus: true }));
});

elements.selectButtons.forEach((button) => {
  button.addEventListener('click', () => selectEdition(button.dataset.selectEdition, { scroll: true }));
});

elements.copyPrompt.addEventListener('click', () => copyCurrentPrompt({ trigger: elements.copyPrompt }));
elements.copyPromptToolbar.addEventListener('click', () => copyCurrentPrompt({ trigger: elements.copyPromptToolbar }));
elements.nextPart.addEventListener('click', () => copyCurrentPrompt({ advance: true }));
elements.partPrev.addEventListener('click', () => selectPart(currentPartIndex - 1));
elements.partNext.addEventListener('click', () => selectPart(currentPartIndex + 1));
elements.download.addEventListener('click', downloadEdition);

elements.shareX.addEventListener('click', () => {
  const text = 'あなたのAIを、汁まみれに。AI人格「ひなひな」を無料配布します。ChatGPTとGeminiに対応。';
  const url = new URL('https://twitter.com/intent/tweet');
  url.searchParams.set('text', `${text}\n${window.location.origin}${window.location.pathname}`);
  window.open(url, '_blank', 'noopener,noreferrer');
});

elements.shareNative.addEventListener('click', async () => {
  const shareData = {
    title: 'AI人格「ひなひな」配布',
    text: 'あなたのAIを、汁まみれに。ChatGPTとGeminiで使えるAI人格「ひなひな」を無料配布。',
    url: `${window.location.origin}${window.location.pathname}`,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }

  try {
    await copyText(shareData.url);
    showToast('ページのURLをコピーした');
  } catch {
    showToast('共有できなかった');
  }
});

elements.summonSkip?.addEventListener('click', finishSummon);
elements.summonReplay?.addEventListener('click', playSummon);

window.addEventListener('pageshow', (event) => {
  if (event.persisted) playSummon();
});

window.addEventListener('hashchange', () => {
  const editionId = window.location.hash.slice(1);
  if (validEditionIds.has(editionId)) {
    selectEdition(editionId, { updateHash: false });
  }
});

const initialEditionId = window.location.hash.slice(1);
selectEdition(validEditionIds.has(initialEditionId) ? initialEditionId : 'chatgpt-plus', { updateHash: false });
selectCharacter('hinahina');
initScrollCinema();
playSummon();
