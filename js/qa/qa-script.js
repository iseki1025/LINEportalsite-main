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

        function loadQAData() {
            showInitialMessage('Q&Aデータを読み込んでいます...');

            // Check for embedded data (Offline/File Protocol support)
            if (typeof QA_CSV_CONTENT !== 'undefined') {
                parseCSV(QA_CSV_CONTENT);
                return;
            }

            const csvFilePath = `files/data/qa-data.csv?t=${new Date().getTime()}`;

            Papa.parse(csvFilePath, {
                download: true,
                header: true,
                skipEmptyLines: true,
                transformHeader: header => header.trim(),
                complete: (results) => handleParseResults(results),
                error: (err) => {
                    showInitialMessage('エラー: Q&Aデータの読み込みに失敗しました。');
                    console.error('CSV Load Error:', err);
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

                if (categoryFilter) {
                    const hasCategory = item.categories.some(val => val && val.includes(categoryFilter));
                    if (!hasCategory) return false;
                }
                return true;
            });

            console.log(`✅ Q&A Loaded: Category "${categoryFilter || 'All'}" (${qaData.length} items)`);
            showInitialMessage();
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

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            if (!query) {
                showInitialMessage();
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