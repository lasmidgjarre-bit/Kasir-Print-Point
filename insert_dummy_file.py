import requests
import json
import time

SUPABASE_URL = "https://grjgdejlbebgxbrnufrz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyamdkZWpsYmViZ3hicm51ZnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjY3NTgsImV4cCI6MjA4NDkwMjc1OH0.DeQ07otbbG6lB5TVqHsF1ntDzOdxo2t_laQV0i8EFR0"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def insert_dummy():
    print("Inserting dummy pending file...")
    payload = {
        "tipe_print": "Dokumen",
        "catatan": "Test Notification",
        "file_url": "https://example.com/test.pdf",
        "status": "Pending",
        "filename": "test_notif.pdf"
    }
    
    url = f"{SUPABASE_URL}/rest/v1/print_queue"
    response = requests.post(url, headers=HEADERS, json=payload)
    
    if response.status_code == 201:
        print("Success! Dummy file inserted.")
    else:
        print(f"Error {response.status_code}: {response.text}")

if __name__ == "__main__":
    insert_dummy()
