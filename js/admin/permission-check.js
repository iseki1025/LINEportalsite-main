import { getCurrentUser } from './auth-guard.js';

/**
 * 特定の権限を持っているかチェック
 * @param {string} permission - 権限キー（'qa', 'dialysisStatus', 'recipes'）
 * @returns {Promise<boolean>}
 */
export async function hasPermission(permission) {
    const user = await getCurrentUser();
    if (!user) return false;

    // システム管理者は全権限を持つ
    if (user.role === 'admin') {
        return true;
    }

    // 編集者は個別権限をチェック
    return user.permissions && user.permissions[permission] === true;
}

/**
 * 権限がない場合、エラー表示してダッシュボードへ戻す
 * @param {string} permission - 権限キー
 */
export async function requirePermission(permission) {
    const permitted = await hasPermission(permission);

    if (!permitted) {
        alert('この機能を使用する権限がありません。');
        window.location.href = 'admin-dashboard.html';
    }
}
