(() => {
    'use strict';

    function parseUntilDate(value) {
        if (!value) {
            return null;
        }

        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
        if (!match) {
            return null;
        }

        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);

        return new Date(year, month, day, 23, 59, 59, 999);
    }

    function removeExpiredElements(selector, now) {
        document.querySelectorAll(selector).forEach((element) => {
            const until = parseUntilDate(element.dataset.updateUntil);
            if (!until || now <= until) {
                return;
            }
            element.remove();
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const now = new Date();

        removeExpiredElements('.js-update-badge[data-update-until]', now);
        removeExpiredElements('.js-update-item[data-update-until]', now);

        document.querySelectorAll('.js-update-section').forEach((section) => {
            if (section.querySelector('.js-update-item')) {
                return;
            }
            section.remove();
        });
    });
})();
