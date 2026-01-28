
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
        // Note: Indices 0 and 1 are QR and Price List buttons
        let btnIndex = 2;
        if (tabName === 'kasir') btnIndex = 2;
        else if (tabName === 'files') btnIndex = 3;
        else if (tabName === 'barang') btnIndex = 4;
        else if (tabName === 'laporan') {
            btnIndex = 5;
            loadDailyReport();
        }

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
// Init
document.addEventListener('DOMContentLoaded', () => {
    loadPrices();

    // Silently load products for cache (pass true to skip UI render if desired, but for now just load it)
    // Actually, `loadProducts` renders to #product-body. Since Tab 3 is hidden, it's fine.
    // But we need to make sure `updateCashierSuggestions` is called AFTER products are loaded.

    // We'll modify loadProducts to return a promise and data
    loadProducts().then(() => {
        console.log("Products loaded for cache");
        updateCashierSuggestions(); // Ensure cache is applied to activeSuggestionSource

        // Hide Splash Screen
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 500);
        }
    }).catch(e => {
        console.error("Init Error:", e);
        // Ensure splash still hides on error
        const splash = document.getElementById('splash-screen');
        if (splash) splash.style.display = 'none';
    });

    // Safety Timeout for Splash Screen (in case loadProducts hangs)
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash && splash.style.display !== 'none') {
            splash.style.display = 'none';
        }
    }, 3000);

    // Initial check
    checkNewFiles();

    // Poll every 10 seconds
    setInterval(checkNewFiles, 10000);
});


async function checkNewFiles() {
    const { count, error } = await db
        .from('print_queue')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Pending');

    const badge = document.getElementById('file-badge');
    if (!badge) return;

    if (!error && count > 0) {
        badge.innerText = count;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
        badge.innerText = '';
    }
}

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

    if (error) {
        toast("Gagal update status");
    } else {
        toast("Status diperbarui");
        loadFiles();
        checkNewFiles(); // Update badge immediately
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

    // Check if table exists (only on Data Barang tab or if loaded in background)
    if (tbody) {
        tbody.innerHTML = '';
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
        });
    }

    // Update suggestions if currently selected type matches
    // Note: This is also called in DOMContentLoaded, but good to have here if refreshed manually
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

    // Scroll to form (Input Nama) to ensure user sees the form
    document.getElementById('prod-nama').scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('prod-nama').focus();
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
    renderCart();
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
// --- KASIR LOGIC ---
let activeSuggestionSource = []; // Holds current data (products or services)

function updateCashierSuggestions() {
    const tipe = document.getElementById('kasir-tipe').value;
    const inputKode = document.getElementById('kasir-kode');
    const inputNama = document.getElementById('kasir-nama');

    // Reset inputs
    inputNama.value = '';
    document.getElementById('kasir-harga').value = '';
    closeSuggestions();

    if (tipe === 'Barang') {
        console.log("Updating suggestions from ProductsCache:", productsCache ? productsCache.length : "undefined"); // DEBUG
        activeSuggestionSource = productsCache.map(p => ({
            name: p.nama_barang,
            price: p.harga_jual,
            data: p
        }));

        inputKode.disabled = false;
        inputKode.placeholder = "Scan...";
    } else {
        // Tipe Jasa
        activeSuggestionSource = priceList.map(p => ({
            name: p.nama_jasa,
            price: parseInt(p.harga.replace(/[^0-9]/g, '')) || 0,
            data: p
        }));

        inputKode.disabled = true;
        inputKode.placeholder = "-";
        inputKode.value = "";
    }
}

// Event Listeners for Custom Dropdown are initialized here
// We can keep them separate or merge. For clarity, keeping them here is fine.
// ... potentially other inits

const inputNama = document.getElementById('kasir-nama');
const listElement = document.getElementById('custom-suggestions');

if (inputNama) {
    // Handle Typing
    inputNama.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        console.log("Typing:", query, "Source Length:", activeSuggestionSource.length); // DEBUG
        if (query.length < 1) {
            closeSuggestions();
            return;
        }

        const matches = activeSuggestionSource.filter(item =>
            item.name.toLowerCase().includes(query)
        );
        console.log("Matches found:", matches.length); // DEBUG

        renderSuggestions(matches, query);
    });

    // Handle Focus (Show all or recent?) -> Let's show filtered if value exists, or nothing
    inputNama.addEventListener('focus', (e) => {
        const query = e.target.value.toLowerCase();
        if (query.length > 0) {
            const matches = activeSuggestionSource.filter(item =>
                item.name.toLowerCase().includes(query)
            );
            renderSuggestions(matches, query);
        }
    });
}

// Close when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('#kasir-nama') && !e.target.closest('#custom-suggestions')) {
        closeSuggestions();
    }
});


function renderSuggestions(matches, query) {
    const listElement = document.getElementById('custom-suggestions');
    listElement.innerHTML = '';

    if (matches.length === 0) {
        listElement.style.display = 'none';
        return;
    }

    matches.slice(0, 10).forEach(match => { // Limit to 10
        const li = document.createElement('li');
        // Highlight match
        const regex = new RegExp(`(${query})`, 'gi');
        const highlightedName = match.name.replace(regex, '<strong>$1</strong>');

        li.innerHTML = `${highlightedName} <span style="float:right; color:#64748b; font-size:0.8em;">Rp ${match.price.toLocaleString('id-ID')}</span>`;

        li.onclick = () => selectSuggestion(match);
        listElement.appendChild(li);
    });

    listElement.style.display = 'block';
}

function selectSuggestion(item) {
    document.getElementById('kasir-nama').value = item.name;
    document.getElementById('kasir-harga').value = item.price;

    // Set Kode Barang if available
    if (item.data && item.data.kode_barang) {
        document.getElementById('kasir-kode').value = item.data.kode_barang;
    } else {
        document.getElementById('kasir-kode').value = '';
    }

    document.getElementById('kasir-qty').focus();
    closeSuggestions();
}

function closeSuggestions() {
    const listElement = document.getElementById('custom-suggestions');
    if (listElement) listElement.style.display = 'none';
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

// Removed old autoFillHarga as it is replaced by selectSuggestion and manual input is allowed
// If user types manual and leaves, price stays empty or user fills it manually.
// Or we could try to exact match on blur? Let's keep it simple: Select for auto-price. Manual for manual.
function autoFillHarga() {
    // Legacy placeholder if called from anywhere else, but removed from HTML
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
// --- LAPORAN LOGIC ---
async function loadDailyReport() {
    const tbody = document.getElementById('laporan-body');
    const totalEl = document.getElementById('laporan-total');

    if (!tbody || !totalEl) {
        console.error("Laporan elements not found");
        return;
    }

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Loading data...</td></tr>';

    // Get Start and End of Today (Local Time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Fetch Transactions Headers First
    // Note: Column is named 'tanggal', not 'created_at' based on schema check
    const { data: transData, error: transError } = await db
        .from('transaksi')
        .select('*')
        .gte('tanggal', today.toISOString())
        .lt('tanggal', tomorrow.toISOString())
        .order('tanggal', { ascending: false });

    if (transError) {
        console.error(transError);
        // Show detailed error to help debugging
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red">Error: ${transError.message} <br> <small>${JSON.stringify(transError)}</small></td></tr>`;
        return;
    }

    if (!transData || transData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Belum ada transaksi hari ini</td></tr>';
        totalEl.innerText = formatRupiah(0);
        return;
    }

    // 2. Fetch Details for these transactions manually
    const transIds = transData.map(t => t.id);
    const { data: detailData, error: detailError } = await db
        .from('detail_transaksi')
        .select('*')
        .in('transaksi_id', transIds);

    if (detailError) {
        console.error(detailError);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red">Gagal memuat detail transaksi</td></tr>';
        return;
    }

    // 3. Map details to transactions
    let grandTotal = 0;
    tbody.innerHTML = '';

    transData.forEach(trans => {
        grandTotal += trans.total_bayar;
        const time = new Date(trans.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        // Filter details for this transaction
        const myDetails = detailData.filter(d => d.transaksi_id === trans.id);

        if (myDetails.length > 0) {
            myDetails.forEach((item, index) => {
                const tr = document.createElement('tr');
                const displayTime = index === 0 ? `<strong>${time}</strong>` : '';
                const displayId = index === 0 ? `#${trans.id}` : '';

                tr.innerHTML = `
                    <td>${displayTime}</td>
                    <td>${displayId}</td>
                    <td>${item.nama_barang}</td>
                    <td style="text-align:center">${item.qty}</td>
                    <td class="money">${formatRupiah(item.harga)}</td>
                    <td class="money">${formatRupiah(item.subtotal)}</td>
                `;
                tbody.appendChild(tr);
            });
            const trSep = document.createElement('tr');
            trSep.style.height = '10px';
            trSep.innerHTML = `<td colspan="6" style="border-bottom: 1px solid #eee;"></td>`;
            tbody.appendChild(trSep);
        }
    });

    totalEl.innerText = formatRupiah(grandTotal);
}
