document.addEventListener('DOMContentLoaded', function () {
    // 全てのナビゲーションボタンを取得
    const navButtons = document.querySelectorAll('.nav-button');
    // 全てのコンテンツセクションを取得
    const contentSections = document.querySelectorAll('.content-section');

    // 各ボタンにクリックイベントを設定
    navButtons.forEach(function (button) {
        button.addEventListener('click', function (event) {
            // リンクのデフォルトの動き（ページ遷移）を止める
            event.preventDefault();

            // 表示するコンテンツのIDをボタンのdata-target属性から取得
            const targetId = this.dataset.target;
            const targetContent = document.getElementById(targetId);

            // 1. すべてのボタンからactiveクラスを削除
            navButtons.forEach(btn => btn.classList.remove('active'));
            // 2. クリックされたボタンにだけactiveクラスを追加
            this.classList.add('active');
            
            // 3. すべてのコンテンツを非表示にする
            contentSections.forEach(section => section.classList.remove('active'));
            // 4. ターゲットのコンテンツだけを表示する
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
});