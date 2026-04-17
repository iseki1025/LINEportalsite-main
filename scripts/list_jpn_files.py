import os

def list_japanese_files(path):
    files_to_rename = []
    for root, dirs, files in os.walk(path):
        for file in files:
            if any(ord(c) > 127 for c in file):
                files_to_rename.append(os.path.join(root, file))
    return files_to_rename

if __name__ == "__main__":
    path = "files/pdf"
    japanese_files = list_japanese_files(path)
    with open("jpn_files_list.txt", "w", encoding="utf-8") as f:
        for file in japanese_files:
            f.write(file + "\n")
