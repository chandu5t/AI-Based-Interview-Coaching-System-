import os

folder_path = "AI_Interview"

for root, dirs, files in os.walk(folder_path):
    level = root.replace(folder_path, '').count(os.sep)
    indent = ' ' * 4 * level
    print(f"{indent}📂 {os.path.basename(root)}")
    subindent = ' ' * 4 * (level + 1)
    for f in files:
        print(f"{subindent}📄 {f}")

