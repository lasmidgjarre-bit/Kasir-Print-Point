import requests
import json

SUPABASE_URL = "https://grjgdejlbebgxbrnufrz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyamdkZWpsYmViZ3hicm51ZnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjY3NTgsImV4cCI6MjA4NDkwMjc1OH0.DeQ07otbbG6lB5TVqHsF1ntDzOdxo2t_laQV0i8EFR0"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def check_status():
    url = f"{SUPABASE_URL}/rest/v1/produk?select=id,kode_barang&order=id.asc"
    resp = requests.get(url, headers=HEADERS)
    products = resp.json()
    
    missing = [p for p in products if not p.get('kode_barang')]
    
    print(f"Total Products: {len(products)}")
    print(f"Missing Codes : {len(missing)}")
    
    if missing:
        print("Sample IDs missing:", [p['id'] for p in missing[:5]])

if __name__ == "__main__":
    check_status()
