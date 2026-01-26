import flet as ft
# --- BAGIAN 1: KONFIGURASI SUPABASE ---
import os
from supabase import create_client, Client

# GANTI DENGAN KREDENSIAL SUPABASE ANDA
SUPABASE_URL = "https://grjgdejlbebgxbrnufrz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyamdkZWpsYmViZ3hicm51ZnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjY3NTgsImV4cCI6MjA4NDkwMjc1OH0.DeQ07otbbG6lB5TVqHsF1ntDzOdxo2t_laQV0i8EFR0"

class SupabaseHandler:
    def __init__(self):
        try:
            self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
            print("Berhasil inisialisasi Supabase Client")
        except Exception as e:
            print(f"Error inisialisasi Supabase: {e}")
            self.client = None

    def simpan_transaksi(self, total, keranjang):
        if not self.client:
            print("Supabase client belum siap.")
            return None

        # 1. Simpan Header Transaksi
        # Kolom 'tanggal' akan otomatis diisi oleh default value di Supabase (now())
        data_header = {"total_bayar": total}
        
        try:
            res_header = self.client.table("transaksi").insert(data_header).execute()
            
            if not res_header.data:
                raise Exception("Gagal menyimpan header transaksi")

            id_transaksi = res_header.data[0]['id']
            print(f"Header transaksi tersimpan. ID: {id_transaksi}")

            # 2. Simpan Detail Barang
            data_detail = []
            for item in keranjang:
                data_detail.append({
                    "transaksi_id": id_transaksi,
                    "nama_barang": item['nama'],
                    "qty": item['qty'],
                    "harga": item['harga'],
                    "subtotal": item['subtotal']
                })
            
            self.client.table("detail_transaksi").insert(data_detail).execute()
            print("Detail transaksi tersimpan.")
            
            return id_transaksi

        except Exception as e:
            print(f"Terjadi kesalahan saat simpan ke Supabase: {e}")
            return None

    def tambah_produk(self, nama, beli, jual, stok):
        if not self.client: return False
        try:
            data = {
                "nama_barang": nama,
                "harga_beli": beli,
                "harga_jual": jual,
                "stok": stok
            }
            self.client.table("produk").insert(data).execute()
            print(f"Produk {nama} berhasil ditambah.")
            return True
        except Exception as e:
            print(f"Gagal tambah produk: {e}")
            return False

    def ambil_produk(self):
        if not self.client: return []
        try:
            res = self.client.table("produk").select("*").order("id", desc=True).execute()
            return res.data
        except Exception as e:
            print(f"Gagal ambil produk: {e}")
            return []

# Inisialisasi Handler
db = SupabaseHandler()

# --- BAGIAN 2: UI APLIKASI (FLET) ---
def main(page: ft.Page):
    page.title = "Kasir Fotokopi (Server PC)"
    page.theme_mode = ft.ThemeMode.LIGHT
    page.padding = 20

    # Variabel State (Keranjang Belanja)
    keranjang = [] 

    # --- KOMPONEN UI ---
    txt_nama = ft.TextField(label="Nama Barang / Jasa", expand=True, autofocus=True)
    txt_qty = ft.TextField(label="Qty", width=100, value="1", keyboard_type=ft.KeyboardType.NUMBER)
    txt_harga = ft.TextField(label="Harga (@)", width=150, keyboard_type=ft.KeyboardType.NUMBER)
    
    tabel_keranjang = ft.DataTable(
        columns=[
            ft.DataColumn(ft.Text("Barang")),
            ft.DataColumn(ft.Text("Qty")),
            ft.DataColumn(ft.Text("Harga")),
            ft.DataColumn(ft.Text("Subtotal")),
        ],
        rows=[]
    )

    txt_total_bayar = ft.Text("Total: Rp 0", size=30, weight="bold", color=ft.Colors.BLUE_800)

# --- BAGIAN 2: UI APLIKASI (FLET) ---
def main(page: ft.Page):
    page.title = "Kasir Fotokopi (Server PC)"
    page.theme_mode = ft.ThemeMode.LIGHT
    page.padding = 20

    # ==========================
    # TAB 1: KASIR
    # ==========================
    keranjang = [] 

    txt_nama = ft.TextField(label="Nama Barang / Jasa", expand=True, autofocus=True)
    txt_qty = ft.TextField(label="Qty", width=100, value="1", keyboard_type=ft.KeyboardType.NUMBER)
    txt_harga = ft.TextField(label="Harga (@)", width=150, keyboard_type=ft.KeyboardType.NUMBER)
    
    tabel_keranjang = ft.DataTable(
        columns=[
            ft.DataColumn(ft.Text("Barang")),
            ft.DataColumn(ft.Text("Qty")),
            ft.DataColumn(ft.Text("Harga")),
            ft.DataColumn(ft.Text("Subtotal")),
        ],
        rows=[]
    )

    txt_total_bayar = ft.Text("Total: Rp 0", size=30, weight="bold", color=ft.Colors.BLUE_800)

    def update_tabel_kasir():
        tabel_keranjang.rows.clear()
        grand_total = 0
        for item in keranjang:
            grand_total += item['subtotal']
            tabel_keranjang.rows.append(
                ft.DataRow(cells=[
                    ft.DataCell(ft.Text(item['nama'])),
                    ft.DataCell(ft.Text(str(item['qty']))),
                    ft.DataCell(ft.Text(f"{item['harga']:,}")),
                    ft.DataCell(ft.Text(f"{item['subtotal']:,}")),
                ])
            )
        txt_total_bayar.value = f"Total: Rp {grand_total:,}"
        page.update()

    def tambah_klik(e):
        if not txt_nama.value or not txt_harga.value:
            page.snack_bar = ft.SnackBar(ft.Text("Isi nama dan harga dulu!"))
            page.snack_bar.open = True
            page.update()
            return

        qty = int(txt_qty.value)
        harga = int(txt_harga.value)
        subtotal = qty * harga

        keranjang.append({
            "nama": txt_nama.value,
            "qty": qty,
            "harga": harga,
            "subtotal": subtotal
        })

        txt_nama.value = ""
        txt_qty.value = "1"
        txt_nama.focus()
        update_tabel_kasir()

    def bayar_klik(e):
        if not keranjang: return
        
        total = sum(item['subtotal'] for item in keranjang)
        id_struk = db.simpan_transaksi(total, keranjang)
        
        if id_struk:
            keranjang.clear()
            update_tabel_kasir()
            dlg = ft.AlertDialog(title=ft.Text(f"Sukses! Struk #{id_struk} Tersimpan"))
            page.dialog = dlg
            dlg.open = True
            page.update()
        else:
            page.snack_bar = ft.SnackBar(ft.Text("Gagal menyimpan transaksi!"))
            page.snack_bar.open = True
            page.update()

    btn_tambah = ft.ElevatedButton("TAMBAH (+)", on_click=tambah_klik, height=50, bgcolor=ft.Colors.BLUE_600, color="white")
    btn_bayar = ft.ElevatedButton("BAYAR & SIMPAN", on_click=bayar_klik, height=50, width=200, bgcolor=ft.Colors.GREEN_600, color="white")

    view_kasir = ft.Column([
        ft.Text("TRANSAKSI KASIR", size=20, weight="bold"),
        ft.Divider(),
        ft.Row([txt_nama, txt_qty, txt_harga]),
        btn_tambah,
        ft.Divider(),
        ft.Container(content=tabel_keranjang, border=ft.Border.all(1, "grey"), border_radius=10, padding=10),
        ft.Row([txt_total_bayar, btn_bayar], alignment=ft.MainAxisAlignment.SPACE_BETWEEN)
    ])

    # ==========================
    # TAB 2: DATA BARANG (PRODUK)
    # ==========================
    txt_prod_nama = ft.TextField(label="Nama Barang", expand=True)
    txt_prod_beli = ft.TextField(label="Harga Beli (Modal)", expand=True, keyboard_type=ft.KeyboardType.NUMBER)
    txt_prod_jual = ft.TextField(label="Harga Jual", expand=True, keyboard_type=ft.KeyboardType.NUMBER)
    txt_prod_stok = ft.TextField(label="Stok Awal", width=100, value="0", keyboard_type=ft.KeyboardType.NUMBER)

    tabel_produk = ft.DataTable(
        columns=[
            ft.DataColumn(ft.Text("ID")),
            ft.DataColumn(ft.Text("Nama Barang")),
            ft.DataColumn(ft.Text("Modal")),
            ft.DataColumn(ft.Text("Harga Jual")),
            ft.DataColumn(ft.Text("Stok")),
        ],
        rows=[]
    )

    def load_data_produk():
        tabel_produk.rows.clear()
        data = db.ambil_produk()
        for p in data:
            tabel_produk.rows.append(
                ft.DataRow(cells=[
                    ft.DataCell(ft.Text(str(p['id']))),
                    ft.DataCell(ft.Text(p['nama_barang'])),
                    ft.DataCell(ft.Text(f"{p['harga_beli']:,}")),
                    ft.DataCell(ft.Text(f"{p['harga_jual']:,}")),
                    ft.DataCell(ft.Text(str(p['stok']))),
                ])
            )
        page.update()

    def simpan_produk_klik(e):
        if not txt_prod_nama.value:
            return
        
        sukses = db.tambah_produk(
            txt_prod_nama.value,
            int(txt_prod_beli.value or 0),
            int(txt_prod_jual.value or 0),
            int(txt_prod_stok.value or 0)
        )

        if sukses:
            txt_prod_nama.value = ""
            txt_prod_beli.value = ""
            txt_prod_jual.value = ""
            txt_prod_stok.value = "0"
            load_data_produk()
            page.snack_bar = ft.SnackBar(ft.Text("Produk berhasil disimpan"))
            page.snack_bar.open = True
            page.update()

    btn_simpan_produk = ft.ElevatedButton("SIMPAN PRODUK", on_click=simpan_produk_klik, bgcolor=ft.Colors.ORANGE_600, color="white")
    btn_refresh = ft.IconButton(icon=ft.Icons.REFRESH, on_click=lambda e: load_data_produk())

    view_data_barang = ft.Column([
        ft.Row([ft.Text("DATABASE BARANG", size=20, weight="bold"), btn_refresh], alignment=ft.MainAxisAlignment.SPACE_BETWEEN),
        ft.Divider(),
        ft.Row([txt_prod_nama, txt_prod_stok]),
        ft.Row([txt_prod_beli, txt_prod_jual]),
        btn_simpan_produk,
        ft.Divider(),
        ft.Container(content=tabel_produk, border=ft.Border.all(1, "grey"), border_radius=10, padding=10, expand=True),
    ], scroll=ft.ScrollMode.AUTO)

    # ==========================
    # UTAMA: NAVIGATION (CUSTOM TABS)
    # ==========================
    # Container untuk menampung konten aktif (Kasir atau Data Barang)
    content_area = ft.Container(content=view_kasir, expand=True)

    def menu_klik(e):
        # Reset style tombol
        btn_menu_kasir.bgcolor = ft.Colors.GREY_300
        btn_menu_barang.bgcolor = ft.Colors.GREY_300
        btn_menu_kasir.color = ft.Colors.BLACK
        btn_menu_barang.color = ft.Colors.BLACK
        
        # Highlight tombol aktif
        e.control.bgcolor = ft.Colors.BLUE_600
        e.control.color = ft.Colors.WHITE
        
        # Ganti konten
        if e.control.data == "kasir":
            content_area.content = view_kasir
        else:
            content_area.content = view_data_barang
        
        content_area.update()
        page.update()

    btn_menu_kasir = ft.ElevatedButton(
        "KASIR", 
        data="kasir", 
        on_click=menu_klik, 
        width=150,
        bgcolor=ft.Colors.BLUE_600, # Default aktif
        color=ft.Colors.WHITE
    )
    
    btn_menu_barang = ft.ElevatedButton(
        "DATA BARANG", 
        data="barang", 
        on_click=menu_klik, 
        width=150,
        bgcolor=ft.Colors.GREY_300,
        color=ft.Colors.BLACK
    )

    page.add(
        ft.Row([btn_menu_kasir, btn_menu_barang], alignment=ft.MainAxisAlignment.CENTER),
        ft.Divider(),
        content_area
    )
    
    # Load data awal saat aplikasi mulai
    load_data_produk()

# --- BAGIAN 3: JALANKAN SEBAGAI SERVER ---
# host='0.0.0.0' artinya bisa diakses oleh komputer/HP lain di WiFi yang sama
import traceback
try:
    print("Starting Flet app VERSION 3.0...")
    # ft.app(target=main, view=ft.AppView.WEB_BROWSER, port=8551, host='0.0.0.0')
    ft.app(target=main, port=8553)
except Exception as e:
    print("CRITICAL ERROR STARTING APP:")
    traceback.print_exc()
    input("Press Enter to exit...")