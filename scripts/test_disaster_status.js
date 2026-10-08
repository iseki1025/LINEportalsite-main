const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../js/disaster-status.js'), 'utf8');

class FakeElement {
    constructor(tagName) {
        this.tagName = tagName;
        this.children = [];
        this.className = '';
        this.textContent = '';
        this.listeners = {};
    }
    appendChild(child) { this.children.push(child); }
    replaceChildren(...children) { this.children = children; }
    addEventListener(type, handler) { this.listeners[type] = handler; }
}

function setup(fetchImpl, timerImpl = setTimeout) {
    const container = new FakeElement('div');
    const timeLabel = new FakeElement('span');
    const refreshButton = new FakeElement('button');
    const elements = {
        dialysisStatusContainer: container,
        'current-status-time': timeLabel,
        statusRefreshBtn: refreshButton
    };
    const document = {
        getElementById: (id) => elements[id],
        createElement: (tag) => new FakeElement(tag),
        addEventListener: () => {},
        visibilityState: 'visible'
    };
    vm.runInNewContext(source, {
        document,
        window: { openReasonModal: () => {} },
        fetch: fetchImpl,
        AbortController,
        setTimeout: timerImpl,
        clearTimeout,
        Intl,
        Date,
        Map,
        console: { error: () => {} }
    });
    return { container, timeLabel, refreshButton };
}

function documentValue(name, status) {
    return {
        name: `projects/test/databases/(default)/documents/dialysis_status/${name}`,
        fields: {
            status: { stringValue: status },
            updatedAt: { timestampValue: '2026-04-25T05:21:18Z' }
        }
    };
}

async function settle() {
    await new Promise((resolve) => setTimeout(resolve, 0));
}

function badges(container) {
    return container.children.flatMap((item) => item.children)
        .filter((child) => child.className.startsWith('status-badge'))
        .map((child) => child.textContent);
}

async function main() {
    const documents = [
        documentValue('本院', 'conditional'),
        documentValue('なかもず分院', 'available'),
        documentValue('三国ヶ丘分院', 'unavailable')
    ];
    const good = setup(async () => ({ ok: true, json: async () => ({ documents }) }));
    await settle();
    assert.deepEqual(badges(good.container), ['条件付き可', '透析可', '透析不可']);
    assert.match(good.timeLabel.textContent, /登録最終更新: 2026\/4\/25/);
    assert.equal(good.refreshButton.disabled, false);

    const missing = setup(async () => ({ ok: true, json: async () => ({ documents: [documents[0]] }) }));
    await settle();
    assert.deepEqual(badges(missing.container), ['条件付き可', '要確認', '要確認']);

    const offline = setup(async () => { throw new Error('offline'); });
    await settle();
    assert.deepEqual(badges(offline.container), ['要確認', '要確認', '要確認']);
    assert.equal(offline.timeLabel.textContent, '状況を取得できません');

    const timedOut = setup((_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('timeout')));
    }), (handler) => { queueMicrotask(handler); return 1; });
    await settle();
    assert.deepEqual(badges(timedOut.container), ['要確認', '要確認', '要確認']);
    console.log('Disaster status tests passed.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
