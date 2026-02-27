import os

def update_qa_js():
    base_dir = r"C:\pythonapp\LINEportalsite-main"
    csv_path = os.path.join(base_dir, "files", "data", "qa-data.csv")
    js_path = os.path.join(base_dir, "js", "qa", "qa-data-embedded.js")

    with open(csv_path, "r", encoding="utf-8") as f:
        csv_content = f.read()

    js_content = f"const QA_CSV_CONTENT = `{csv_content}`;\n"

    with open(js_path, "w", encoding="utf-8") as f:
        f.write(js_content)
    
    print("Successfully updated qa-data-embedded.js with the latest CSV content.")

if __name__ == "__main__":
    update_qa_js()
