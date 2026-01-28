import requests
import json

SUPABASE_URL = "https://grjgdejlbebgxbrnufrz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyamdkZWpsYmViZ3hicm51ZnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjY3NTgsImV4cCI6MjA4NDkwMjc1OH0.DeQ07otbbG6lB5TVqHsF1ntDzOdxo2t_laQV0i8EFR0"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def check_queue():
    print("Checking 'print_queue' table...")
    # Get count of pending
    url = f"{SUPABASE_URL}/rest/v1/print_queue?select=*&status=eq.Pending"
    response = requests.get(url, headers=HEADERS)
    
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Table exists.")
        print(f"Pending Items Count: {len(data)}")
        print("Data sample:", data[:2])
    elif response.status_code == 404:
        print("Error 404: Table 'print_queue' likely does not exist.")
    else:
        print(f"Error {response.status_code}: {response.text}")

if __name__ == "__main__":
    check_queue()
