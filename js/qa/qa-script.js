document.addEventListener('DOMContentLoaded', () => {
    const qaSections = document.querySelectorAll('.qa-search-section');
    if (qaSections.length === 0) return;

    qaSections.forEach((section) => initQASection(section));
});

function appendCacheBuster(url) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${Date.now()}`;
}

function stripBom(value) {
    return String(value || '').replace(/^\uFEFF/, '').trim();
}

function kataToHira(text) {
    return String(text || '').replace(/[\u30A1-\u30F6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

function normalizeText(text) {
    return kataToHira(String(text || '').toLowerCase()).replace(/\s+/g, ' ').trim();
}

function normalizeCategoryText(text) {
    return normalizeText(text).replace(/\s+/g, '');
}

function categoryTokenToKeys(token) {
    const cat = normalizeCategoryText(token);
    if (!cat) return [];

    const keys = [];
    if (cat.includes('栄養') || cat.includes('nutrition')) keys.push('nutrition');
    if (cat.includes('シャント') || cat.includes('shunt')) keys.push('shunt');
    if (cat.includes('災害') || cat.includes('disaster')) keys.push('disaster');
    if (cat.includes('検査') || cat.includes('test')) keys.push('test');
    if (cat.includes('透析治療') || cat.includes('treatment')) keys.push('treatment');
    if (cat.includes('移動') || cat.includes('transport')) keys.push('transport');
    if (cat.includes('保険') || cat.includes('費用') || cat.includes('insurance')) keys.push('insurance');
    if (cat.includes('予定') || cat.includes('時間') || cat.includes('schedule')) keys.push('schedule');
    if (cat.includes('生活') || cat.includes('lifestyle')) keys.push('lifestyle');
    return [...new Set(keys)];
}

function getCategoriesFromData(categoryField) {
    const raw = String(categoryField || '');
    const splitTokens = raw
        .split(/[,\u3001\uFF0C/\uFF0F|\n\r;\uFF1B\u30FB]+/)
        .map((part) => part.trim())
        .filter(Boolean);

    const mapped = splitTokens.flatMap((token) => categoryTokenToKeys(token));
    return [...new Set(mapped)];
}

function formatAnswerText(text) {
    if (!text) return '';

    let formatted = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    const urlRegex = /(https?:\/\/[^\s<>"')]+)/g;
    formatted = formatted.replace(
        urlRegex,
        (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary);text-decoration:underline;word-break:break-all;">${url}</a>`
    );

    return formatted.replace(/\n/g, '<br>');
}

function extractRowValue(row, keys) {
    for (const key of keys) {
        if (row[key] === undefined || row[key] === null) continue;
        const value = stripBom(row[key]);
        if (value) return value;
    }
    return '';
}

function parseRows(rows) {
    return rows.map((row) => {
        const question = extractRowValue(row, ['Question', '質問']);
        const answer = extractRowValue(row, ['Answer', '回答']);
        const categoryRaw = extractRowValue(row, ['Category', 'カテゴリ']);
        const keywords = extractRowValue(row, ['Keyword', 'キーワード']);
        const categories = getCategoriesFromData(categoryRaw);

        return {
            question,
            answer,
            categoryRaw,
            categories,
            keywords,
            normalizedText: normalizeText([question, answer, categoryRaw, keywords].join(' '))
        };
    }).filter((item) => item.question);
}

function parseCsvUrl(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(appendCacheBuster(url), {
            download: true,
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            transformHeader: (header) => stripBom(header),
            complete: (results) => {
                const parsed = parseRows(results.data || []);
                if (parsed.length > 0) resolve(parsed);
                else reject(new Error('No valid rows'));
            },
            error: reject
        });
    });
}

function parseEmbeddedCsv(csvText) {
    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            encoding: 'UTF-8',
            transformHeader: (header) => stripBom(header),
            complete: (results) => {
                const parsed = parseRows(results.data || []);
                if (parsed.length > 0) resolve(parsed);
                else reject(new Error('No valid embedded rows'));
            },
            error: reject
        });
    });
}

async function loadQAData() {
    const urls = window.QA_SOURCE_URLS || {};
    const candidates = [urls.remoteCsvUrl, urls.localCsvUrl, 'files/data/qa-data.csv'].filter(Boolean);
    const errors = [];

    for (const url of candidates) {
        try {
            return await parseCsvUrl(url);
        } catch (error) {
            errors.push(error);
        }
    }

    if (typeof QA_CSV_CONTENT === 'string' && QA_CSV_CONTENT.trim()) {
        try {
            return await parseEmbeddedCsv(QA_CSV_CONTENT);
        } catch (error) {
            errors.push(error);
        }
    }

    throw new Error(`Q&A data load failed: ${errors.map((err) => err.message).join(' | ')}`);
}

function renderResults(container, data) {
    container.innerHTML = '';

    if (!data.length) {
        container.innerHTML = '<p class="qa-no-result">該当するQ&Aが見つかりません。</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    data.forEach((item) => {
        const qaItem = document.createElement('div');
        qaItem.className = 'qa-search-item';

        const questionDiv = document.createElement('div');
        questionDiv.className = 'qa-search-question';
        questionDiv.style.display = 'flex';
        questionDiv.style.justifyContent = 'space-between';
        questionDiv.style.alignItems = 'center';
        questionDiv.innerHTML = `<span>${item.question}</span><span style="opacity:0.5; font-size:0.8rem;">▼</span>`;

        const answerDiv = document.createElement('div');
        answerDiv.className = 'qa-search-answer';
        answerDiv.innerHTML = formatAnswerText(item.answer);

        qaItem.appendChild(questionDiv);
        qaItem.appendChild(answerDiv);
        fragment.appendChild(qaItem);

        questionDiv.addEventListener('click', () => {
            qaItem.classList.toggle('active');
        });
    });

    container.appendChild(fragment);
}

function showMessage(container, message) {
    container.innerHTML = `<p class="qa-initial-message">${message}</p>`;
}

async function initQASection(section) {
    const searchInput = section.querySelector('.qa-search-input');
    const resultsContainer = section.querySelector('.qa-results-container');
    const categoryFilterRaw = String(section.dataset.category || 'all').trim();
    const categoryFilter = categoryFilterRaw.toLowerCase();

    if (!searchInput || !resultsContainer) return;

    showMessage(resultsContainer, 'Q&Aデータを読み込んでいます...');

    let qaData = [];
    try {
        const allData = await loadQAData();
        if (categoryFilter === 'all') {
            qaData = allData;
        } else {
            const mappedFilters = getCategoriesFromData(categoryFilterRaw);
            const normalizedFilter = normalizeCategoryText(categoryFilterRaw);

            qaData = allData.filter((item) => {
                const matchMapped = mappedFilters.length > 0
                    ? mappedFilters.some((mapped) => item.categories.includes(mapped))
                    : false;
                const matchRaw = normalizedFilter
                    ? normalizeCategoryText(item.categoryRaw).includes(normalizedFilter)
                    : false;
                return matchMapped || matchRaw;
            });
        }
    } catch (error) {
        console.error(error);
        showMessage(resultsContainer, 'Q&Aデータの読み込みに失敗しました。');
        return;
    }

    const runSearch = () => {
        const query = normalizeText(searchInput.value || '');

        if (!query) {
            renderResults(resultsContainer, qaData);
            return;
        }

        const keywords = query.split(/\s+/).filter(Boolean);
        const filtered = qaData.filter((item) => keywords.every((word) => item.normalizedText.includes(word)));
        renderResults(resultsContainer, filtered);
    };

    searchInput.addEventListener('input', runSearch);
    runSearch();
}
