(function () {
    if (window.__pageTransitionInitialized) {
        return;
    }
    window.__pageTransitionInitialized = true;

    const ENTER_DURATION = 300;
    const LEAVE_DURATION = 260;
    const REDUCED_ENTER_DURATION = 200;
    const REDUCED_LEAVE_DURATION = 160;
    const NAVIGATION_BUFFER = 20;
    const ENTER_CLASS = 'page-transition-enter';
    const LEAVE_CLASS = 'page-transition-leave';
    const PRERENDER_CLASS = 'page-transition-prerender';
    const STYLE_ID = 'page-transition-styles';
    const PENDING_KEY = 'pageTransitionPending';

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function prefersReducedMotion() {
        return reduceMotionQuery.matches;
    }

    function hasPendingNavigation() {
        try {
            return sessionStorage.getItem(PENDING_KEY) === '1';
        } catch (error) {
            return document.documentElement.classList.contains(PRERENDER_CLASS);
        }
    }

    function isHistoryNavigation() {
        return performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
html.${ENTER_CLASS} body {
    opacity: 0;
}

html.${LEAVE_CLASS} body {
    opacity: 0;
}

body {
    transition:
        opacity ${ENTER_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1),
        transform ${ENTER_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1);
    transform: translateY(0);
    will-change: opacity, transform;
}

html.${LEAVE_CLASS} body {
    transition-duration: ${LEAVE_DURATION}ms;
    transform: translateY(-4px);
}

html.${ENTER_CLASS} body {
    transform: translateY(6px);
}

html.${PRERENDER_CLASS} body {
    opacity: 0;
    transform: translateY(6px);
}

@media (prefers-reduced-motion: reduce) {
    body {
        transition: opacity ${REDUCED_ENTER_DURATION}ms ease-out !important;
        transform: none !important;
    }

    html.${LEAVE_CLASS} body {
        transition-duration: ${REDUCED_LEAVE_DURATION}ms !important;
    }
}
`;
        document.head.appendChild(style);
    }

    function startEnterAnimation(force = false) {
        if (window.__pageTransitionEnterStarted) {
            cleanupPendingState();
            return;
        }

        window.__pageTransitionEnterStarted = true;
        if (!force && !hasPendingNavigation() && !isHistoryNavigation()) {
            cleanupPendingState();
            return;
        }
        const html = document.documentElement;
        html.classList.add(ENTER_CLASS);
        html.classList.remove(PRERENDER_CLASS);
        if (document.body) void document.body.offsetHeight;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                html.classList.remove(ENTER_CLASS);
                cleanupPendingState();
            });
        });
    }

    function cleanupPendingState() {
        document.documentElement.classList.remove(PRERENDER_CLASS);
        try {
            sessionStorage.removeItem(PENDING_KEY);
        } catch (error) {
            // Ignore storage failures and still allow the transition to complete.
        }
    }

    function sameOriginUrl(rawUrl) {
        try {
            return new URL(rawUrl, window.location.href);
        } catch (error) {
            return null;
        }
    }

    function isSamePageLink(link) {
        const targetUrl = sameOriginUrl(link.href);
        if (!targetUrl) {
            return false;
        }

        if (targetUrl.origin !== window.location.origin) {
            return false;
        }

        const current = new URL(window.location.href);
        return (
            targetUrl.pathname === current.pathname &&
            targetUrl.search === current.search &&
            targetUrl.hash !== ''
        );
    }

    function shouldAnimateLink(link, event) {
        if (!link || !link.href) {
            return false;
        }

        if (link.hasAttribute('download')) {
            return false;
        }

        if (link.target && link.target !== '_self') {
            return false;
        }

        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
            return false;
        }

        if (link.getAttribute('href').startsWith('#') || isSamePageLink(link)) {
            return false;
        }

        const targetUrl = sameOriginUrl(link.href);
        if (!targetUrl) {
            return false;
        }

        return targetUrl.origin === window.location.origin;
    }

    function navigateWithTransition(rawUrl, options = {}) {
        const targetUrl = sameOriginUrl(rawUrl);
        if (!targetUrl) {
            window.location.href = rawUrl;
            return;
        }

        const replace = Boolean(options.replace);
        if (window.__pageTransitionLeaving) {
            return;
        }
        window.__pageTransitionLeaving = true;

        try {
            sessionStorage.setItem(PENDING_KEY, '1');
        } catch (error) {
            // Ignore storage failures and continue with the leave animation.
        }

        const html = document.documentElement;
        html.classList.remove(ENTER_CLASS);
        html.classList.remove(PRERENDER_CLASS);
        html.classList.add(LEAVE_CLASS);
        if (document.body) void document.body.offsetHeight;

        window.setTimeout(() => {
            if (replace) {
                window.location.replace(targetUrl.href);
            } else {
                window.location.assign(targetUrl.href);
            }
        }, (prefersReducedMotion() ? REDUCED_LEAVE_DURATION : LEAVE_DURATION) + NAVIGATION_BUFFER);
    }

    function handleClick(event) {
        const link = event.target.closest('a[href]');
        if (!link || !shouldAnimateLink(link, event)) {
            return;
        }

        event.preventDefault();
        navigateWithTransition(link.href, {
            replace: link.dataset.transitionReplace === 'true',
        });
    }

    ensureStyles();
    window.transitionNavigate = navigateWithTransition;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startEnterAnimation, { once: true });
    } else {
        startEnterAnimation();
    }

    window.addEventListener('pageshow', (event) => {
        // A fast click can occur before the first pageshow event; do not cancel its fade-out.
        if (window.__pageTransitionLeaving && !event.persisted) {
            return;
        }
        window.__pageTransitionLeaving = false;
        const html = document.documentElement;
        html.classList.remove(LEAVE_CLASS);

        if (!event.persisted) {
            cleanupPendingState();
            return;
        }

        window.__pageTransitionEnterStarted = false;
        startEnterAnimation(true);
    });

    document.addEventListener('click', handleClick, true);
})();
