import sqlite3
import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "data" / "baba_app.sqlite"

def get_connection():
    # Detect if we need to initialize on first connection
    is_new = not DB_PATH.exists()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    if is_new:
        init_db(conn)
    return conn

def init_db(conn=None):
    if not conn:
        conn = get_connection()
    cursor = conn.cursor()
    
    # Table for raw scraped items
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS raw_content (
        id TEXT PRIMARY KEY,
        niche TEXT,
        source TEXT,
        title TEXT,
        data_json TEXT,
        scraped_at TIMESTAMP
    )
    """)
    
    # Table for content pipelines
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        status TEXT,
        niche TEXT,
        template TEXT,
        platforms TEXT,
        caption TEXT,
        data_json TEXT,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
    )
    """)
    
    # Track deduplication for scraped URLs to not scrape things twice
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS seen_urls (
        url TEXT PRIMARY KEY,
        seen_at TIMESTAMP
    )
    """)
    
    # Track intermediate discovered links from portal scraping
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS discovered_links (
        id TEXT PRIMARY KEY,
        portal_id TEXT,
        url TEXT UNIQUE,
        title TEXT,
        status TEXT,
        discovered_at TIMESTAMP
    )
    """)
    
    conn.commit()

# --- DISCOVERED LINKS ---
def save_discovered(portal_id: str, url: str, title: str):
    conn = get_connection()
    c = conn.cursor()
    _id = f"disc_{datetime.now().strftime('%Y%m%d%H%M%S')}_{abs(hash(url)) % 10000}"
    c.execute("""
        INSERT OR IGNORE INTO discovered_links (id, portal_id, url, title, status, discovered_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (_id, portal_id, url, title, "discovered", datetime.now().isoformat()))
    conn.commit()
    conn.close()

def get_all_discovered(status=None):
    conn = get_connection()
    c = conn.cursor()
    if status:
        c.execute("SELECT * FROM discovered_links WHERE status = ? ORDER BY discovered_at DESC", (status,))
    else:
        c.execute("SELECT * FROM discovered_links ORDER BY discovered_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def mark_discovered_scraped(url: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("UPDATE discovered_links SET status = 'scraped' WHERE url = ?", (url,))
    conn.commit()
    conn.close()

# --- RAW CONTENT ---
def save_raw(data: dict):
    conn = get_connection()
    c = conn.cursor()
    # upsert
    c.execute("""
        INSERT INTO raw_content (id, niche, source, title, data_json, scraped_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            niche=excluded.niche,
            source=excluded.source,
            title=excluded.title,
            data_json=excluded.data_json
    """, (
        data.get("id"),
        data.get("niche", ""),
        data.get("source", "unknown"),
        data.get("title", ""),
        json.dumps(data),
        data.get("scraped_at", datetime.now().isoformat())
    ))
    conn.commit()
    conn.close()

def get_raw_item(raw_id: str) -> dict:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM raw_content WHERE id = ?", (raw_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def get_all_raw():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM raw_content ORDER BY scraped_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

# --- POSTS ---
def save_post(data: dict):
    conn = get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO posts (id, status, niche, template, platforms, caption, data_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            status=excluded.status,
            niche=excluded.niche,
            template=excluded.template,
            platforms=excluded.platforms,
            caption=excluded.caption,
            data_json=excluded.data_json,
            updated_at=excluded.updated_at
    """, (
        data.get("id"),
        data.get("status", "draft"),
        data.get("niche", ""),
        data.get("template", ""),
        json.dumps(data.get("platform", [])),
        data.get("caption", ""),
        json.dumps(data),
        datetime.now().isoformat(),
        datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()

def get_post(post_id: str) -> dict:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT data_json FROM posts WHERE id = ?", (post_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return json.loads(row["data_json"])
    return None

def get_all_posts():
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT * FROM posts ORDER BY updated_at DESC")
    rows = c.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_post(post_id: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    conn.commit()
    conn.close()

# --- URL DEDUP ---
def mark_url_seen(url: str):
    conn = get_connection()
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO seen_urls (url, seen_at) VALUES (?, ?)", 
              (url, datetime.now().isoformat()))
    conn.commit()
    conn.close()

def is_url_seen(url: str) -> bool:
    conn = get_connection()
    c = conn.cursor()
    c.execute("SELECT 1 FROM seen_urls WHERE url = ?", (url,))
    res = c.fetchone() is not None
    conn.close()
    return res
