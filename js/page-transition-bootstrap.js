(function () {
    const ENTER_CLASS = 'page-transition-enter';
    const PRERENDER_CLASS = 'page-transition-prerender';
    const STYLE_ID = 'page-transition-bootstrap-style';
    const PENDING_KEY = 'pageTransitionPending';

    try {
        if (
            window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
            sessionStorage.getItem(PENDING_KEY) !== '1'
        ) {
            return;
        }

        document.documentElement.classList.add(ENTER_CLASS, PRERENDER_CLASS);

        if (!document.getElementById(STYLE_ID)) {
            const style = document.createElement('style');
            style.id = STYLE_ID;
            style.textContent = `
html.${PRERENDER_CLASS} body {
    opacity: 0;
    transform: translateY(10px);
}
`;
            document.head.appendChild(style);
        }

        window.setTimeout(() => {
            document.documentElement.classList.remove(ENTER_CLASS, PRERENDER_CLASS);
            document.getElementById(STYLE_ID)?.remove();
        }, 1200);
    } catch (error) {
        document.documentElement.classList.remove(ENTER_CLASS, PRERENDER_CLASS);
    }
})();
