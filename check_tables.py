import requests
import json

SUPABASE_URL = "https://grjgdejlbebgxbrnufrz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyamdkZWpsYmViZ3hicm51ZnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjY3NTgsImV4cCI6MjA4NDkwMjc1OH0.DeQ07otbbG6lB5TVqHsF1ntDzOdxo2t_laQV0i8EFR0"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def check(table_name):
    with open("schema_info.txt", "a") as f:
        f.write(f"\n--- Checking '{table_name}' ---\n")
        url = f"{SUPABASE_URL}/rest/v1/{table_name}?select=*&limit=1"
        response = requests.get(url, headers=HEADERS)
        
        if response.status_code == 200:
            data = response.json()
            if len(data) > 0:
                f.write(f"Success! Found {len(data)} row(s).\n")
                f.write(f"Columns: {list(data[0].keys())}\n")
            else:
                f.write("Success! Table exists but is empty.\n")
        else:
            f.write(f"Error {response.status_code}: {response.text}\n")

if __name__ == "__main__":
    # Clear file first
    with open("schema_info.txt", "w") as f:
        f.write("Schema Check:\n")
    check("transaksi")
    check("detail_transaksi")
