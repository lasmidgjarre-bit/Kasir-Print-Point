
// --- KONFIGURASI SUPABASE ---
const SUPABASE_URL = "https://grjgdejlbebgxbrnufrz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyamdkZWpsYmViZ3hicm51ZnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjY3NTgsImV4cCI6MjA4NDkwMjc1OH0.DeQ07otbbG6lB5TVqHsF1ntDzOdxo2t_laQV0i8EFR0";

// ImageKit Config
const IMAGEKIT_PRIVATE_KEY = "private_ZU1fCm4YTcBkPHOjrxjvoeM14EQ=";
const IMAGEKIT_ENDPOINT = "https://upload.imagekit.io/api/v1/files";

// Inisialisasi Client
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State Aplikasi
let cart = [];
let productsCache = [];
let currentImageFile = null;
let stream = null;

// --- UTILS ---
const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
}

const toast = (message) => {
    const el = document.getElementById('toast');
    el.innerText = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
}

// --- TABS LOGIC ---
// --- TABS LOGIC ---
function switchTab(tabName) {
    console.log("Switching to:", tabName);
    try {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

        // Show selected
        const target = document.getElementById(`tab-${tabName}`);
        if (target) target.classList.add('active');

        // Update nav button
        let btnIndex = 0;
        if (tabName === 'kasir') btnIndex = 0;
        else if (tabName === 'files') btnIndex = 1;
        else if (tabName === 'barang') btnIndex = 2;

        const btns = document.querySelectorAll('.nav-btn');
        // Note: The nav buttons structure changed in index.html, need to be careful with index or use logic based on text
        // Improved logic: find button that calls this SwitchTab
        // But simple index fix for now:
        // Nav 1: Kasir, Nav 2: File Masuk, Nav 3: Data Barang
        if (btns[btnIndex]) btns[btnIndex].classList.add('active');

        if (tabName === 'barang') loadProducts();
        if (tabName === 'files') loadFiles();
    } catch (e) {
        alert("Error switching tab: " + e.message);
    }
}

// ... existing code ...

// --- FILE MASUK LOGIC ---
const PRICE_STORAGE_KEY = 'custom_price_list';

let priceList = [];

async function loadPrices() {
    // Try fetch from DB first
    const { data, error } = await db
        .from('daftar_harga')
        .select('*')
        .order('id', { ascending: true });

    if (!error && data.length > 0) {
        priceList = data;
    } else {
        // Fallback or Empty
        if (priceList.length === 0) {
            // Keep existing if local has content? No, priority is DB.
            // If DB empty, maybe init with default?
            // Let's just show empty or default if really empty
            // priceList = [...DEFAULT_PRICES]; // Optional: init default if DB empty
        }
    }
    renderPriceTable();
    updateCashierSuggestions();
}

function renderPriceTable() {
    const tbody = document.getElementById('price-list-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    priceList.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:center">${index + 1}</td>
            <td><input type="text" value="${item.nama_jasa}" class="table-input" onchange="updatePriceRow(${index}, 'nama_jasa', this.value)" placeholder="Nama Jasa"></td>
            <td><input type="text" value="${item.harga}" class="table-input" onchange="updatePriceRow(${index}, 'harga', this.value)" placeholder="Harga"></td>
            <td><input type="text" value="${item.satuan}" class="table-input" style="width: 60px;" onchange="updatePriceRow(${index}, 'satuan', this.value)" placeholder="Satuan"></td>
            <td style="text-align:center">
                <button class="btn-icon-sm" onclick="deletePriceRow(${index})" style="color: #ef4444;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updatePriceRow(index, field, value) {
    if (priceList[index]) {
        priceList[index][field] = value;
        // Mark as modified if needed, but for now we just hold in memory until Save button
    }
}

function addPriceRow() {
    // Temporary ID for new items (will be replaced by DB ID after save)
    priceList.push({ nama_jasa: '', harga: '', satuan: '' });
    renderPriceTable();
}

function deletePriceRow(index) {
    // Just remove from memory list. 
    // If it had an ID, we might need to track deletions, 
    // but simplified approach: "Sync" = Delete All + Insert All is safer for ordering/consistency if list is small.
    // OR: We'll just filter it out and save.
    if (confirm('Hapus baris ini?')) {
        priceList.splice(index, 1);
        renderPriceTable();
    }
}

async function savePricesToDb() {
    const btn = event.target; // Capture button if possible
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';
    btn.disabled = true;

    try {
        // Strategy: 
        // 1. Delete all current rows (simplest way to ensure order and deletions match)
        // 2. Insert all rows from memory
        // This is acceptable for a small price list.

        // Step 1: Delete all
        const { error: delError } = await db
            .from('daftar_harga')
            .delete()
            .neq('id', 0); // Delete all where ID != 0 (basically all)

        if (delError) throw delError;

        // Step 2: Prepare data (remove ID to let DB generate new ones, or keep if we want upscale logic)
        // Actually, enable 'neq' delete requires a policy allowing delete.

        const cleanData = priceList.map(p => ({
            nama_jasa: p.nama_jasa,
            harga: p.harga,
            satuan: p.satuan
        }));

        if (cleanData.length > 0) {
            const { error: insError } = await db
                .from('daftar_harga')
                .insert(cleanData);

            if (insError) throw insError;
        }

        toast("Daftar harga berhasil disimpan!");
        loadPrices(); // Reload to get new IDs
    } catch (e) {
        console.error(e);
        toast("Gagal simpan ke database!");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Deprecated: LocalStorage Save
function savePrices() {
    // No-op or maybe save to local as backup
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadPrices();
});

async function loadFiles() {
    const tbody = document.getElementById('files-body');
    console.log("Loading files... HTML Element:", tbody); // Debug Log V2
    if (!tbody) {
        console.error("FATAL: Element #files-body not found in DOM!");
        toast("Error Sistem: Tabel file tidak ditemukan. Coba refresh.");
        return;
    }
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Loading...</td></tr>';

    const { data, error } = await db
        .from('print_queue')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error(error);
        toast("Gagal ambil data file");
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Gagal mengambil data. Pastikan tabel database sudah dibuat.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">Belum ada file masuk.</td></tr>';
        return;
    }

    data.forEach(item => {
        const tr = document.createElement('tr');
        const date = new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        let statusBadge = `<span style="background:#e2e8f0; color:#475569; padding:4px 8px; border-radius:4px; font-size:0.8rem;">${item.status}</span>`;
        if (item.status === 'Selesai') {
            statusBadge = `<span style="background:#dcfce7; color:#16a34a; padding:4px 8px; border-radius:4px; font-size:0.8rem;">Selesai</span>`;
        }

        tr.innerHTML = `
            <td>${date}</td>
            <td>
                <div style="font-weight:600;">${item.tipe_print}</div>
                <div style="font-size:0.8rem; color:#64748b;">${item.filename || 'No Name'}</div>
            </td>
            <td>${item.catatan || '-'}</td>
            <td>${statusBadge}</td>
            <td>
                <div style="display:flex; gap:5px;">
                    <a href="${item.file_url}" target="_blank" class="btn-icon" style="background:#eff6ff; color:#2563eb; text-decoration:none;" title="Download/Lihat">
                        <i class="fa-solid fa-download"></i>
                    </a>
                    <button class="btn-icon" onclick="markFileDone(${item.id})" style="background:#f0fdf4; color:#16a34a;" title="Tandai Selesai">
                        <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteFile(${item.id})" style="background:#fef2f2; color:#ef4444;" title="Hapus">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function markFileDone(id) {
    const { error } = await db
        .from('print_queue')
        .update({ status: 'Selesai' })
        .eq('id', id);

    if (error) toast("Gagal update status");
    else {
        toast("Status diperbarui");
        loadFiles();
    }
}

async function deleteFile(id) {
    if (!confirm("Hapus file ini dari daftar?")) return;

    const { error } = await db
        .from('print_queue')
        .delete()
        .eq('id', id);

    if (error) toast("Gagal hapus");
    else {
        loadFiles();
    }
}

// --- DATA BARANG (PRODUCT) LOGIC ---
let editingProductId = null; // Track if we are editing

async function loadProducts() {
    const tbody = document.getElementById('product-body');
    const datalist = document.getElementById('produk-list');

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Loading...</td></tr>'; // Updates colspan to 6

    const { data, error } = await db
        .from('produk')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error(error);
        toast("Gagal ambil data produk");
        return;
    }

    productsCache = data; // Simpan untuk autocomplete
    tbody.innerHTML = '';
    datalist.innerHTML = ''; // Clear datalist

    data.forEach(p => {
        // Render Table
        const tr = document.createElement('tr');
        const imgUrl = p.foto_url || 'https://via.placeholder.com/50?text=No+Img';
        tr.innerHTML = `
            <td>${p.id}</td>
            <td>${p.kode_barang || '-'}</td>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${imgUrl}" style="width:50px; height:50px; object-fit:cover; border-radius:4px;">
                    ${p.nama_barang}
                </div>
            </td>
            <td class="money">${formatRupiah(p.harga_beli)}</td>
            <td class="money">${formatRupiah(p.harga_jual)}</td>
            <td>${p.stok}</td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button class="btn-icon" onclick="editProduct(${p.id})" style="background:#eff6ff; color:#3b82f6;" title="Edit">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-icon" onclick="deleteProduct(${p.id})" style="background:#fef2f2; color:#ef4444;" title="Hapus">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);

        // Render Datalist for Autocomplete
        const option = document.createElement('option');
        option.value = p.nama_barang;
        datalist.appendChild(option);
    });

    // Update suggestions if currently selected type matches
    updateCashierSuggestions();
}

function editProduct(id) {
    const product = productsCache.find(p => p.id === id);
    if (!product) return;

    // Populate Fields
    document.getElementById('prod-nama').value = product.nama_barang;
    document.getElementById('prod-kode').value = product.kode_barang || '';
    document.getElementById('prod-stok').value = product.stok;
    document.getElementById('prod-beli').value = product.harga_beli;
    document.getElementById('prod-jual').value = product.harga_jual;

    // Handle Image Preview
    const imgPreview = document.getElementById('image-result');
    const previewContainer = document.getElementById('image-preview-container');
    if (product.foto_url) {
        imgPreview.src = product.foto_url;
        previewContainer.style.display = 'block';
    } else {
        imgPreview.src = '';
        previewContainer.style.display = 'none';
    }

    // Set UI State
    editingProductId = id;
    document.getElementById('btn-save-product').innerHTML = '<i class="fa-solid fa-save"></i> UPDATE PRODUK';
    document.getElementById('btn-cancel-edit').style.display = 'inline-block';

    // Scroll to top
    document.querySelector('.card').scrollIntoView({ behavior: 'smooth' });
}

function cancelEditProduct() {
    editingProductId = null;

    // Reset Fields
    document.getElementById('prod-nama').value = '';
    document.getElementById('prod-kode').value = '';
    document.getElementById('prod-stok').value = '0';
    document.getElementById('prod-beli').value = '';
    document.getElementById('prod-jual').value = '';

    // Reset Image
    document.getElementById('image-result').src = '';
    document.getElementById('image-preview-container').style.display = 'none';
    currentImageFile = null;

    // Reset UI State
    document.getElementById('btn-save-product').innerHTML = '<i class="fa-solid fa-plus"></i> Tambah Produk';
    document.getElementById('btn-cancel-edit').style.display = 'none';
}

async function deleteProduct(id) {
    if (!confirm("Yakin ingin menghapus produk ini?")) return;

    const { error } = await db
        .from('produk')
        .delete()
        .eq('id', id);

    if (error) toast("Gagal hapus produk");
    else {
        toast("Produk dihapus");
        loadProducts();
    }
}

async function saveProduct() { // Renamed from addProduct
    const nama = document.getElementById('prod-nama').value;
    const kodeManual = document.getElementById('prod-kode').value;
    const stok = document.getElementById('prod-stok').value;
    const beli = document.getElementById('prod-beli').value;
    const jual = document.getElementById('prod-jual').value;

    if (!nama) return toast("Nama barang wajib diisi!");

    let finalFotoUrl = null;

    // 1. Upload new image if exists
    if (currentImageFile) {
        toast("Mengupload foto...");
        const fileName = `produk/${Date.now()}_${currentImageFile.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
        const { data, error } = await db.storage
            .from('foto_produk')
            .upload(fileName, currentImageFile);

        if (error) {
            console.error(error);
            return toast("Gagal upload foto");
        }

        const { data: publicUrlData } = db.storage
            .from('foto_produk')
            .getPublicUrl(fileName);

        finalFotoUrl = publicUrlData.publicUrl;
    }
    // 2. Keep existing image if editing and no new image uploaded
    else if (editingProductId) {
        const product = productsCache.find(p => p.id === editingProductId);
        finalFotoUrl = product ? product.foto_url : null;
    }

    const payload = {
        nama_barang: nama,
        kode_barang: kodeManual || null, // Use manual code if provided
        stok: parseInt(stok),
        harga_beli: parseInt(beli) || 0,
        harga_jual: parseInt(jual) || 0,
        foto_url: finalFotoUrl
    };

    let error;

    if (editingProductId) {
        // UPDATE MODE
        const { error: updateError } = await db
            .from('produk')
            .update(payload)
            .eq('id', editingProductId);
        error = updateError;
    } else {
        // INSERT MODE
        // 1. Generate Kode Barang Automatically IF manual is empty
        if (!payload.kode_barang) {
            let newCode = '1001';
            try {
                const { data: maxData, error: maxError } = await db
                    .from('produk')
                    .select('kode_barang')
                    .order('id', { ascending: false }) // Get latest added
                    .limit(100); // Check last 100 to be safe

                if (!maxError && maxData.length > 0) {
                    // Clean and find max
                    const codes = maxData
                        .map(p => parseInt(p.kode_barang))
                        .filter(c => !isNaN(c));

                    if (codes.length > 0) {
                        const maxCode = Math.max(...codes);
                        newCode = (maxCode + 1).toString();
                    }
                }
            } catch (e) {
                console.error("Error generating code:", e);
            }
            payload.kode_barang = newCode;
            console.log("Auto-generated Code:", newCode);
        }

        const { error: insertError } = await db
            .from('produk')
            .insert([payload]);
        error = insertError;
    }

    if (error) {
        console.error(error);
        toast(editingProductId ? "Gagal update produk" : "Gagal tambah produk");
    } else {
        toast(editingProductId ? "Produk diupdate" : "Produk disimpan");
        loadProducts();
        cancelEditProduct(); // Reset form
    }
}



/* Splash Screen Logic */
document.addEventListener('DOMContentLoaded', () => {
    // Wait for the loading animation (2s) plus a little buffer
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('hidden');
            // Remove from DOM after transition to free up resources
            setTimeout(() => {
                splash.remove();
            }, 500);
        }
    }, 2500);
});

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    updateCartTable();
});


// --- IMAGEKIT LOGIC ---
async function uploadToImageKit(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);
    // usePrivateFile: false implies public access

    // Basic Auth: base64(private_key + ":")
    const auth = btoa(IMAGEKIT_PRIVATE_KEY + ":");

    const response = await fetch(IMAGEKIT_ENDPOINT, {
        method: "POST",
        headers: {
            "Authorization": `Basic ${auth}`
        },
        body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Upload failed");
    return data.url;
}

// --- CAMERA LOGIC ---
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = document.getElementById('camera-preview');
        video.srcObject = stream;

        document.getElementById('camera-container').style.display = 'flex';
        document.getElementById('image-preview-container').style.display = 'none';

        document.getElementById('btn-start-camera').style.display = 'none';
        document.getElementById('btn-take-snapshot').style.display = 'block';
        document.getElementById('btn-reset-camera').style.display = 'none';
    } catch (e) {
        toast("Gagal akses kamera: " + e.message);
    }
}

function takeSnapshot() {
    const video = document.getElementById('camera-preview');
    const canvas = document.getElementById('camera-canvas');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Convert to file
    canvas.toBlob(blob => {
        currentImageFile = new File([blob], "foto-cam.jpg", { type: "image/jpeg" });

        const url = URL.createObjectURL(blob);
        document.getElementById('image-result').src = url;

        stopCamera();
        document.getElementById('camera-container').style.display = 'none';
        document.getElementById('image-preview-container').style.display = 'flex';
        document.getElementById('btn-take-snapshot').style.display = 'none';
        document.getElementById('btn-reset-camera').style.display = 'block';
    }, 'image/jpeg', 0.8);
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

function resetCamera() {
    currentImageFile = null;
    document.getElementById('image-preview-container').style.display = 'none';
    document.getElementById('btn-reset-camera').style.display = 'none';
    document.getElementById('btn-start-camera').style.display = 'block';
    document.getElementById('file-upload').value = '';
}

function handleFileUpload(input) {
    if (input.files && input.files[0]) {
        currentImageFile = input.files[0];
        const url = URL.createObjectURL(currentImageFile);
        document.getElementById('image-result').src = url;

        document.getElementById('camera-container').style.display = 'none';
        document.getElementById('image-preview-container').style.display = 'flex';

        document.getElementById('btn-start-camera').style.display = 'none';
        document.getElementById('btn-reset-camera').style.display = 'block';
    }
}

// --- KASIR LOGIC ---
function updateCashierSuggestions() {
    const tipe = document.getElementById('kasir-tipe').value;
    const datalist = document.getElementById('produk-list');
    datalist.innerHTML = '';

    if (tipe === 'Barang') {
        productsCache.forEach(p => {
            const option = document.createElement('option');
            option.value = p.nama_barang;
            datalist.appendChild(option);
        });
        document.getElementById('kasir-kode').disabled = false;
        document.getElementById('kasir-kode').placeholder = "Scan...";
    } else {
        // Tipe Jasa
        priceList.forEach(item => {
            const option = document.createElement('option');
            option.value = item.nama_jasa;
            datalist.appendChild(option);
        });

        document.getElementById('kasir-kode').disabled = true;
        document.getElementById('kasir-kode').placeholder = "-";
        document.getElementById('kasir-kode').value = "";
    }
}

function autoFillByCode() {
    const inputKode = document.getElementById('kasir-kode').value;
    if (!inputKode) return;

    // Cari exact match atau yang mirip (opsional)
    // Di sini kita pakai exact match kode
    const product = productsCache.find(p => p.kode_barang === inputKode);

    if (product) {
        // Ensure type is Barang
        const typeSelect = document.getElementById('kasir-tipe');
        if (typeSelect.value !== 'Barang') {
            typeSelect.value = 'Barang';
            updateCashierSuggestions();
        }

        document.getElementById('kasir-nama').value = product.nama_barang;
        document.getElementById('kasir-harga').value = product.harga_jual;

        // Auto focus ke Qty agar cepat
        document.getElementById('kasir-qty').focus();
        document.getElementById('kasir-qty').select();

        toast(`Ketemu: ${product.nama_barang}`);
    } else {
        toast("Kode barang tidak ditemukan!");
        // Reset jika salah
        document.getElementById('kasir-nama').value = '';
        document.getElementById('kasir-harga').value = '';
    }
}

function autoFillHarga() {
    const tipe = document.getElementById('kasir-tipe').value;
    const inputNama = document.getElementById('kasir-nama').value;

    if (tipe === 'Barang') {
        const product = productsCache.find(p => p.nama_barang === inputNama);
        if (product) {
            document.getElementById('kasir-harga').value = product.harga_jual;
            document.getElementById('kasir-qty').focus();
        }
    } else {
        // Tipe Jasa
        const service = priceList.find(p => p.nama_jasa === inputNama);
        if (service) {
            // Parse price string "Rp 1.000" -> 1000
            // Remove non-digits
            const priceString = service.harga.replace(/[^0-9]/g, '');
            const price = parseInt(priceString);

            if (!isNaN(price)) {
                document.getElementById('kasir-harga').value = price;
                document.getElementById('kasir-qty').focus();
            }
        }
    }
}

function addToCart() {
    const tipe = document.getElementById('kasir-tipe').value;
    const nama = document.getElementById('kasir-nama').value;
    const qty = parseInt(document.getElementById('kasir-qty').value || 0);
    const harga = parseInt(document.getElementById('kasir-harga').value || 0);

    if (!nama || !harga) return toast("Lengkapi data barang!");

    cart.push({ tipe, nama, qty, harga, subtotal: qty * harga });
    renderCart();

    // Reset Input
    const selectTipe = document.getElementById('kasir-tipe');
    if (selectTipe) selectTipe.value = 'Barang';

    document.getElementById('kasir-nama').value = '';
    document.getElementById('kasir-qty').value = '1';
    document.getElementById('kasir-harga').value = '';
    document.getElementById('kasir-nama').focus();
}

function renderCart() {
    const tbody = document.getElementById('cart-body');
    tbody.innerHTML = '';
    let grandTotal = 0;

    cart.forEach((item, index) => {
        grandTotal += item.subtotal;
        const tr = document.createElement('tr');
        const displayName = item.tipe === 'Jasa' ? `<span style="color:var(--primary); font-weight:500;">[Jasa]</span> ${item.nama}` : item.nama;

        tr.innerHTML = `
            <td>${displayName}</td>
            <td>${item.qty}</td>
            <td class="money">${formatRupiah(item.harga)}</td>
            <td class="money">${formatRupiah(item.subtotal)}</td>
            <td>
                <button class="btn-icon" style="color:var(--danger)" onclick="removeFromCart(${index})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('grand-total').innerText = formatRupiah(grandTotal);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    renderCart();
}

async function checkout() {
    if (cart.length === 0) return toast("Keranjang kosong!");

    const totalBayar = cart.reduce((sum, item) => sum + item.subtotal, 0);

    // 1. Simpan Header Transaksi
    const { data: transData, error: transError } = await db
        .from('transaksi')
        .insert({ total_bayar: totalBayar })
        .select();

    if (transError) {
        console.error(transError);
        return toast("Gagal simpan transaksi!");
    }

    const transId = transData[0].id;

    // 2. Simpan Detail
    const detailData = cart.map(item => ({
        transaksi_id: transId,
        nama_barang: item.nama,
        qty: item.qty,
        harga: item.harga,
        subtotal: item.subtotal
    }));

    const { error: detailError } = await db
        .from('detail_transaksi')
        .insert(detailData);

    if (detailError) {
        console.error(detailError);
        toast("Transaksi tersimpan tapi detail gagal!");
    } else {
        toast(`Sukses! Transaksi #${transId} tersimpan.`);
        cart = [];
        renderCart();
    }
}

// Init
loadProducts();
