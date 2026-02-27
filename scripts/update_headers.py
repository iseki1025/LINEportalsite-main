import os
import re

# 定数：HTMLファイルが置かれているルートディレクトリ
target_dir = r"C:\pythonapp\LINEportalsite-main"

# 置換対象としないファイル/ディレクトリのキーワード
EXCLUDE_DIRS = ['old_design', 'files', '.git', 'scripts', '.agent']
EXCLUDE_FILES = ['admin', 'index_old.html', 'migrate']

def find_html_files(directory):
    html_files = []
    for root, dirs, files in os.walk(directory):
        # 除外ディレクトリをスキップ
        dirs[:] = [d for d in dirs if not any(x in d for x in EXCLUDE_DIRS)]
        
        for file in files:
            if file.endswith('.html') and not any(x in file for x in EXCLUDE_FILES):
                html_files.append(os.path.join(root, file))
    return html_files

def parse_header_and_apply_changes(content, filename):
    """
    <header class="app-header">...</header> を新しい構造に置き換える。
    また、必要であれば <a class="header-back"> を抽出して <main class="main-content"> の直下へ挿入する。
    """
    
    # Header全体の抽出
    header_pattern = re.compile(r'<header class="app-header.*?>(.*?)</header>', re.IGNORECASE | re.DOTALL)
    header_match = header_pattern.search(content)
    
    if not header_match:
        return content # headerがなければ何もしない
        
    header_inner = header_match.group(1)
    
    # --- back buttonが存在するかチェック ---
    back_btn_pattern = re.compile(r'<a[^>]+class="[^"]*?header-back[^"]*?"[^>]*href="([^"]+)"[^>]*>.*?</a>', re.IGNORECASE | re.DOTALL)
    back_btn_btn_match = back_btn_pattern.search(header_inner)
    
    back_href = None
    if back_btn_btn_match:
        back_href = back_btn_btn_match.group(1)
        
    # --- titleの抽出 ---
    title_pattern = re.compile(r'<div class="header-title">(.*?)</div>', re.IGNORECASE | re.DOTALL)
    title_match = title_pattern.search(header_inner)
    
    header_title = title_match.group(1) if title_match else "梶本クリニック"
    
    # --- logoのリンク先決定 ---
    basename = os.path.basename(filename)
    logo_href = "index.html"
    if basename.startswith("friend-"):
        logo_href = "friend-main.html"
    elif basename.startswith("disaster-"):
        logo_href = "disaster-main.html"

    # 新しいheader構造の作成
    new_header = f"""<header class="app-header">
        <a href="{logo_href}" class="header-logo">
            <img src="files/common/kajimoto_rogo2.svg" alt="梶本クリニック">
        </a>
        <div class="header-center">
            <div class="header-title">{header_title}</div>
        </div>
    </header>"""
    
    # headerを置換
    new_content = header_pattern.sub(new_header, content)
    
    # --- 戻るボタンの再配置 ---
    if back_href:
        # main-contentタグの場所を探してその直後に挿入する
        main_pattern = re.compile(r'(<main[^>]*class="[^"]*?main-content[^"]*?"[^>]*>)', re.IGNORECASE)
        
        back_button_html = f"""
        <!-- 戻るボタン -->
        <a href="{back_href}" class="page-back-button" style="margin-left: var(--spacing-md); margin-bottom: var(--spacing-sm); margin-top: var(--spacing-sm);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            戻る
        </a>
"""
        new_content = main_pattern.sub(r'\1' + back_button_html, new_content)

    return new_content

def main():
    html_files = find_html_files(target_dir)
    print(f"ターゲットファイル数: {len(html_files)}")
    
    for file_path in html_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            new_content = parse_header_and_apply_changes(content, file_path)
            
            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated: {file_path}")
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    main()
