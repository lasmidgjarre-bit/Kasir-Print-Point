from supabase import create_client
import datetime

SUPABASE_URL = "https://grjgdejlbebgxbrnufrz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyamdkZWpsYmViZ3hicm51ZnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjY3NTgsImV4cCI6MjA4NDkwMjc1OH0.DeQ07otbbG6lB5TVqHsF1ntDzOdxo2t_laQV0i8EFR0"

try:
    print("Connecting to Supabase...")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    print("Seeding dummy files...")
    dummy_data = [
        {
            "filename": "Skripsi_Bab1.pdf",
            "tipe_print": "Dokumen",
            "catatan": "Print warna halaman 1-5",
            "status": "Pending",
            "device_info": "Android Chrome",
            "created_at": datetime.datetime.now().isoformat()
        },
        {
            "filename": "Foto_Wisuda.jpg",
            "tipe_print": "Foto",
            "catatan": "Kertas Glossy 4R",
            "status": "Selesai",
             "device_info": "iPhone Safari",
            "created_at": (datetime.datetime.now() - datetime.timedelta(hours=1)).isoformat()
        }
    ]
    
    res = client.table("print_queue").insert(dummy_data).execute()
    print(f"Success! Inserted: {len(res.data)} rows")

except Exception as e:
    print(f"ERROR: {e}")
