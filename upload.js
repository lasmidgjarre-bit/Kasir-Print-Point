// Configuration
const SUPABASE_URL = "https://grjgdejlbebgxbrnufrz.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyamdkZWpsYmViZ3hicm51ZnJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMjY3NTgsImV4cCI6MjA4NDkwMjc1OH0.DeQ07otbbG6lB5TVqHsF1ntDzOdxo2t_laQV0i8EFR0";
const IMAGEKIT_PRIVATE_KEY = "private_ZU1fCm4YTcBkPHOjrxjvoeM14EQ=";
const IMAGEKIT_ENDPOINT = "https://upload.imagekit.io/api/v1/files";

// Init Supabase
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let selectedType = 'Dokumen';

// UI Logic
document.addEventListener('DOMContentLoaded', () => {
    // Splash screen logic
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.classList.add('hidden');
            setTimeout(() => splash.remove(), 500);
        }
    }, 2000);
});

function selectType(type) {
    selectedType = type;
    document.getElementById('print-type').value = type;

    document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
}

function showFileInfo(input) {
    const file = input.files[0];
    const infoDiv = document.getElementById('file-name');
    if (file) {
        infoDiv.style.display = 'block';
        infoDiv.innerText = `File terpilih: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    } else {
        infoDiv.style.display = 'none';
    }
}

const toast = (message) => {
    const el = document.getElementById('toast');
    el.innerText = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
}

// Upload Logic
async function handleUpload(e) {
    e.preventDefault();

    const fileInput = document.getElementById('file-input');
    const note = document.getElementById('note').value;
    const file = fileInput.files[0];

    if (!file) {
        return toast("Pilih file dulu ya!");
    }

    const btn = e.target.querySelector('button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mengirim...';
    btn.disabled = true;

    try {
        let fileUrl;

        // --- HYBRID UPLOAD LOGIC ---
        // Jika Gambar (JPG, PNG, GIF) -> ImageKit
        if (file.type.startsWith('image/')) {
            console.log("Mendeteksi Gambar, mengupload ke ImageKit...");
            fileUrl = await uploadToImageKit(file);
        }
        // Jika Dokumen (PDF, DOCX, dll) -> Supabase Storage
        else {
            console.log("Mendeteksi Dokumen, mengupload ke Supabase...");
            fileUrl = await uploadToSupabase(file);
        }

        // 2. Save Metadata to Supabase Table 'print_queue'
        const { error } = await db
            .from('print_queue')
            .insert({
                tipe_print: selectedType,
                file_url: fileUrl,
                catatan: note,
                status: 'Baru',
                filename: file.name
            });

        if (error) throw error;

        // Success
        document.querySelector('.container-upload').innerHTML = `
            <div class="card-upload" style="text-align:center;">
                <div style="background:#dcfce7; width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1rem;">
                    <i class="fa-solid fa-check" style="font-size:40px; color:#16a34a;"></i>
                </div>
                <h2>Berhasil Terkirim!</h2>
                <p style="color:#64748b; margin-bottom:2rem;">Filemu sudah masuk ke sistem kasir. Silakan konfirmasi ke admin.</p>
                <button class="btn btn-primary" onclick="location.reload()">Kirim Lagi</button>
            </div>
        `;

    } catch (err) {
        console.error(err);
        toast("Gagal kirim: " + err.message);
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function uploadToImageKit(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);

    const auth = btoa(IMAGEKIT_PRIVATE_KEY + ":");

    const response = await fetch(IMAGEKIT_ENDPOINT, {
        method: "POST",
        headers: { "Authorization": `Basic ${auth}` },
        body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Upload ke ImageKit gagal");
    return data.url;
}

async function uploadToSupabase(file) {
    // Generate unique name: timestamp_sanitizedfilename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;

    const { data, error } = await db.storage
        .from('customer-uploads') // Bucket name
        .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        throw new Error("Upload ke Supabase Gagal: " + error.message);
    }

    // Get Public URL
    const { data: publicData } = db.storage
        .from('customer-uploads')
        .getPublicUrl(fileName);

    return publicData.publicUrl;
}
