document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.qa-search-input');
    const resultsContainer = document.querySelector('.qa-results-container');
    let qaData = [];

    // --- メインの処理を開始 ---
    loadQAData();

    // メッセージを表示する関数
    function showInitialMessage(message = '検索したい文字を上の枠に入力してください') {
        resultsContainer.innerHTML = `<p class="qa-initial-message">${message}</p>`;
    }

    // カタカナをひらがなに変換する関数
    function kataToHira(str) {
        if (!str) return '';
        return str.replace(/[\u30a1-\u30f6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60));
    }

    // テキストを正規化する（小文字のひらがなにする）
    function normalizeText(text) {
        if (!text) return '';
        return kataToHira(String(text).toLowerCase());
    }

    // CSVファイルを読み込んで解析する関数
    function loadQAData() {
        showInitialMessage('Q&Aデータを読み込んでいます...');
        const csvFilePath = `files/data/qa-data.csv?t=${new Date().getTime()}`;

        Papa.parse(csvFilePath, {
            download: true,
            header: true,
            skipEmptyLines: true,
            transformHeader: header => header.trim(),
            complete: (results) => {
                if (results.errors.length > 0 && results.data.length === 0) {
                    console.error('CSV Parse Error:', results.errors);
                    showInitialMessage('エラー: Q&Aデータの読み込みに失敗しました。');
                    return;
                }

                const questionHeader = 'Question';
                const answerHeader = 'Answer';

                if (!results.meta.fields.includes(questionHeader) || !results.meta.fields.includes(answerHeader)) {
                    showInitialMessage(`エラー: CSVに「${questionHeader}」または「${answerHeader}」列が見つかりません。`);
                    return;
                }

                qaData = results.data.map(row => {
                    const questionText = String(row[questionHeader] || '').trim();
                    const answerText = String(row[answerHeader] || '').trim();
                    return {
                        question: questionText, // 表示用に元のテキストを保持
                        answer: answerText,     // 表示用に元のテキストを保持
                        // 検索用に、質問と回答を結合して正規化したテキストを用意
                        normalizedText: normalizeText(questionText + ' ' + answerText)
                    };
                }).filter(item => item.question && item.answer);

                console.log("✅ Q&Aデータの読み込みが完了しました。");
                showInitialMessage(); // 準備完了後、初期メッセージを表示
            },
            error: (err) => {
                showInitialMessage('エラー: Q&Aデータの読み込みに失敗しました。');
                console.error('CSV Load Error:', err);
            }
        });
    }

    // 検索結果を表示する関数 (変更なし)
    function displayResults(data) {
        resultsContainer.innerHTML = '';
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
            answerDiv.innerHTML = item.answer.replace(/\n/g, '<br>');
            qaItem.appendChild(questionDiv);
            qaItem.appendChild(answerDiv);
            fragment.appendChild(qaItem);
            questionDiv.addEventListener('click', () => {
                qaItem.classList.toggle('active');
            });
        });
        resultsContainer.appendChild(fragment);
    }

    // 検索ボックスに入力があった時のイベント
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        if (!query) {
            showInitialMessage();
            return;
        }

        // 検索キーワードも正規化する
        const searchKeywords = query.split(/\s+/)
            .filter(keyword => keyword)
            .map(keyword => normalizeText(keyword));

        const filteredData = qaData.filter(item => {
            // 全てのキーワードが、正規化されたテキストに含まれているかチェック
            return searchKeywords.every(keyword => item.normalizedText.includes(keyword));
        });

        displayResults(filteredData);
    });
});