import requests
import json

SUPABASE_URL = "https://grjgdejlbebgxbrnufrz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyamdkZWpsYmViZ3hicm51ZnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjY3NTgsImV4cCI6MjA4NDkwMjc1OH0.DeQ07otbbG6lB5TVqHsF1ntDzOdxo2t_laQV0i8EFR0"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def verify():
    url = f"{SUPABASE_URL}/rest/v1/produk?select=id,kode_barang,nama_barang&order=id.asc"
    resp = requests.get(url, headers=HEADERS)
    products = resp.json()
    
    print(f"{'ID':<5} | {'Code':<10} | {'Name'}")
    print("-" * 50)
    for p in products:
        print(f"{p['id']:<5} | {str(p.get('kode_barang')):<10} | {p['nama_barang']}")

if __name__ == "__main__":
    verify()
