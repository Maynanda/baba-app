import os
from google import genai
from dotenv import load_dotenv

load_dotenv(override=True)
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

models_to_test = [
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "gemini-flash-latest"
]

for m in models_to_test:
    print(f"Testing {m}...")
    try:
        res = client.models.generate_content(model=m, contents="hi")
        print(f"  [SUCCESS] {m}: {res.text.strip()}")
        break
    except Exception as e:
        print(f"  [FAILED] {m}: {e}")
