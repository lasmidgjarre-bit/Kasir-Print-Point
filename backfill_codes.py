import os
import requests
import json

# Configuration
SUPABASE_URL = "https://grjgdejlbebgxbrnufrz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyamdkZWpsYmViZ3hicm51ZnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjY3NTgsImV4cCI6MjA4NDkwMjc1OH0.DeQ07otbbG6lB5TVqHsF1ntDzOdxo2t_laQV0i8EFR0"

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def get_all_products():
    url = f"{SUPABASE_URL}/rest/v1/produk?select=id,kode_barang,nama_barang&order=id.asc"
    response = requests.get(url, headers=HEADERS)
    if response.status_code != 200:
        print(f"Error fetching products: {response.text}")
        return []
    return response.json()

def update_product_code(id, code):
    url = f"{SUPABASE_URL}/rest/v1/produk?id=eq.{id}"
    payload = {"kode_barang": str(code)}
    response = requests.patch(url, headers=HEADERS, json=payload)
    if response.status_code < 300:
        print(f"Updated product {id} with code {code}")
        return True
    else:
        print(f"Failed to update product {id}: {response.text}")
        return False

def main():
    print(" Fetching products...")
    products = get_all_products()
    print(f" Found {len(products)} products.")

    # 1. Determine starting code
    # Find max existing code to ensure we don't duplicate if some are filled
    existing_codes = []
    products_to_update = []

    for p in products:
        code = p.get('kode_barang')
        if code and code.strip() != "":
            try:
                existing_codes.append(int(code))
            except ValueError:
                pass # Ignore non-numeric codes
        else:
            products_to_update.append(p)

    next_code = 1001
    if existing_codes:
        next_code = max(existing_codes) + 1
    
    print(f" Starting code generation from: {next_code}")
    print(f" Found {len(products_to_update)} products needing codes.")

    # 2. Update products
    for p in products_to_update:
        success = update_product_code(p['id'], next_code)
        if success:
            next_code += 1

    print(" Done!")

if __name__ == "__main__":
    main()
