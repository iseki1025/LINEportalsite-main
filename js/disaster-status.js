(() => {
    'use strict';

    // The admin editor writes to this collection. Public reads do not need the Firebase SDK.
    const statusUrl = 'https://firestore.googleapis.com/v1/projects/kajimoto-official-line-site/databases/(default)/documents/dialysis_status?pageSize=10';
    const requestTimeoutMs = 8000;
    const facilities = [
        { name: '本院', id: 'honin', phone: '0664519010', phoneLabel: '06-6451-9010' },
        { name: 'なかもず分院', id: 'nakamozu', phone: '0722502960', phoneLabel: '072-250-2960' },
        { name: '三国ヶ丘分院', id: 'mikunigaoka', phone: '0722758980', phoneLabel: '072-275-8980' }
    ];
    const statusLabels = {
        available: { text: '透析可', badge: 'ok' },
        unavailable: { text: '透析不可', badge: 'ng' },
        checking: { text: '確認中', badge: 'waiting' },
        conditional: { text: '条件付き可', badge: 'warning' }
    };

    const container = document.getElementById('dialysisStatusContainer');
    const timeLabel = document.getElementById('current-status-time');
    const refreshButton = document.getElementById('statusRefreshBtn');
    if (!container || !timeLabel || !refreshButton) return;

    let lastRequestAt = 0;
    let inFlight = false;

    function fieldString(fields, key) {
        const value = fields?.[key]?.stringValue;
        return typeof value === 'string' ? value : '';
    }

    function fieldDate(fields, key) {
        const value = fields?.[key]?.timestampValue;
        if (typeof value !== 'string') return null;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatDate(date) {
        return new Intl.DateTimeFormat('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        }).format(date);
    }

    function appendText(parent, tag, className, value) {
        const element = document.createElement(tag);
        element.className = className;
        element.textContent = value;
        parent.appendChild(element);
        return element;
    }

    function appendFacility(facility, fields, unavailableMessage = '') {
        const status = fieldString(fields, 'status');
        const updatedAt = fieldDate(fields, 'updatedAt');
        const registeredStatus = !unavailableMessage && updatedAt ? statusLabels[status] : null;
        const badge = registeredStatus || { text: '要確認', badge: 'waiting' };
        const item = document.createElement('div');
        item.className = `status-item ${facility.id}`;

        appendText(item, 'span', 'status-name', facility.name);
        appendText(item, 'span', `status-badge ${badge.badge}`, badge.text);

        if (registeredStatus) {
            appendText(item, 'p', 'status-checked-at', `最終更新: ${formatDate(updatedAt)}`);
            const shortMessage = fieldString(fields, 'short_message');
            if (shortMessage) appendText(item, 'p', 'short-message', `⚠️ ${shortMessage}`);

            const reason = fieldString(fields, 'reason');
            if (reason && typeof window.openReasonModal === 'function') {
                const button = document.createElement('button');
                button.className = 'btn-read-more';
                button.type = 'button';
                button.innerHTML = '<svg aria-hidden="true"><use href="assets/icons/support-icons.svg#qna"></use></svg>詳細ガイドラインを読む';
                button.addEventListener('click', () => window.openReasonModal(reason));
                item.appendChild(button);
            }
        } else {
            appendText(item, 'p', 'status-checked-at', updatedAt
                ? `最終更新: ${formatDate(updatedAt)}（状態を確認できません）`
                : '登録状態・更新日時を確認できません');
            if (unavailableMessage) appendText(item, 'p', 'status-unavailable-message', unavailableMessage);
        }

        const contact = appendText(item, 'a', 'status-contact-link', `電話で確認: ${facility.phoneLabel}`);
        contact.href = `tel:${facility.phone}`;
        container.appendChild(item);
    }

    function renderUnavailable(message) {
        timeLabel.textContent = '状況を取得できません';
        container.replaceChildren();
        appendText(container, 'p', 'status-data-warning', 'オンラインの透析状況を取得できません。各施設に直接ご確認ください。');
        facilities.forEach((facility) => appendFacility(facility, null, message));
    }

    function renderDocuments(documents) {
        const dataMap = new Map();
        for (const document of documents) {
            if (typeof document.name !== 'string') continue;
            dataMap.set(decodeURIComponent(document.name.split('/').pop()), document.fields || {});
        }

        const dates = facilities
            .map((facility) => fieldDate(dataMap.get(facility.name), 'updatedAt'))
            .filter(Boolean);
        const latestUpdate = dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : null;
        timeLabel.textContent = latestUpdate ? `登録最終更新: ${formatDate(latestUpdate)}` : '登録日時を確認できません';
        container.replaceChildren();

        if (!latestUpdate || Date.now() - latestUpdate.getTime() > 30 * 24 * 60 * 60 * 1000) {
            appendText(container, 'p', 'status-data-warning', latestUpdate
                ? `登録の最終更新は${formatDate(latestUpdate)}です。現在の状況を保証するものではありません。`
                : '登録日時を確認できません。現在の状況は各施設に直接ご確認ください。');
        }

        facilities.forEach((facility) => appendFacility(facility, dataMap.get(facility.name)));
    }

    async function fetchDocuments() {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
        try {
            const response = await fetch(statusUrl, {
                cache: 'no-store',
                headers: { Accept: 'application/json' },
                signal: controller.signal
            });
            if (!response.ok) throw new Error(`Status response: ${response.status}`);
            const body = await response.json();
            if (!Array.isArray(body.documents)) throw new Error('No status documents');
            return body.documents;
        } finally {
            clearTimeout(timer);
        }
    }

    async function loadDialysisStatus() {
        if (inFlight) return;
        inFlight = true;
        lastRequestAt = Date.now();
        refreshButton.disabled = true;
        try {
            renderDocuments(await fetchDocuments());
        } catch (error) {
            console.error('Dialysis status read failed:', error);
            renderUnavailable('通信できないため、状態を確認できません。');
        } finally {
            inFlight = false;
            refreshButton.disabled = false;
        }
    }

    refreshButton.addEventListener('click', loadDialysisStatus);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && Date.now() - lastRequestAt > 60000) {
            loadDialysisStatus();
        }
    });
    loadDialysisStatus();
})();
