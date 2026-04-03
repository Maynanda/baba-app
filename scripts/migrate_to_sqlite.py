import os
import json
import shutil
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.database import save_raw, save_post, get_connection

def migrate():
    base_dir = Path(__file__).resolve().parent.parent
    data_dir = base_dir / "data"
    raw_dir = data_dir / "raw"
    content_dir = data_dir / "content"
    archive_dir = data_dir / "archive"
    
    archive_dir.mkdir(exist_ok=True)
    
    # 1. Migrate seen.json
    seen_file = raw_dir / "_seen.json"
    if seen_file.exists():
        with open(seen_file, "r") as f:
            try:
                seen_urls = json.load(f)
                conn = get_connection()
                c = conn.cursor()
                for url in seen_urls:
                    c.execute("INSERT OR IGNORE INTO seen_urls (url) VALUES (?)", (url,))
                conn.commit()
                conn.close()
                print(f"✅ Migrated {len(seen_urls)} deduplication URLs")
            except Exception as e:
                print(f"⚠️ Failed to parse _seen.json: {e}")
        # Archive it
        shutil.move(str(seen_file), str(archive_dir / "_seen.json.bak"))
        
    # 2. Migrate raw scraped files
    raw_files = list(raw_dir.glob("*.json"))
    raw_count = 0
    for f in raw_files:
        if f.name.startswith("_"):
            continue
        try:
            with open(f, "r") as fp:
                data = json.load(fp)
            if "id" not in data:
                data["id"] = f.stem
            save_raw(data)
            raw_count += 1
            shutil.move(str(f), str(archive_dir / f.name))
        except Exception as e:
            print(f"⚠️ Failed to migrate raw file {f.name}: {e}")
    print(f"✅ Migrated {raw_count} raw items into DB.")
    
    # 3. Migrate content pipeline files
    content_files = list(content_dir.glob("*.json"))
    content_count = 0
    for f in content_files:
        try:
            with open(f, "r") as fp:
                data = json.load(fp)
            if "id" not in data:
                data["id"] = f.stem
            save_post(data)
            content_count += 1
            shutil.move(str(f), str(archive_dir / f.name))
        except Exception as e:
            print(f"⚠️ Failed to migrate content file {f.name}: {e}")
            
    print(f"✅ Migrated {content_count} content plan items into DB.")
    print("🚀 Migration complete! All JSON files have been safely moved to data/archive/")

if __name__ == "__main__":
    migrate()
