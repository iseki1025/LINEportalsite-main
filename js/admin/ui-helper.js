/**
 * ローディング表示
 * @param {HTMLElement} container - 表示先要素
 */
export function showLoading(container) {
    container.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>読み込み中...</p>
    </div>
  `;
}

/**
 * エラーメッセージ表示
 * @param {HTMLElement} container - 表示先要素
 * @param {string} message - エラーメッセージ
 */
export function showError(container, message) {
    container.innerHTML = `
    <div class="error-container">
      <p class="error-message">❌ ${message}</p>
    </div>
  `;
}

/**
 * 成功メッセージ表示（トースト通知）
 * @param {string} message - 成功メッセージ
 */
export function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-success';
    toast.textContent = `✅ ${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * 確認ダイアログ
 * @param {string} message - 確認メッセージ
 * @returns {boolean}
 */
export function confirmAction(message) {
    return confirm(message);
}
