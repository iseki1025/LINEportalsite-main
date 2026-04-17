import os

# Mapping of original relative paths to new filenames
rename_map = {
    r"files/pdf\2020年秋冬2.pdf": "2020-autumn-winter-2.pdf",
    r"files/pdf\ドライカレーオムライスこいのぼり.pdf": "dry-curry-omelet-rice-koinobori.pdf",
    r"files/pdf\備蓄食について.pdf": "about-emergency-food-stockpile.pdf",
    r"files/pdf\災害時レシピ - パックごはんチャーハン.pdf": "disaster-recipe-packed-rice-fried-rice.pdf",
    r"files/pdf\災害時レシピ - 炊飯.pdf": "disaster-recipe-cooking-rice.pdf",
    r"files/pdf\災害時レシピ - 焼きラーメン.pdf": "disaster-recipe-pan-fried-ramen.pdf",
    r"files/pdf\災害時レシピ - 焼き鳥缶パスタ.pdf": "disaster-recipe-canned-yakitori-pasta.pdf",
    r"files/pdf\災害時レシピ -ツナマヨパスタ.pdf": "disaster-recipe-tuna-mayo-pasta.pdf",
    r"files/pdf\避難所マイカード.pdf": "evacuation-shelter-my-card.pdf",
    r"files/pdf\nutrition\手ばかり栄養法.pdf": "hand-portion-nutrition-method.pdf",
    r"files/pdf\nutrition\資料1.pdf": "nutrition-material-01.pdf",
    r"files/pdf\nutrition\資料2.pdf": "nutrition-material-02.pdf",
    r"files/pdf\nutrition\資料3.pdf": "nutrition-material-03.pdf",
    r"files/pdf\nutrition\資料4.pdf": "nutrition-material-04.pdf",
    r"files/pdf\nutrition\資料5.pdf": "nutrition-material-05.pdf",
    r"files/pdf\nutrition\資料6.pdf": "nutrition-material-06.pdf",
    r"files/pdf\nutrition\資料7.pdf": "nutrition-material-07.pdf",
    r"files/pdf\nutrition\資料8.pdf": "nutrition-material-08.pdf",
    r"files/pdf\nutrition\資料9.pdf": "nutrition-material-09.pdf",
    r"files/pdf\nutrition\資料10.pdf": "nutrition-material-10.pdf",
    r"files/pdf\nutrition\資料11.pdf": "nutrition-material-11.pdf",
    r"files/pdf\nutrition\資料12.pdf": "nutrition-material-12.pdf",
    r"files/pdf\nutrition\資料13.pdf": "nutrition-material-13.pdf",
    r"files/pdf\nutrition\資料14.pdf": "nutrition-material-14.pdf",
    r"files/pdf\nutrition\資料15.pdf": "nutrition-material-15.pdf",
    r"files/pdf\nutrition\資料16.pdf": "nutrition-material-16.pdf",
    r"files/pdf\nutrition\資料17.pdf": "nutrition-material-17.pdf",
    r"files/pdf\nutrition\資料18.pdf": "nutrition-material-18.pdf",
    r"files/pdf\nutrition\資料19.pdf": "nutrition-material-19.pdf",
    r"files/pdf\nutrition\資料20.pdf": "nutrition-material-20.pdf",
    r"files/pdf\nutrition\資料21.pdf": "nutrition-material-21.pdf",
    r"files/pdf\nutrition\資料22.pdf": "nutrition-material-22.pdf",
    r"files/pdf\nutrition\資料23.pdf": "nutrition-material-23.pdf",
    r"files/pdf\nutrition\資料24.pdf": "nutrition-material-24.pdf",
}

def rename_files():
    base_dir = os.getcwd()
    success_count = 0
    fail_count = 0
    
    for old_rel_path, new_filename in rename_map.items():
        # Ensure path is handled correctly for the OS
        old_path = os.path.join(base_dir, old_rel_path.replace("\\", os.sep))
        directory = os.path.dirname(old_path)
        new_path = os.path.join(directory, new_filename)
        
        if os.path.exists(old_path):
            try:
                os.rename(old_path, new_path)
                print(f"Renamed: {os.path.basename(old_path)} -> {new_filename}")
                success_count += 1
            except Exception as e:
                print(f"Error renaming {old_rel_path}: {e}")
                fail_count += 1
        else:
            print(f"File not found: {old_rel_path}")
            fail_count += 1
            
    print(f"\nRename process completed. Success: {success_count}, Fail: {fail_count}")

if __name__ == "__main__":
    rename_files()
