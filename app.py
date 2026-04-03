import streamlit as st
import pandas as pd
from pathlib import Path
import sys
import json
from datetime import datetime

# Path setup so we can import local modules
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from src.database import get_all_raw, get_all_posts, get_post, save_post
from scraper.blog_scraper import scrape_article
from scraper.trend_scraper import scrape_google_trends, scrape_reddit
from src.generator.base import load_template_metadata
from config.settings import TEMPLATES_DIR, OUTPUT_IMG_DIR

st.set_page_config(
    page_title="Baba-App | Content Studio",
    page_icon="🤖",
    layout="wide",
)

st.title("🚀 Baba-App Studio")

# ─────────────────────────────────────────────────────────────
# TAB SETUP
# ─────────────────────────────────────────────────────────────
tab_scraper, tab_db, tab_generator = st.tabs([
    "📡 Scraper Console", 
    "🗃️ Content Database", 
    "🎨 Visual Generator"
])

# ─────────────────────────────────────────────────────────────
# 📡 TAB 1: SCRAPER CONSOLE
# ─────────────────────────────────────────────────────────────
with tab_scraper:
    st.header("Trigger Scrapers")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Scrape Single URL")
        url_input = st.text_input("Article URL")
        niche_input = st.text_input("Niche", value="ai-engineering")
        if st.button("Scrape URL"):
            with st.spinner("Scraping..."):
                res = scrape_article(url_input, niche=niche_input)
                if res:
                    st.success(f"Successfully scraped: {res['title']}")
                else:
                    st.error("Failed to scrape. Was it a duplicate or blocked?")
                    
    with col2:
        st.subheader("Scrape Trends")
        source = st.selectbox("Source", ["google", "reddit", "all"])
        trend_niche = st.text_input("Trend Niche", value="ai-engineering")
        subreddits = st.text_input("Subreddits (comma separated)", value="MachineLearning,datascience")
        if st.button("Scrape Trends"):
            with st.spinner(f"Scraping {source} trends..."):
                total = []
                if source in ("google", "all"):
                    total += scrape_google_trends(niche=trend_niche)
                if source in ("reddit", "all"):
                    subs = [s.strip() for s in subreddits.split(",")] if subreddits else None
                    total += scrape_reddit(subreddits=subs, niche=trend_niche)
                st.success(f"Scraped {len(total)} new trend items.")

# ─────────────────────────────────────────────────────────────
# 🗃️ TAB 2: CONTENT DATABASE
# ─────────────────────────────────────────────────────────────
with tab_db:
    st.header("Content Pipeline")
    
    db_mode = st.radio("View", ["Content Plans (posts)", "Raw Intelligence (scraped)"], horizontal=True)
    
    if db_mode == "Content Plans (posts)":
        posts = get_all_posts()
        if posts:
            df = pd.DataFrame(posts)
            # Format timestamps
            if 'updated_at' in df.columns:
                df['updated_at'] = pd.to_datetime(df['updated_at']).dt.strftime('%Y-%m-%d %H:%M:%S')
            
            # Cleanup for display
            df['platforms'] = df['platforms'].apply(lambda x: ", ".join(json.loads(x)) if isinstance(x, str) else x)
            df = df[['id', 'status', 'niche', 'template', 'platforms', 'updated_at']]
            
            st.dataframe(df, use_container_width=True, hide_index=True)
            
            st.subheader("Inspect/Edit Post")
            post_id = st.selectbox("Select Post", df['id'].tolist())
            post_data = get_post(post_id)
            if post_data:
                new_status = st.selectbox("Status", ["draft", "approved", "published"], index=["draft", "approved", "published"].index(post_data.get("status", "draft")))
                if new_status != post_data.get("status"):
                    post_data["status"] = new_status
                    save_post(post_data)
                    st.success(f"Status updated to {new_status}")
                    st.rerun()
                st.json(post_data)
        else:
            st.info("No content plans found.")
            
    else:
        raw_items = get_all_raw()
        if raw_items:
            df = pd.DataFrame(raw_items)
            # Format timestamp
            if 'scraped_at' in df.columns:
                df['scraped_at'] = pd.to_datetime(df['scraped_at']).dt.strftime('%Y-%m-%d %H:%M:%S')
                
            df_display = df[['id', 'source', 'niche', 'title', 'scraped_at']]
            st.dataframe(df_display, use_container_width=True, hide_index=True)
            
            st.subheader("Inspect Raw Data")
            raw_id = st.selectbox("Select Scraped Item", df['id'].tolist())
            
            # Find the selected item's full JSON
            selected_row = df[df['id'] == raw_id].iloc[0]
            raw_data = json.loads(selected_row['data_json'])
            
            # Show images if any exist
            local_images = raw_data.get("local_images", [])
            if local_images:
                st.write("**Extracted Images:**")
                img_cols = st.columns(min(len(local_images), 4))
                for i, img_path in enumerate(local_images):
                    try:
                        with img_cols[i % 4]:
                            st.image(img_path, use_column_width=True)
                    except Exception as e:
                        pass
            
            with st.expander("Show Full JSON Data"):
                st.json(raw_data)
        else:
            st.info("No raw intelligence found.")

# ─────────────────────────────────────────────────────────────
# 🎨 TAB 3: VISUAL GENERATOR
# ─────────────────────────────────────────────────────────────
with tab_generator:
    st.header("Generate & Preview Visuals")
    
    # Only allow generating approved or draft posts
    posts = [p for p in get_all_posts() if p["status"] in ["approved", "draft"]]
    if not posts:
        st.warning("No 'approved' or 'draft' posts available. Change a post's status in the Data Management tab.")
    else:
        post_options = {p['id']: p for p in posts}
        selected_post_id = st.selectbox("Select Post to Generate", list(post_options.keys()))
        selected_post = post_options[selected_post_id]
        
        st.write(f"**Current Platforms:** {selected_post['platforms']}")
        
        if st.button("Generate Visuals", type="primary"):
            with st.spinner("Generating PDF and PNGs..."):
                from main import _run_generator
                
                content = get_post(selected_post_id)
                platforms_to_run = json.loads(selected_post["platforms"]) if isinstance(selected_post["platforms"], str) else selected_post["platforms"]
                
                for plt in platforms_to_run:
                    _run_generator(content, plt, selected_post["template"])
                
                st.success("Generation Complete!")
                
                # Preview images if they exist
                for plt in platforms_to_run:
                    if plt in ["instagram_feed", "instagram_story", "tiktok"]:
                        st.subheader(f"{plt.replace('_', ' ').title()} Preview")
                        img_dir = OUTPUT_IMG_DIR / plt / selected_post_id
                        if img_dir.exists():
                            imgs = sorted(list(img_dir.glob("*.png")))
                            if imgs:
                                cols = st.columns(min(len(imgs), 5))
                                for idx, img_path in enumerate(imgs):
                                    with cols[idx % 5]:
                                        st.image(str(img_path), caption=f"Slide {idx+1}")
