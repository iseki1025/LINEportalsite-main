import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, getDocs, query, orderBy, where } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { firebaseConfig } from '../firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', async () => {
    // ページ内のすべての Q&A セクションを取得 (.qa-search-section)
    const qaSections = document.querySelectorAll('.qa-search-section');

    for (const section of qaSections) {
        // セクション内の要素を取得
        const searchInput = section.querySelector('.qa-search-input');
        const resultsContainer = section.querySelector('.qa-results-container');

        // HTMLの data属性 から設定を読み込む
        const categoryFilter = section.dataset.category; // data-category="栄養" など

        let qaData = []; // 読み込んだデータを格納する変数

        // 初期メッセージ表示関数
        function showInitialMessage(message = '検索したい文字を上の枠に入力してください') {
            resultsContainer.innerHTML = `<p class="qa-initial-message">${message}</p>`;
        }

        // 文字の正規化（カタカナ→ひらがな、小文字化）
        function kataToHira(str) {
            if (!str) return '';
            return str.replace(/[\u30a1-\u30f6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60));
        }

        function normalizeText(text) {
            if (!text) return '';
            return kataToHira(String(text).toLowerCase());
        }

        // Firestore読み込み処理
        async function loadQAData() {
            showInitialMessage('Q&Aデータを読み込んでいます...');

            try {
                let q = collection(db, 'qa');
                if (categoryFilter) {
                    q = query(q, where('category', '==', categoryFilter), orderBy('createdAt', 'desc'));
                } else {
                    q = query(q, orderBy('createdAt', 'desc'));
                }

                const snapshot = await getDocs(q);
                qaData = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        question: data.question,
                        answer: data.answer,
                        category: data.category,
                        normalizedText: normalizeText(data.question + ' ' + data.answer)
                    };
                });

                console.log(`✅ 読み込み完了: ${categoryFilter || '全カテゴリ'} (${qaData.length}件)`);
                showInitialMessage(); // 準備完了メッセージ
            } catch (err) {
                showInitialMessage('エラー: Q&Aデータの読み込みに失敗しました。');
                console.error('Firestore Load Error:', err);
            }
        }

        // 結果表示関数
        function displayResults(data) {
            resultsContainer.innerHTML = ''; // クリア

            if (data.length === 0) {
                resultsContainer.innerHTML = '<p class="qa-no-result">該当する質問はありません。</p>';
                return;
            }

            const fragment = document.createDocumentFragment();
            data.forEach(item => {
                const qaItem = document.createElement('div');
                qaItem.className = 'qa-search-item';

                const questionDiv = document.createElement('div');
                questionDiv.className = 'qa-search-question';
                questionDiv.textContent = item.question;

                const answerDiv = document.createElement('div');
                answerDiv.className = 'qa-search-answer';
                answerDiv.innerHTML = (item.answer || '').replace(/\n/g, '<br>');

                qaItem.appendChild(questionDiv);
                qaItem.appendChild(answerDiv);
                fragment.appendChild(qaItem);

                // クリックでアコーディオン開閉
                questionDiv.addEventListener('click', () => {
                    qaItem.classList.toggle('active');
                });
            });
            resultsContainer.appendChild(fragment);
        }

        // 検索ボックスの入力イベント
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const queryStr = e.target.value.trim();

                if (!queryStr) {
                    showInitialMessage();
                    return;
                }

                const searchKeywords = queryStr.split(/\s+/).filter(k => k).map(k => normalizeText(k));

                const filteredData = qaData.filter(item => {
                    return searchKeywords.every(keyword => item.normalizedText.includes(keyword));
                });

                displayResults(filteredData);
            });
        }

        // データ読み込み開始
        await loadQAData();
    }
});