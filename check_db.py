from supabase import create_client
import os

# Copy instructions from kasir_toko.py
SUPABASE_URL = "https://grjgdejlbebgxbrnufrz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyamdkZWpsYmViZ3hicm51ZnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjY3NTgsImV4cCI6MjA4NDkwMjc1OH0.DeQ07otbbG6lB5TVqHsF1ntDzOdxo2t_laQV0i8EFR0"

try:
    print("Connecting to Supabase...")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Checking 'print_queue' table...")
    res = client.table("print_queue").select("*").limit(5).execute()
    print(f"Success! Count: {len(res.data)}")
    print(f"Data: {res.data}")
    
except Exception as e:
    print(f"ERROR: {e}")
