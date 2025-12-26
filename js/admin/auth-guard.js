import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from '../firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';

// Initialize Firebase if not already initialized
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * 現在ログイン中のユーザー情報を取得
 * @returns {Promise<Object>} ユーザー情報（role, permissions含む）
 */
export async function getCurrentUser() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (!user) {
                // 未ログインの場合、ログイン画面へリダイレクト
                if (!window.location.pathname.includes('admin-login.html') && !window.location.pathname.includes('admin-setup.html')) {
                    window.location.href = 'admin-login.html';
                }
                resolve(null);
                return;
            }

            try {
                // Firestoreからユーザー情報取得
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    console.warn('User data not found in Firestore for UID:', user.uid);
                    // ユーザーデータがない場合はログアウトさせてログイン画面へ
                    if (!window.location.pathname.includes('admin-login.html')) {
                        await auth.signOut();
                        window.location.href = 'admin-login.html';
                    }
                    resolve(null);
                    return;
                }

                resolve({ uid: user.uid, email: user.email, ...userDoc.data() });
            } catch (error) {
                console.error('Error fetching user data:', error);
                reject(error);
            }
        });
    });
}

/**
 * ページロード時に認証チェックを実行
 * 全管理画面の冒頭で呼び出す
 */
export async function requireAuth() {
    try {
        const user = await getCurrentUser();
        if (!user && !window.location.pathname.includes('admin-login.html')) {
            // getCurrentUser inside handle redirect if no user
            return null;
        }
        return user;
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
}
