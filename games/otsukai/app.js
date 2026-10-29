import { generateDailyRounds, generateRounds, DIFFICULTIES } from './core/model.js';
import { dailySeed, randomSeed, tokyoDateKey } from './core/random.js';
import { scoreFinal, scoreRound, starsForScore, titleForScore } from './core/scoring.js';
import { appendHistory, canUseStorage, clearHistory, readHistory, readSettings, writeSettings } from './core/storage.js';
import { ENCOURAGEMENTS, ROUND_MESSAGES } from './data/messages.js';
import { PRODUCT_BY_ID, PRODUCTS } from './data/products.js';

const root = document.querySelector('#ob-app');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const state = {
  screen: 'title',
  mode: 'normal',
  difficulty: 'usual',
  pendingMode: null,
  seed: null,
  dailyDate: null,
  roundIndex: 0,
  roundPlans: [],
  selectedIds: [],
  hintUsed: false,
  distractorMistakes: 0,
  firstSelectionIds: [],
  roundResults: [],
  settings: readSettings(),
  modal: null,
  detourCorrect: false,
  detourWrongAnswer: null,
  detourHelpVisible: false,
  detourMessage: '',
  memoStartedAt: 0,
  shoppingStartedAt: 0,
  historySaved: false,
};

let storageAvailable = canUseStorage();
let advanceTimer = null;
let audioContext = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function product(id) {
  return PRODUCT_BY_ID[id];
}

function productImage(item, className = '') {
  return `<img class="${className}" src="${escapeHtml(item.asset)}" alt="${escapeHtml(item.alt)}" loading="lazy" width="256" height="256">`;
}

function motionReduced() {
  return reducedMotionQuery.matches || state.settings.reducedMotion;
}

function playSound(kind = 'tap') {
  if (!state.settings.soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    audioContext ||= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    const frequencies = { tap: 440, select: 523, success: 660, result: 392 };
    oscillator.frequency.value = frequencies[kind] || frequencies.tap;
    oscillator.type = 'sine';
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(.055, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + (kind === 'result' ? .38 : .16));
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + (kind === 'result' ? .4 : .18));
  } catch (error) {
    // Sound is optional; a browser without WebAudio remains fully playable.
  }
}

function topbar({ inGame = false } = {}) {
  const back = inGame
    ? '<button type="button" class="ob-top-link" data-action="request-list">ゲーム一覧</button>'
    : '<a class="ob-top-link" href="friend-game-main.html">ゲーム一覧</a>';
  return `<header class="ob-topbar">
    ${back}
    <span class="ob-topbar-brand">おつかい日和</span>
    <div class="ob-topbar-actions">
      <button type="button" class="ob-icon-button" data-action="toggle-sound" aria-pressed="${state.settings.soundEnabled}" aria-label="効果音を${state.settings.soundEnabled ? 'オフ' : 'オン'}">音 ${state.settings.soundEnabled ? 'ON' : 'OFF'}</button>
      <button type="button" class="ob-icon-button" data-action="settings" aria-label="設定を開く">設定</button>
    </div>
  </header>`;
}

function shell({ scene = 'town', artCopy = '', character = '', content = '', inGame = false, single = false } = {}) {
  return `<div class="ob-frame">
    ${topbar({ inGame })}
    <div class="ob-layout${single ? ' is-single' : ''}">
      <div class="ob-art ob-scene-${scene}">
        ${artCopy ? `<div class="ob-art-copy">${artCopy}</div>` : ''}
        ${character ? `<img class="ob-art-character" src="${character}" alt="" width="220" height="300">` : ''}
      </div>
      <section class="ob-panel ob-animate-in">${content}</section>
    </div>
  </div>`;
}

function progress() {
  const percent = Math.round(((state.roundIndex + 1) / 3) * 100);
  return `<div class="ob-progress"><span>第${state.roundIndex + 1}ラウンド / 3</span><div class="ob-progress-bar" aria-hidden="true"><span style="width:${percent}%"></span></div></div>`;
}

function renderTitle() {
  const content = `<span class="ob-kicker">商店街の小さなゲーム</span>
    <h2>今日も、ゆっくり<br>おつかいへ。</h2>
    <p class="ob-lead">買い物メモを覚えて、商店街を歩きます。時間制限はありません。</p>
    <div class="ob-mode-grid">
      <button type="button" class="ob-mode-card" data-action="normal">
        <span class="ob-new-badge">NEW</span><strong>いつものおつかい</strong><span>難易度を選んで、3ラウンド遊びます。</span>
      </button>
      <button type="button" class="ob-mode-card" data-action="daily"><strong>今日のおつかい</strong><span>今日だけの問題に、何度でも挑戦できます。</span></button>
    </div>
    <div class="ob-actions-row">
      <button type="button" class="ob-button ob-button-quiet ob-small-button" data-action="tutorial">遊び方を見る</button>
    </div>
    <p class="ob-caption">音とプレイ履歴の保存は設定で選べます。履歴はこの端末の中だけに保存します。</p>`;
  return shell({
    scene: 'town',
    artCopy: '<span class="ob-kicker">KAMOSHIDA STREET</span><h1>おつかい日和</h1><p>小さな街で、今日もちょっといい一日。</p>',
    character: './games/otsukai/assets/character-minori-neutral-v2.png',
    content,
  });
}

function renderTutorial() {
  const content = `<h1>遊び方</h1>
    <p class="ob-lead">3つの場面を、ゆっくり進みます。</p>
    <div class="ob-info-grid">
      <article class="ob-info-card"><span class="ob-step-number">1</span><h3>メモを覚える</h3><p class="ob-caption">お願いされた商品を、絵と名前で確認します。</p></article>
      <article class="ob-info-card"><span class="ob-step-number">2</span><h3>寄り道をする</h3><p class="ob-caption">通りの看板から、言われた形を探します。</p></article>
      <article class="ob-info-card"><span class="ob-step-number">3</span><h3>売り場で選ぶ</h3><p class="ob-caption">覚えた商品をかごに入れて、お会計します。</p></article>
    </div>
    <div class="ob-actions"><button type="button" class="ob-button ob-button-primary" data-action="tutorial-start">さっそく出発</button><button type="button" class="ob-button ob-button-quiet" data-action="tutorial-skip">あとで見る</button></div>`;
  return shell({ scene: 'town', character: './games/otsukai/assets/character-minori-encourage-v2.png', content, single: true });
}

function renderDifficulty() {
  const cards = Object.values(DIFFICULTIES).map((item) => `<button type="button" class="ob-difficulty-card" data-action="difficulty" data-difficulty="${item.id}" aria-pressed="${state.difficulty === item.id}"><strong>${item.label}</strong><span class="ob-count">${item.count}品 / ${item.shelfSize}品</span><span>${item.description}</span></button>`).join('');
  const content = `<span class="ob-kicker">通常のおつかい</span><h1>難易度を選ぶ</h1><p class="ob-lead">今の気分に合うコースを選んでください。</p><div class="ob-difficulty-grid">${cards}</div><div class="ob-actions"><button type="button" class="ob-button ob-button-primary" data-action="start-normal">出発する</button></div>`;
  return shell({ scene: 'street', character: './games/otsukai/assets/character-minori-encourage-v2.png', content, single: true });
}

function renderMemo() {
  const plan = state.roundPlans[state.roundIndex];
  const items = plan.memoOrder.map((id) => {
    const item = product(id);
    return `<div class="ob-memo-item">${productImage(item)}<span>${escapeHtml(item.label)}</span></div>`;
  }).join('');
  const content = `${progress()}<div class="ob-character-line"><img src="./games/otsukai/assets/character-minori-neutral-v2.png" alt="みのりさん" width="160" height="220"><p class="ob-speech">${escapeHtml(ROUND_MESSAGES[state.roundIndex])}</p></div><div class="ob-memo"><div class="ob-memo-label">おつかいメモ</div><div class="ob-memo-grid">${items}</div></div><div class="ob-actions"><button type="button" class="ob-button ob-button-primary" data-action="remember">覚えた！次へ</button></div><p class="ob-caption">確認できたら、好きなタイミングで次へ進めます。</p>`;
  return shell({ scene: 'town', content, inGame: true });
}

function signClass(name) {
  return { '星': 'star', '葉': 'leaf', '花': 'flower', '丸': 'circle', '月': 'moon', '家': 'house' }[name] || 'circle';
}

function renderDetour() {
  const plan = state.roundPlans[state.roundIndex];
  const options = plan.signOptions.map((name) => `<button type="button" class="ob-sign-button${state.detourWrongAnswer === name ? ' is-wrong' : ''}${state.detourHelpVisible && name === plan.signAnswer ? ' is-answer' : ''}" data-action="sign" data-sign="${escapeHtml(name)}" aria-label="${escapeHtml(name)}の看板"><span class="ob-sign-shape ${signClass(name)}" aria-hidden="true"></span><span>${escapeHtml(name)}</span></button>`).join('');
  const feedbackClass = state.detourCorrect ? 'is-good' : state.detourWrongAnswer ? 'is-error' : '';
  const feedback = state.detourMessage || (state.detourHelpVisible ? '正解の看板が少し見つけやすくなっています。' : 'ゆっくり探してね。');
  const content = `${progress()}<h1>看板を見つけよう</h1><p class="ob-lead">通りにある「${escapeHtml(plan.signAnswer)}」の看板はどれ？</p><div class="ob-sign-intro"><span class="ob-sign-target">形と名前を見比べて選びます</span><span aria-hidden="true" class="ob-sign-shape ${signClass(plan.signAnswer)}"></span></div><div class="ob-sign-board-grid">${options}</div><p class="ob-feedback ${feedbackClass}" role="status">${escapeHtml(feedback)}</p>`;
  return shell({ scene: 'street', content, inGame: true });
}

function renderChange() {
  const plan = state.roundPlans[state.roundIndex];
  const from = product(plan.changedFromId);
  const to = product(plan.changedToId);
  const content = `${progress()}<span class="ob-kicker">お願いの変更</span><h1>変更を覚えよう</h1><p class="ob-lead">みのりさんから、新しいお願いです。</p><p class="ob-note-text">${escapeHtml(from.label)}はもう大丈夫。代わりに${escapeHtml(to.label)}をお願いね。</p><div class="ob-change-card"><div class="ob-change-item"><small>取り消し</small>${productImage(from)}<strong>${escapeHtml(from.label)}</strong></div><div class="ob-change-arrow" aria-hidden="true">→</div><div class="ob-change-item is-add"><small>追加</small>${productImage(to)}<strong>${escapeHtml(to.label)}</strong></div></div><div class="ob-actions"><button type="button" class="ob-button ob-button-primary" data-action="change-ack">変更を覚えた</button></div><p class="ob-caption">売り場では、変更後のメモが正解になります。</p>`;
  return shell({ scene: 'store', character: './games/otsukai/assets/character-minori-encourage-v2.png', content, inGame: true });
}

function renderShelf() {
  const plan = state.roundPlans[state.roundIndex];
  const targetCount = plan.targetIds.length;
  const cards = plan.shelfIds.map((id) => {
    const item = product(id);
    const selected = state.selectedIds.includes(id);
    return `<button type="button" class="ob-product-card" data-product="${escapeHtml(id)}" aria-pressed="${selected}" aria-label="${escapeHtml(item.label)}${selected ? '、選択中' : ''}">${productImage(item)}<strong>${escapeHtml(item.label)}</strong></button>`;
  }).join('');
  const message = state.shelfMessage || '商品をタップすると、かごに入ります。';
  const content = `${progress()}<h1>頼まれた商品を選ぼう</h1><p class="ob-lead">メモを思い出しながら、${targetCount}品をかごに入れてください。</p><div class="ob-shelf-wrap"><div class="ob-product-grid">${cards}</div></div><button type="button" class="ob-hint-link" data-action="hint">メモを確認</button><p class="ob-feedback" role="status">${escapeHtml(message)}</p><div class="ob-cart-bar"><span class="ob-cart-count">かご <strong>${state.selectedIds.length}</strong> / ${targetCount}</span><button type="button" class="ob-button ob-button-primary" data-action="checkout" ${state.selectedIds.length === targetCount ? '' : 'disabled'}>レジへ</button></div>`;
  return shell({ scene: 'store', content, inGame: true });
}

function renderRoundResult() {
  const result = state.roundResults[state.roundResults.length - 1];
  const targetSet = new Set(result.targetIds);
  const selectedSet = new Set(result.selectedIds);
  const items = result.targetIds.map((id) => {
    const item = product(id);
    const correct = selectedSet.has(id);
    return `<div class="ob-result-item ${correct ? 'is-correct' : 'is-missed'}">${productImage(item)}<strong>${escapeHtml(item.label)}</strong><small>${correct ? 'かごに入りました' : '次回も確認'}</small></div>`;
  }).join('');
  const extras = result.selectedIds.filter((id) => !targetSet.has(id)).map((id) => product(id)?.label).filter(Boolean);
  const extraText = extras.length ? `<p class="ob-extra-list">今回かごに入った商品：${escapeHtml(extras.join('、'))}</p>` : '';
  const resultCharacter = result.correctCount === result.targetCount ? 'happy' : 'encourage';
  const content = `${progress()}<div class="ob-character-line"><img src="./games/otsukai/assets/character-minori-${resultCharacter}-v2.png" alt="みのりさん" width="160" height="220"><p class="ob-speech">${escapeHtml(ENCOURAGEMENTS[state.roundIndex])}</p></div><h1>ラウンド結果</h1><p class="ob-note-text">買えた ${result.correctCount} / ${result.targetCount} 品</p><div class="ob-round-result" aria-live="polite"><strong>今回のメモ</strong><div class="ob-result-items">${items}</div>${extraText}</div>${result.hintUsed ? '<p class="ob-caption">メモを見ながら挑戦しました。</p>' : ''}<div class="ob-actions"><button type="button" class="ob-button ob-button-primary" data-action="next-round">${state.roundIndex === 2 ? '結果を見る' : '次のおつかい'}</button></div>`;
  return shell({ scene: state.roundIndex === 2 ? 'street' : 'town', content, inGame: true });
}

function renderFinal() {
  const final = scoreFinal(state.roundResults);
  const stars = starsForScore(final.totalScore);
  const title = titleForScore(final.totalScore);
  if (!state.historySaved && state.settings.saveHistory) {
    const session = {
      schemaVersion: 1,
      finishedAt: new Date().toISOString(),
      mode: state.mode,
      difficulty: state.difficulty,
      totalScore: final.totalScore,
      correctCount: final.correctCount,
      totalTargets: final.totalTargets,
      assisted: state.roundResults.some((round) => round.hintUsed),
      rounds: state.roundResults.map((round) => ({
        targetCount: round.targetCount,
        correctCount: round.correctCount,
        initialWrongSelections: round.initialWrongSelections,
        distractorMistakes: round.distractorMistakes,
        hintUsed: round.hintUsed,
        memorizationDurationMs: round.memorizationDurationMs,
        activeShoppingDurationMs: round.activeShoppingDurationMs,
        changeApplied: round.changeApplied,
      })),
    };
    state.historySaved = appendHistory(session);
    storageAvailable = storageAvailable && state.historySaved;
  }
  const starText = Array.from({ length: 3 }, (_, index) => `<span aria-hidden="true" class="${index < stars ? '' : 'ob-muted-star'}">★</span>`).join('');
  const content = `<span class="ob-kicker">3ラウンド完了</span><h1>${title}</h1><div class="ob-final-score" aria-live="polite"><div class="ob-stars" aria-label="星${stars}つ">${starText}</div><div class="ob-score-number">${final.totalScore}<small> / 100</small></div><p>正答 ${final.correctCount} / 総数 ${final.totalTargets}</p></div><p class="ob-lead">${state.mode === 'daily' ? '今日のおつかいを最後まで遊びました。' : '商店街のおつかいを最後まで遊びました。'}</p><div class="ob-actions"><button type="button" class="ob-button ob-button-primary" data-action="retry">もう一度おつかい</button><button type="button" class="ob-button ob-button-secondary" data-action="title">タイトルへ</button><button type="button" class="ob-button ob-button-quiet" data-action="go-list">ゲーム一覧へ</button></div><p class="ob-medical-note">ゲームの結果は医療的な検査ではありません。</p>`;
  return shell({ scene: 'street', character: './games/otsukai/assets/character-minori-happy-v2.png', content, single: true });
}

function renderModal() {
  if (!state.modal) return '';
  if (state.modal === 'checkout') {
    const names = state.selectedIds.map((id) => product(id)).filter(Boolean).map((item) => `<li>${productImage(item)}<span>${escapeHtml(item.label)}</span></li>`).join('');
    return `<div class="ob-modal-backdrop" data-action="backdrop"><div class="ob-modal" role="dialog" aria-modal="true" aria-labelledby="checkout-title"><h2 id="checkout-title">この商品でお会計しますか？</h2><p>かごの中を確認して、決定してください。</p><ul class="ob-modal-list">${names}</ul><div class="ob-actions-row"><button type="button" class="ob-button ob-button-quiet" data-action="close-modal">見直す</button><button type="button" class="ob-button ob-button-primary" data-action="checkout-confirm">これで決定</button></div></div></div>`;
  }
  if (state.modal === 'hint') {
    const plan = state.roundPlans[state.roundIndex];
    const names = plan.targetIds.map((id) => product(id)).filter(Boolean).map((item) => `<li>${productImage(item)}<span>${escapeHtml(item.label)}</span></li>`).join('');
    return `<div class="ob-modal-backdrop" data-action="backdrop"><div class="ob-modal" role="dialog" aria-modal="true" aria-labelledby="hint-title"><h2 id="hint-title">メモを確認</h2><p>このラウンドのお願いは次の${plan.targetIds.length}品です。</p><ul class="ob-modal-list">${names}</ul><div class="ob-actions-row"><button type="button" class="ob-button ob-button-primary" data-action="close-modal">売り場へ戻る</button></div></div></div>`;
  }
  if (state.modal === 'quit') {
    return `<div class="ob-modal-backdrop" data-action="backdrop"><div class="ob-modal" role="dialog" aria-modal="true" aria-labelledby="quit-title"><h2 id="quit-title">おつかいを中断しますか？</h2><p>中断すると、今回の進行は失われます。</p><div class="ob-actions-row"><button type="button" class="ob-button ob-button-quiet" data-action="close-modal">続ける</button><button type="button" class="ob-button ob-button-warm" data-action="confirm-quit">終了する</button></div></div></div>`;
  }
  const historyCount = readHistory().length;
  const reducedChecked = state.settings.reducedMotion || reducedMotionQuery.matches;
  return `<div class="ob-modal-backdrop" data-action="backdrop"><div class="ob-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title"><h2 id="settings-title">設定</h2><label class="ob-setting"><span><strong>効果音</strong><small>短い音で操作を知らせます。</small></span><input type="checkbox" data-setting="soundEnabled" ${state.settings.soundEnabled ? 'checked' : ''}></label><label class="ob-setting"><span><strong>演出を控えめにする</strong><small>${reducedMotionQuery.matches ? '端末の設定により控えめになっています。' : '動きが少ない表示にします。'}</small></span><input type="checkbox" data-setting="reducedMotion" ${reducedChecked ? 'checked' : ''}></label><label class="ob-setting"><span><strong>プレイ履歴をこの端末に保存</strong><small>初期設定はOFF。最大30件、外部には送信しません。</small></span><input type="checkbox" data-setting="saveHistory" ${state.settings.saveHistory ? 'checked' : ''}></label>${storageAvailable ? `<p class="ob-caption">保存中の履歴：${historyCount}件</p>` : '<p class="ob-storage-warning">記録の保存は使えませんが、ゲームは遊べます。</p>'}<div class="ob-actions-row"><button type="button" class="ob-button ob-button-quiet" data-action="clear-history">記録をすべて削除</button><button type="button" class="ob-button ob-button-primary" data-action="close-modal">閉じる</button></div></div></div>`;
}

function render() {
  try {
    let html = '';
    if (state.screen === 'title') html = renderTitle();
    if (state.screen === 'tutorial') html = renderTutorial();
    if (state.screen === 'difficulty') html = renderDifficulty();
    if (state.screen === 'memo') html = renderMemo();
    if (state.screen === 'detour') html = renderDetour();
    if (state.screen === 'change') html = renderChange();
    if (state.screen === 'shelf') html = renderShelf();
    if (state.screen === 'round-result') html = renderRoundResult();
    if (state.screen === 'final') html = renderFinal();
    root.innerHTML = html + renderModal();
    root.dataset.screen = state.screen;
    if (state.modal) {
      const dialog = root.querySelector('[role="dialog"]');
      dialog?.querySelector('button, input')?.focus();
    }
  } catch (error) {
    showError(error);
  }
}

function showError(error) {
  console.error(error);
  root.innerHTML = `<section class="ob-error"><h1>おつかい日和</h1><p>ゲームの準備がうまくいきませんでした。素材を確認して、もう一度お試しください。</p><button type="button" class="ob-button ob-button-primary" data-action="reload">再試行</button><p class="ob-caption">時間制限や記録保存の設定には影響しません。</p></section>`;
}

function saveCurrentSettings() {
  storageAvailable = writeSettings(state.settings);
}

function startEntry(mode) {
  playSound();
  if (!state.settings.tutorialSeen) {
    state.pendingMode = mode;
    state.screen = 'tutorial';
    render();
    return;
  }
  if (mode === 'daily') startSession('daily', 'usual');
  else { state.screen = 'difficulty'; render(); }
}

function startSession(mode, difficulty) {
  clearAdvanceTimer();
  const dateKey = mode === 'daily' ? tokyoDateKey() : null;
  if (mode === 'daily' && !dateKey) {
    state.screen = 'title';
    state.modal = 'settings';
    render();
    return;
  }
  state.mode = mode;
  state.difficulty = difficulty;
  state.dailyDate = dateKey;
  state.seed = mode === 'daily' ? dailySeed(dateKey) : randomSeed();
  state.roundPlans = mode === 'daily' ? generateDailyRounds(dateKey, PRODUCTS) : generateRounds(state.seed, difficulty, PRODUCTS, mode);
  state.roundIndex = 0;
  state.roundResults = [];
  state.historySaved = false;
  state.screen = 'memo';
  state.settings = { ...state.settings, lastDifficulty: difficulty };
  saveCurrentSettings();
  resetRound();
  render();
}

function resetRound() {
  state.selectedIds = [];
  state.hintUsed = false;
  state.distractorMistakes = 0;
  state.firstSelectionIds = [];
  state.detourCorrect = false;
  state.detourWrongAnswer = null;
  state.detourHelpVisible = false;
  state.detourMessage = '';
  state.shelfMessage = '';
  state.memoStartedAt = Date.now();
  state.shoppingStartedAt = 0;
}

function clearAdvanceTimer() {
  if (advanceTimer) window.clearTimeout(advanceTimer);
  advanceTimer = null;
}

function scheduleAdvance() {
  clearAdvanceTimer();
  advanceTimer = window.setTimeout(() => {
    advanceTimer = null;
    if (!state.detourCorrect) return;
    const plan = state.roundPlans[state.roundIndex];
    state.screen = plan.changedFromId ? 'change' : 'shelf';
    if (state.screen === 'shelf') state.shoppingStartedAt = Date.now();
    render();
  }, motionReduced() ? 30 : 470);
}

function submitRound() {
  const plan = state.roundPlans[state.roundIndex];
  if (state.selectedIds.length !== plan.targetIds.length) return;
  const result = scoreRound(state.selectedIds, plan.targetIds);
  state.roundResults.push({
    ...result,
    targetIds: [...plan.targetIds],
    selectedIds: [...state.selectedIds],
    initialWrongSelections: state.firstSelectionIds.filter((id) => !plan.targetIds.includes(id)).length,
    distractorMistakes: state.distractorMistakes,
    hintUsed: state.hintUsed,
    memorizationDurationMs: Math.max(0, Date.now() - state.memoStartedAt),
    activeShoppingDurationMs: Math.max(0, Date.now() - state.shoppingStartedAt),
    changeApplied: Boolean(plan.changedFromId),
  });
  state.modal = null;
  state.screen = 'round-result';
  playSound(result.correctCount === result.targetCount ? 'success' : 'tap');
  render();
}

function leaveToList() {
  clearAdvanceTimer();
  if (typeof window.transitionNavigate === 'function') window.transitionNavigate('friend-game-main.html');
  else window.location.href = 'friend-game-main.html';
}

function handleSettingChange(input) {
  const key = input.dataset.setting;
  if (!key) return;
  state.settings = { ...state.settings, [key]: input.checked };
  saveCurrentSettings();
  if (key === 'soundEnabled' && input.checked) playSound();
  render();
}

function handleClick(event) {
  const actionNode = event.target.closest('[data-action]');
  const productNode = event.target.closest('[data-product]');
  if (productNode) {
    if (state.screen !== 'shelf' || state.modal) return;
    const id = productNode.dataset.product;
    const plan = state.roundPlans[state.roundIndex];
    if (state.selectedIds.includes(id)) {
      state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id);
      state.shelfMessage = 'かごから戻しました。';
      playSound('tap');
    } else if (state.selectedIds.length >= plan.targetIds.length) {
      state.shelfMessage = '先にかごの商品を戻してね。';
      playSound('tap');
    } else {
      state.selectedIds = [...state.selectedIds, id];
      if (!state.firstSelectionIds.includes(id)) state.firstSelectionIds.push(id);
      state.shelfMessage = 'かごに入れました。';
      playSound('select');
    }
    render();
    return;
  }
  if (!actionNode) return;
  const action = actionNode.dataset.action;
  if (action === 'backdrop') {
    if (event.target === actionNode) { state.modal = null; render(); }
    return;
  }
  event.preventDefault();
  if (action === 'normal') return startEntry('normal');
  if (action === 'daily') return startEntry('daily');
  if (action === 'tutorial') { state.pendingMode = null; state.screen = 'tutorial'; render(); return; }
  if (action === 'tutorial-skip' || action === 'tutorial-start') {
    state.settings = { ...state.settings, tutorialSeen: true };
    saveCurrentSettings();
    if (action === 'tutorial-skip' && !state.pendingMode) state.screen = 'title';
    else if (state.pendingMode === 'daily') startSession('daily', 'usual');
    else if (state.pendingMode === 'normal') { state.screen = 'difficulty'; render(); }
    else state.screen = 'title';
    state.pendingMode = null;
    if (state.screen !== 'memo') render();
    return;
  }
  if (action === 'difficulty') { state.difficulty = actionNode.dataset.difficulty; render(); return; }
  if (action === 'start-normal') { startSession('normal', state.difficulty); return; }
  if (action === 'remember') { state.screen = 'detour'; render(); return; }
  if (action === 'sign') {
    const plan = state.roundPlans[state.roundIndex];
    if (state.detourCorrect) return;
    if (actionNode.dataset.sign === plan.signAnswer) {
      state.detourCorrect = true;
      state.detourMessage = '見つかりました。いい寄り道でした。';
      playSound('success');
      render();
      scheduleAdvance();
    } else {
      state.distractorMistakes += 1;
      state.detourWrongAnswer = actionNode.dataset.sign;
      state.detourMessage = 'もう一度、形と名前を見比べてみよう。';
      if (state.distractorMistakes >= 2) state.detourHelpVisible = true;
      render();
    }
    return;
  }
  if (action === 'change-ack') { state.screen = 'shelf'; state.shoppingStartedAt = Date.now(); render(); return; }
  if (action === 'hint') { state.hintUsed = true; state.modal = 'hint'; render(); return; }
  if (action === 'checkout') { if (state.selectedIds.length === state.roundPlans[state.roundIndex].targetIds.length) { state.modal = 'checkout'; render(); } return; }
  if (action === 'checkout-confirm') { submitRound(); return; }
  if (action === 'next-round') { if (state.roundIndex === 2) { state.screen = 'final'; render(); } else { state.roundIndex += 1; state.screen = 'memo'; resetRound(); render(); } return; }
  if (action === 'retry') { startSession(state.mode, state.mode === 'daily' ? 'usual' : state.difficulty); return; }
  if (action === 'title') { clearAdvanceTimer(); state.modal = null; state.screen = 'title'; render(); return; }
  if (action === 'go-list') { leaveToList(); return; }
  if (action === 'request-list') { state.modal = 'quit'; render(); return; }
  if (action === 'confirm-quit') { leaveToList(); return; }
  if (action === 'settings') { state.modal = 'settings'; render(); return; }
  if (action === 'close-modal') { state.modal = null; render(); return; }
  if (action === 'toggle-sound') { state.settings = { ...state.settings, soundEnabled: !state.settings.soundEnabled }; saveCurrentSettings(); playSound(); render(); return; }
  if (action === 'clear-history') { clearHistory(); render(); return; }
  if (action === 'reload') { window.location.reload(); }
}

function handleChange(event) {
  if (event.target.matches('[data-setting]')) handleSettingChange(event.target);
}

function handleKeydown(event) {
  if (event.key === 'Escape' && state.modal) { state.modal = null; render(); }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) clearAdvanceTimer();
  else if (state.screen === 'detour' && state.detourCorrect) scheduleAdvance();
});
reducedMotionQuery.addEventListener?.('change', () => { if (state.modal === 'settings') render(); });
root.addEventListener('click', handleClick);
root.addEventListener('change', handleChange);
document.addEventListener('keydown', handleKeydown);

render();
