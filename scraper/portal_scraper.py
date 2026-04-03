import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import yaml
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from src.database import save_discovered, is_url_seen
from scraper.parser_generator import CFG_PATH

def run_all_portals():
    if not CFG_PATH.exists():
        print("[portal_scraper] No portals configuration found.")
        return 0
        
    with open(CFG_PATH, "r") as f:
        config = yaml.safe_load(f) or {}
        
    portals = config.get("portals", [])
    total_discovered = 0
    
    for p in portals:
        try:
            print(f"[portal_scraper] Scraping portal: {p['url']}")
            resp = requests.get(p["url"], headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
            resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, "html.parser")
            domain = urlparse(p["url"]).netloc
            links = soup.select(p["selectors"]["link"])
            
            count = 0
            for a in links:
                href = a.get("href")
                if not href:
                    continue
                if href.startswith("/"):
                    href = f"https://{domain}{href}"
                    
                title = a.get_text(strip=True)
                if len(title) < 10:
                    continue
                    
                # We skip if we have ever deeply scraped it already
                if not is_url_seen(href):
                    save_discovered(p["id"], href, title)
                    count += 1
                    
            print(f"[portal_scraper] Found {count} new articles for {p['id']}")
            total_discovered += count
            
        except Exception as e:
            print(f"[portal_scraper] Error scraping portal {p['id']}: {e}")
            
    return total_discovered
