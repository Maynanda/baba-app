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
tab_portal, tab_scraper, tab_db, tab_studio, tab_generator = st.tabs([
    "🧭 Portal Discovery",
    "📡 Scraper Console", 
    "🗃️ Content Database", 
    "✍️ Content Studio",
    "🎨 Visual Generator"
])

# ─────────────────────────────────────────────────────────────
# 🧭 TAB 0: PORTAL DISCOVERY
# ─────────────────────────────────────────────────────────────
with tab_portal:
    st.header("Portal Manager & Auto-Parser")
    
    # --- AUTO PARSER ---
    with st.expander("➕ Add New Portal (Auto-Parser)"):
        st.write("Give me any news portal URL. My heuristic engine will analyze the DOM and auto-generate the CSS rules to extract its articles.")
        new_url = st.text_input("Portal URL (e.g. https://techcrunch.com/category/artificial-intelligence/)")
        stealth_parser = st.checkbox("🕵️‍♂️ Enable Stealth Mode (Anti-bot bypass)", key="stealth_parser", help="Slower but bypasses Cloudflare/incapsula.")
        if st.button("Generate Parser & Preview"):
            with st.spinner("Analyzing site structure..."):
                from scraper.parser_generator import generate_parser_for_url, save_portal_config
                result = generate_parser_for_url(new_url, use_stealth=stealth_parser)
                if "error" in result:
                    st.error(result["error"])
                else:
                    st.success("Parser generated successfully!")
                    st.json(result["config"])
                    st.write("**Preview of articles found:**")
                    st.dataframe(result["preview_links"])
                    if st.button("Save Configuration", key="save_parser"):
                        save_portal_config(result["config"])
                        st.success("Configuration added to config/portals.yaml! You can now Discover articles from it.")
                        st.rerun()

    # --- DISCOVERY ENGINE ---
    st.divider()
    st.subheader("Curation Hub")
    
    col1, col2 = st.columns([1, 4])
    with col1:
        stealth_discovery = st.checkbox("🕵️‍♂️ Enable Stealth Mode", key="stealth_disc")
        if st.button("🔍 Run Portal Discovery", use_container_width=True):
            with st.spinner("Scraping all configured portals..."):
                from scraper.portal_scraper import run_all_portals
                from scraper.parser_generator import CFG_PATH
                if not CFG_PATH.exists():
                    st.warning("No portals saved! Use the ➕ Add New Portal section above first.")
                else:
                    count = run_all_portals(use_stealth=stealth_discovery)
                    st.success(f"Discovered {count} new articles!")
                
    st.write("Select the articles you want to deep-scrape into your Raw Intelligence database.")
    
    from src.database import get_all_discovered, mark_discovered_scraped
    from scraper.blog_scraper import scrape_article
    disc_items = get_all_discovered(status="discovered")
    
    if disc_items:
        df_disc = pd.DataFrame(disc_items)
        df_disc.insert(0, "Select", False) # Checkbox column
        df_disc = df_disc[['Select', 'portal_id', 'title', 'url', 'discovered_at']]
        
        edited_df = st.data_editor(
            df_disc, 
            hide_index=True, 
            use_container_width=True,
            column_config={"url": st.column_config.LinkColumn("Article URL")}
        )
        
        selected_rows = edited_df[edited_df.Select]
        if not selected_rows.empty:
            stealth_deep = st.checkbox("🕵️‍♂️ Enable Stealth Mode for Deep Scrape", key="stealth_deep")
            if st.button(f"Deep Scrape ({len(selected_rows)}) Articles", type="primary"):
                with st.spinner("Executing deep scrape (extracting text & images)..."):
                    for _, row in selected_rows.iterrows():
                        scrape_article(row['url'], use_stealth=stealth_deep)
                        mark_discovered_scraped(row['url'])
                st.success("Batch Deep Scraping complete! Items moved to Content Database > Raw Intelligence.")
                import time
                time.sleep(2)
                st.rerun()
    else:
        st.info("No new articles discovered. Add a portal and hit Run Portal Discovery.")


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
        stealth_single = st.checkbox("🕵️‍♂️ Enable Stealth Mode", key="stealth_single")
        if st.button("Scrape URL"):
            with st.spinner("Scraping..."):
                res = scrape_article(url_input, niche=niche_input, use_stealth=stealth_single)
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
            # Create a nice mapping of ID -> Title for the dropdown
            def format_post_label(p_id):
                row = df[df['id'] == p_id].iloc[0]
                status = row.get('status', 'draft')
                return f"[{status.upper()}] {p_id}"
                
            post_id = st.selectbox("Select Post", df['id'].tolist(), format_func=format_post_label)
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
            
            def format_raw_label(r_id):
                title = df[df['id'] == r_id].iloc[0]['title']
                source = df[df['id'] == r_id].iloc[0]['source']
                return f"[{source.upper()}] {title}"
                
            raw_id = st.selectbox("Select Scraped Item", df['id'].tolist(), format_func=format_raw_label)
            
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
                            st.image(img_path, use_container_width=True)
                    except Exception as e:
                        pass
            
            with st.expander("Show Full JSON Data"):
                st.json(raw_data)
        else:
            st.info("No raw intelligence found.")

# ─────────────────────────────────────────────────────────────
# ✍️ TAB 3: CONTENT STUDIO
# ─────────────────────────────────────────────────────────────
with tab_studio:
    st.header("Content Creation Studio")
    st.write("Write your content manually using scraped references before generating visuals.")
    
    col_ref, col_form = st.columns([1, 1], gap="large")
    
    with col_ref:
        st.subheader("Reference Material")
        from src.database import save_raw
        raw_items = get_all_raw()
        if not raw_items:
            st.info("No scraped intelligence found.")
        else:
            def format_studio_raw_label(r):
                return f"[{r['source'].upper()}] {r['title'][:60]}"
            
            selected_ref = st.selectbox("Select Scraped Reference", raw_items, format_func=format_studio_raw_label)
            
            if selected_ref:
                raw_data = json.loads(selected_ref['data_json'])
                with st.container(height=650):
                    st.markdown(f"### {raw_data.get('title')}")
                    st.caption(f"Source: {raw_data.get('source_url')} | Author: {raw_data.get('author')}")
                    
                    images = raw_data.get("local_images", [])
                    if images:
                        st.write("**Extracted Images:**")
                        cols = st.columns(2)
                        for i, img in enumerate(images[:4]):
                            try:
                                cols[i%2].image(img, use_container_width=True)
                            except:
                                pass
                                
                    st.write("---")
                    edited_json_str = st.text_area("Raw Intelligence JSON (Editable)", json.dumps(raw_data, indent=2), height=400)
                    if st.button("Update Raw Intel"):
                        try:
                            updated_raw_data = json.loads(edited_json_str)
                            updated_raw_data['id'] = selected_ref['id']
                            updated_raw_data['source'] = selected_ref['source']
                            updated_raw_data['niche'] = selected_ref['niche']
                            save_raw(updated_raw_data)
                            st.success("Reference JSON successfully updated!")
                        except json.JSONDecodeError:
                            st.error("Invalid JSON format! Please fix your changes before updating.")

    with col_form:
        st.subheader("Content Builder")
        
        # Load available templates
        registry_path = TEMPLATES_DIR / "registry.json"
        if registry_path.exists():
            with open(registry_path) as f:
                reg = json.load(f)
            template_choices = {t['id']: t for t in reg.get('templates', []) if t.get('status') == 'ready'}
        else:
            template_choices = {}
            
        if not template_choices:
            st.warning("No complete templates found in registry.")
        else:
            import re
            post_name_raw = st.text_input("Post Name", value="My New Post", help="Will be formatted securely for database IDs.")
            
            # Format post name
            clean_name = re.sub(r'[^a-zA-Z0-9]', '_', post_name_raw).strip('_').lower()
            post_id = f"post_{clean_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}" if clean_name else f"post_untitled_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            selected_tmpl_id = st.selectbox("Select Template", list(template_choices.keys()), key="studio_template")
            platforms = st.multiselect("Platforms", ["linkedin", "instagram_feed", "instagram_story", "tiktok"], default=["linkedin"], key="studio_platforms")
            niche = st.text_input("Niche", value="ai-engineering", key="studio_niche")
            
            st.divider()
            st.write("**Slide Variables**")
            
            # Fetch placeholders dynamically
            tmpl_meta = load_template_metadata(selected_tmpl_id)
            placeholders = tmpl_meta.get("placeholders", [])
            
            form_data = {}
            for ph in placeholders:
                # Heuristic to make body text larger than title inputs
                if "TITLE" in ph or "SUB" in ph:
                    form_data[ph] = st.text_input(ph)
                else:
                    form_data[ph] = st.text_area(ph, height=80)
                    
            new_post = {
                "id": post_id,
                "status": "draft",
                "niche": niche,
                "template": selected_tmpl_id,
                "platform": platforms,
                "post_date": "",
                "scheduled_time": "",
                "source_url": raw_data.get("source_url", "") if selected_ref else "",
                "slides": [form_data]
            }
                    
            st.write("")
            col_b1, col_b2 = st.columns(2)
            with col_b1:
                # We use use_container_width inside standard columns
                if st.button("Preview Visuals", icon="🖼️", use_container_width=True):
                    with st.spinner("Rendering template preview..."):
                        from main import _run_generator
                        for plt in platforms:
                            _run_generator(new_post, plt, selected_tmpl_id)
                        
                        st.subheader("Preview Output")
                        from src.generator.base import export_images
                        from config.settings import OUTPUT_PDF_DIR
                        
                        for plt in platforms:
                            img_dir = OUTPUT_IMG_DIR / plt / post_id
                            
                            # Convert LinkedIn PDF to images for preview purposes
                            if plt == "linkedin":
                                pdf_path = OUTPUT_PDF_DIR / f"{post_id}_linkedin.pdf"
                                if pdf_path.exists():
                                    export_images(pdf_path, img_dir)
                                    
                            if img_dir.exists():
                                imgs = sorted(list(img_dir.glob("*.png")))
                                if imgs:
                                    st.write(f"**{plt.replace('_', ' ').title()}**")
                                    prev_cols = st.columns(min(len(imgs), 4))
                                    for idx, img_path in enumerate(imgs):
                                        with prev_cols[idx % 4]:
                                            st.image(str(img_path), caption=f"Slide {idx+1}")
            
            with col_b2:
                if st.button("Save Post to Database", type="primary", use_container_width=True):
                    save_post(new_post)
                    st.success(f"Post saved as Draft! Head to the Visual Generator tab to verify.")

# ─────────────────────────────────────────────────────────────
# 🎨 TAB 4: VISUAL GENERATOR
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
                from src.generator.base import export_images
                for plt in platforms_to_run:
                    img_dir = OUTPUT_IMG_DIR / plt / selected_post_id
                    
                    if plt == "linkedin":
                         pdf_path = OUTPUT_PDF_DIR / f"{selected_post_id}_linkedin.pdf"
                         if pdf_path.exists():
                             export_images(pdf_path, img_dir)
                             
                    if img_dir.exists():
                        st.subheader(f"{plt.replace('_', ' ').title()} Preview")
                        imgs = sorted(list(img_dir.glob("*.png")))
                        if imgs:
                            cols = st.columns(min(len(imgs), 5))
                            for idx, img_path in enumerate(imgs):
                                with cols[idx % 5]:
                                    st.image(str(img_path), caption=f"Slide {idx+1}")
