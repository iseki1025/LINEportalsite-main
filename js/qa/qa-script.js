/**
 * Q&A Search Script (Multi-Section Support)
 * Works with pages that have multiple .qa-search-section elements
 * or pages where the Q&A section is inside a tab.
 */
document.addEventListener('DOMContentLoaded', () => {
    const qaSections = document.querySelectorAll('.qa-search-section');

    if (qaSections.length === 0) {
        console.warn('No .qa-search-section found on this page.');
        return;
    }

    // Initialize each Q&A section independently
    qaSections.forEach(section => {
        initQASection(section);
    });

    function initQASection(section) {
        const searchInput = section.querySelector('.qa-search-input');
        const resultsContainer = section.querySelector('.qa-results-container');
        const categoryFilter = section.dataset.category || null;
        let qaData = [];

        if (!searchInput || !resultsContainer) {
            console.warn('Missing input or results container in section:', section);
            return;
        }

        loadQAData();

        function showInitialMessage(message = '検索したい文字を上の枠に入力してください') {
            resultsContainer.innerHTML = `<p class="qa-initial-message">${message}</p>`;
        }

        function kataToHira(str) {
            if (!str) return '';
            return str.replace(/[\u30a1-\u30f6]/g, match => String.fromCharCode(match.charCodeAt(0) - 0x60));
        }

        function normalizeText(text) {
            if (!text) return '';
            return kataToHira(String(text).toLowerCase());
        }

        function appendCacheBuster(url) {
            const separator = url.includes('?') ? '&' : '?';
            return `${url}${separator}t=${new Date().getTime()}`;
        }

        function loadQAData() {
            showInitialMessage('Q&Aデータを読み込んでいます...');

            // まず直接CSVファイルの読み込みを試みる（自動反映用）
            const urls = window.QA_SOURCE_URLS || {};
            const csvFilePath = appendCacheBuster(urls.remoteCsvUrl || urls.localCsvUrl || 'files/data/qa-data.csv');

            Papa.parse(csvFilePath, {
                download: true,
                header: true,
                skipEmptyLines: true,
                transformHeader: header => header.trim(),
                complete: (results) => handleParseResults(results),
                error: (err) => {
                    console.warn('CSV直接読み込み失敗（ローカル環境など）。埋め込みデータを使用します。', err);

                    // フォールバック: 直接読み込めない場合（CORS等）は、ファイルに埋め込まれたデータを利用
                    if (typeof QA_CSV_CONTENT !== 'undefined' && QA_CSV_CONTENT) {
                        parseCSV(QA_CSV_CONTENT);
                    } else {
                        showInitialMessage('エラー: Q&Aデータの読み込みに失敗しました。');
                    }
                }
            });
        }

        function parseCSV(csvContent) {
            Papa.parse(csvContent, {
                header: true,
                skipEmptyLines: true,
                transformHeader: header => header.trim(),
                complete: (results) => handleParseResults(results),
                error: (err) => {
                    console.error('Embedded CSV Parse Error:', err);
                    showInitialMessage('エラー: データの解析に失敗しました。');
                }
            });
        }

        function handleParseResults(results) {
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
                    question: questionText,
                    answer: answerText,
                    normalizedText: normalizeText(questionText + ' ' + answerText),
                    categories: [
                        row['Category'],
                        row['Category'] ? row['Category'].replace(/\s+/g, '') : '',
                        row['大項目'],
                        row['中項目']
                    ]
                };
            }).filter(item => {
                if (!item.question || !item.answer) return false;

                if (categoryFilter && categoryFilter !== 'all') {
                    const hasCategory = item.categories.some(val => val && val.includes(categoryFilter));
                    if (!hasCategory) return false;
                }
                return true;
            });

            console.log(`✅ Q&A Loaded: Category "${categoryFilter || 'All'}" (${qaData.length} items)`);

            // カテゴリ指定がある場合は最初から全件表示、なければ初期メッセージ
            if (categoryFilter && categoryFilter !== 'all') {
                displayResults(qaData);
            } else {
                showInitialMessage();
            }
        }

        // Format answer text with auto-links (URL & Specific Keywords)
        function formatAnswerText(text) {
            if (!text) return '';

            // 1. 安全のための文字エスケープ (XSS対策)
            let formatted = text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            // 2. 任意の http(s):// URL を見つけてリンク化する
            const urlRegex = /(https?:\/\/[^\s()（）<>]+)/g;
            formatted = formatted.replace(urlRegex, function (url) {
                return `<a href="${url}" target="_blank" style="color:var(--color-primary); text-decoration:underline; font-weight:bold; word-break:break-all;">${url}</a>`;
            });

            // 3. "ホームページ" または "HP" という単語をリンク化
            const targetUrl = 'https://kajimoto-clinic.com/';
            const linkHtml = `<a href="${targetUrl}" target="_blank" style="color:var(--color-primary); text-decoration:underline; font-weight:bold;">$1</a>`;

            formatted = formatted
                .replace(/(ホームページ)/g, linkHtml)
                .replace(/(HP(?![A-Za-z]))/g, linkHtml);

            // 4. 改行を画面に反映させるために <br> タグに変換
            formatted = formatted.replace(/\n/g, '<br>');

            return formatted;
        }

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
                // Add flexible layout for text and arrow
                questionDiv.style.display = 'flex';
                questionDiv.style.justifyContent = 'space-between';
                questionDiv.style.alignItems = 'center';
                questionDiv.innerHTML = `<span>${item.question}</span><span style="opacity:0.5; font-size:0.8rem;">▼</span>`;

                const answerDiv = document.createElement('div');
                answerDiv.className = 'qa-search-answer';
                // Use formatAnswerText instead of just replacing newlines
                answerDiv.innerHTML = formatAnswerText(item.answer);
                qaItem.appendChild(questionDiv);
                qaItem.appendChild(answerDiv);
                fragment.appendChild(qaItem);
                questionDiv.addEventListener('click', () => {
                    qaItem.classList.toggle('active');
                });
            });
            resultsContainer.appendChild(fragment);
        }

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            if (!query) {
                // キーワードが空になった場合、カテゴリ指定があれば全件表示に戻す
                if (categoryFilter && categoryFilter !== 'all') {
                    displayResults(qaData);
                } else {
                    showInitialMessage();
                }
                return;
            }

            const searchKeywords = query.split(/\s+/)
                .filter(keyword => keyword)
                .map(keyword => normalizeText(keyword));

            const filteredData = qaData.filter(item => {
                return searchKeywords.every(keyword => item.normalizedText.includes(keyword));
            });

            displayResults(filteredData);
        });
    }
});
