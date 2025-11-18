import os
import time
from datetime import datetime, timezone

from dotenv import load_dotenv

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

from supabase import create_client, Client

# === Supabase Setup ===
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")  # service role, only in .env

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# === Selenium Setup ===
options = Options()
options.add_argument("--headless=new")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
# Pretend to be a normal desktop Chrome
options.add_argument(
    "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/123.0.0.0 Safari/537.36"
)

driver = webdriver.Chrome(
    service=Service(ChromeDriverManager().install()),
    options=options,
)

# === Scraping Logic ===
base_url = (
    "https://www.tcgplayer.com/search/pokemon/product"
    "?productLineName=pokemon&view=grid&ProductTypeName=Cards"
    "&page={}&setName=crown-zenith|crown-zenith-galarian-gallery"
    "|sv10-destined-rivals|sv-prismatic-evolutions"
)

MAX_PAGES = 36

try:
    for page_num in range(1, MAX_PAGES + 1):
        print(f"\n🌐 Scraping Page {page_num}...")
        url = base_url.format(page_num)
        driver.get(url)

        # Optional: wait for full document ready
        try:
            WebDriverWait(driver, 20).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
        except Exception:
            # Not fatal, just continue
            pass

        # Main wait for results
        try:
            WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".search-result"))
            )
        except TimeoutException:
            print("⚠️ Timeout waiting for cards to load.")
            # DEBUG: see what the headless browser actually got
            current_url = driver.current_url
            print(f"    Current URL: {current_url}")
            debug_path = f"debug_page_{page_num}.html"
            try:
                with open(debug_path, "w", encoding="utf-8") as f:
                    f.write(driver.page_source)
                print(f"    Saved page HTML to {debug_path} for inspection.")
            except Exception as e:
                print(f"    Failed to save debug HTML: {e}")
            continue

        time.sleep(2)
        cards = driver.find_elements(By.CSS_SELECTOR, ".search-result")
        print(f"🔎 Found {len(cards)} cards on Page {page_num}")

        upsert_rows = []

        for card in cards:
            # --- Card name ---
            try:
                name = card.find_element(
                    By.CLASS_NAME,
                    "product-card__title"
                ).text.strip()
            except Exception:
                continue  # Skip incomplete entries

            # --- Set name ---
            try:
                set_name = card.find_element(
                    By.CLASS_NAME, "product-card__set-name__variant"
                ).text.strip()
            except Exception:
                set_name = "N/A"

            # --- Rarity / misc string (may include card number) ---
            try:
                rarity = card.find_element(
                    By.CLASS_NAME, "product-card__rarity__variant"
                ).text.strip()
            except Exception:
                rarity = "N/A"

            # --- Card number heuristic (you can refine later) ---
            try:
                if "," in rarity:
                    # e.g. "Ultra Rare, #123/172"
                    card_num = rarity.split(",")[-1].strip()
                else:
                    card_num = "N/A"
            except Exception:
                card_num = "N/A"

            # If we don't get a usable set_name or card_num, skip this row
            if set_name == "N/A" or card_num == "N/A":
                continue

            # --- Market price ---
            try:
                price_raw = card.find_element(
                    By.CLASS_NAME, "product-card__market-price--value"
                ).text.strip()
                price = float(price_raw.replace("$", "").replace(",", ""))
            except Exception:
                price = None

            # --- Image URL (optional; handy for backfilling missing images) ---
            try:
                img = card.find_element(By.CSS_SELECTOR, ".product-card__image img")
                driver.execute_script("arguments[0].scrollIntoView(true);", img)
                time.sleep(0.1)
                image_url = (
                    img.get_attribute("data-srcset")
                    or img.get_attribute("srcset")
                    or img.get_attribute("data-src")
                    or img.get_attribute("src")
                    or "N/A"
                )
                if "," in image_url:
                    image_url = image_url.split(",")[-1].split(" ")[0].strip()
            except Exception:
                image_url = "N/A"

            print(f"💎 {name} | {set_name} | {card_num} | price={price}")

            row = {
                "card_name": name,
                "set_name": set_name,
                "card_number": card_num,
                "rarity": rarity,
                "ungraded_market_price": price,
                "date_updated": datetime.now(timezone.utc).isoformat(),
                # If you want to backfill images when present:
                # "image_url": image_url if image_url != "N/A" else None,
            }

            upsert_rows.append(row)

        if upsert_rows:
            print(f"📥 Upserting {len(upsert_rows)} rows into all_cards...")
            supabase.table("all_cards").upsert(
                upsert_rows,
                on_conflict="set_name,card_number,card_name",
            ).execute()

finally:
    driver.quit()
    print("✅ Finished scraping + upserts. Browser closed.")

