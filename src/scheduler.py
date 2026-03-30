import schedule
import time
import generator
from datetime import datetime

def job():
    print(f"[{datetime.now()}] Checking for new carousel data...")
    generator.process_all_files()

# Schedule the job
# For testing purposes, let's run it every 10 seconds.
# For production, you could do: schedule.every().day.at("09:00").do(job)
schedule.every(10).seconds.do(job)

if __name__ == "__main__":
    print("Starting generator scheduler (checks every 10 seconds).")
    print("Press Ctrl+C to exit.")
    
    # Run once immediately on start
    job()
    
    while True:
        schedule.run_pending()
        time.sleep(1)
