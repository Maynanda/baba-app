import urllib.request
from urllib.parse import urlparse
import yaml
from pathlib import Path
from collections import Counter

CFG_PATH = Path(__file__).resolve().parent.parent / "config" / "portals.yaml"

def get_css_signature(element):
    """Generate a CSS signature for an element based on tag and first class."""
    parts = [element.tag]
    classes = element.attrib.get("class")
    if classes:
        parts.append("." + classes.split()[0])
    return "".join(parts)

def generate_parser_for_url(url: str, niche: str = "ai-engineering") -> dict:
    """Heuristic engine to discover CSS selectors for article links on a portal."""
    try:
        from scrapling import Fetcher
        page = Fetcher.get(url)
    except Exception as e:
        return {"error": f"Failed to fetch {url}: {e}"}

    domain = urlparse(url).netloc
    
    valid_links = []
    parent_signatures = []

    for a in page.css("a"):
        text = a.text.strip() if a.text else ""
        href = a.attrib.get("href")
        
        if not href or href.startswith("javascript:") or href.startswith("#"):
            continue
            
        # Resolving relative urls
        if href.startswith("/"):
            href = f"https://{domain}{href}"
            
        # Is this an internal article link?
        # Avoid category tags, author tags, about us pages.
        if "/category/" in href or "/author/" in href or "/about" in href:
            continue
            
        # If it points off-domain, typically not what we want from a portal
        if domain not in href:
            continue
            
        has_heading = a.css("h1, h2, h3, h4")
        if has_heading or len(text) > 40:
            parent = a.parent
            if parent:
                parent_sig = get_css_signature(parent)
                parent_signatures.append(parent_sig)
                
            valid_links.append({"title": text, "url": href})

    if not valid_links:
        return {"error": "Could not identify article patterns on this page."}

    # Find the most common parent wrapper structure to generate a reliable CSS selector
    counter = Counter(parent_signatures)
    best_signature, count = counter.most_common(1)[0]
    
    # We construct the CSS selector rule
    link_selector = f"{best_signature} a"
    
    portal_id = domain.replace(".", "_")

    config_entry = {
        "id": portal_id,
        "url": url,
        "niche": niche,
        "selectors": {
            "link": link_selector
        }
    }

    return {
        "success": True,
        "config": config_entry,
        "preview_links": valid_links[:10]  # Just return top 10 to preview
    }

def save_portal_config(config_entry: dict):
    """Save the generated configuration into portals.yaml"""
    # Create file if missing
    CFG_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not CFG_PATH.exists():
        with open(CFG_PATH, "w") as f:
            yaml.dump({"portals": []}, f)
            
    with open(CFG_PATH, "r") as f:
        data = yaml.safe_load(f) or {"portals": []}
        
    # Upsert logic
    portals = data.get("portals", [])
    updated = False
    for i, p in enumerate(portals):
        if p["id"] == config_entry["id"]:
            portals[i] = config_entry
            updated = True
            break
            
    if not updated:
        portals.append(config_entry)
        
    data["portals"] = portals
    with open(CFG_PATH, "w") as f:
        yaml.dump(data, f, default_flow_style=False)
