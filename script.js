// ==================== KONFIGURASI MODEL ====================

// Menentukan lokasi model Teachable Machine yang sudah diekspor.
const URL = "./my_model/";

// Menyimpan objek model, webcam, dan elemen hasil prediksi.
let model;
let webcam;
let labelContainer;
let maxPredictions = 0;
let isCameraRunning = false;
let animationFrameId = null;
let latestPredictions = [];

// Menyimpan nama file gambar bahasa isyarat untuk setiap alphabet.
const signImages = {};

// Mengisi daftar gambar alphabet A sampai Z secara otomatis.
for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    signImages[letter] = `assets/signs/${letter}.jpg`;
}


// ==================== NAVIGASI ====================

// Mengganti halaman yang sedang ditampilkan dari navbar.
function showPage(pageId) {
    // Menyembunyikan semua halaman
    document.querySelectorAll(".page").forEach((page) => {
        page.classList.remove("active-page");
    });

    // Menampilkan halaman yang dipilih
    const targetPage = document.getElementById(pageId);

    if (targetPage) {
        targetPage.classList.add("active-page");
    }

    // Mengubah status menu navbar
    document.querySelectorAll(".nav-link").forEach((link) => {
        link.classList.toggle(
            "active",
            link.dataset.page === pageId
        );
    });

    // Kembali ke paling atas tanpa animasi scroll/jump
    window.scrollTo(0, 0);

    // Mengubah URL tanpa membuat browser melakukan anchor jump
    history.replaceState(null, "", "#" + pageId);
}


// ==================== TEACHABLE MACHINE ====================

// Memuat model Teachable Machine dan memulai kamera pengguna.
async function init() {
    const startButton = document.getElementById("start-button");
    const status = document.getElementById("camera-status");

    try {
        startButton.disabled = true;
        startButton.textContent = "Memuat model...";

        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        // Memuat model dan metadata dari folder my_model.
        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        labelContainer = document.getElementById("label-container");
        labelContainer.innerHTML = "";

        // Membuat elemen kosong untuk setiap kelas model.
        for (let i = 0; i < maxPredictions; i++) {
            const item = document.createElement("div");
            item.className = "prediction-item";
            labelContainer.appendChild(item);
        }

        document.getElementById("class-count").textContent = `${maxPredictions} kelas`;

        // Menentukan kamera dengan ukuran 400 x 300 dan membalik tampilan agar natural.
        const flip = true;
        webcam = new tmImage.Webcam(400, 300, flip);

        // Meminta izin penggunaan kamera dari browser.
        await webcam.setup();
        await webcam.play();

        const container = document.getElementById("webcam-container");
        container.innerHTML = "";
        container.appendChild(webcam.canvas);

        isCameraRunning = true;
        status.textContent = "Aktif";
        status.classList.add("live");

        document.getElementById("stop-button").disabled = false;
        startButton.textContent = "Kamera Aktif";

        // Menjalankan loop prediksi secara terus-menerus.
        window.requestAnimationFrame(loop);
    } catch (error) {
        console.error(error);

        status.textContent = "Gagal";
        status.classList.remove("live");
        startButton.disabled = false;
        startButton.textContent = "Coba Lagi";

        alert(
            "Kamera atau model tidak dapat dijalankan. Pastikan folder my_model tersedia dan website dibuka melalui localhost."
        );
    }
}


// Menjalankan update kamera dan prediksi secara berulang.
async function loop() {
    if (!isCameraRunning) {
        return;
    }

    webcam.update();
    await predict();

    animationFrameId = window.requestAnimationFrame(loop);
}


// Mengirim frame kamera ke model untuk mendapatkan prediksi alphabet.
async function predict() {
    if (!model || !webcam) {
        return;
    }

    const prediction = await model.predict(webcam.canvas);

    latestPredictions = prediction.map((item) => ({
        className: item.className,
        probability: item.probability
    }));

    // Mengurutkan hasil dari persentase terbesar ke terkecil.
    latestPredictions.sort((a, b) => b.probability - a.probability);

    renderMainPrediction(latestPredictions[0]);
    renderPredictionList(latestPredictions);
}


// Menampilkan satu hasil dengan probabilitas paling tinggi.
function renderMainPrediction(bestPrediction) {
    if (!bestPrediction) {
        return;
    }

    const letter = getAlphabet(bestPrediction.className);

    document.getElementById("prediction-letter").textContent = letter;
    document.getElementById("prediction-name").textContent = bestPrediction.className;
    document.getElementById("prediction-confidence").textContent =
        `${(bestPrediction.probability * 100).toFixed(1)}%`;
}


// Menampilkan seluruh kelas model beserta persentasenya sebagai daftar yang dapat diklik.
function renderPredictionList(predictions) {
    labelContainer.innerHTML = "";

    predictions.forEach((item) => {
        const letter = getAlphabet(item.className);
        const percent = (item.probability * 100).toFixed(1);

        const predictionItem = document.createElement("button");
        predictionItem.type = "button";
        predictionItem.className = "prediction-item";
        predictionItem.innerHTML = `
            <span class="alphabet-badge">${letter}</span>
            <span class="prediction-class">${item.className}</span>
            <span class="prediction-percent">${percent}%</span>
        `;

        // Membuka gambar sign language saat hasil diklik.
        predictionItem.addEventListener("click", () => {
            openSignModal(letter, item.className);
        });

        labelContainer.appendChild(predictionItem);
    });
}


// Mengambil huruf alphabet dari nama kelas model.
function getAlphabet(className) {
    const match = String(className).match(/[A-Za-z]/);

    if (match) {
        return match[0].toUpperCase();
    }

    return String(className).charAt(0).toUpperCase() || "?";
}


// Menghentikan kamera dan animation loop.
function stopCamera() {
    isCameraRunning = false;

    if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    if (webcam) {
        webcam.stop();
    }

    const container = document.getElementById("webcam-container");

    container.innerHTML = `
        <div class="camera-placeholder">
            <div class="camera-icon">⌁</div>
            <p>Kamera dihentikan</p>
            <span>Klik "Mulai Kamera" untuk menggunakannya lagi</span>
        </div>
    `;

    document.getElementById("camera-status").textContent = "Belum aktif";
    document.getElementById("camera-status").classList.remove("live");

    document.getElementById("start-button").disabled = false;
    document.getElementById("start-button").textContent = "Mulai Kamera";
    document.getElementById("stop-button").disabled = true;
}


// ==================== MODAL SIGN LANGUAGE ====================

// Membuka modal dan menampilkan gambar alphabet yang dipilih.
function openSignModal(letter, className) {
    const modal = document.getElementById("sign-modal");
    const image = document.getElementById("sign-image");
    const placeholder = document.getElementById("sign-image-placeholder");

    document.getElementById("modal-letter").textContent = letter;
    document.getElementById("modal-description").textContent =
        `Contoh bahasa isyarat untuk alphabet ${letter} (${className}).`;

    image.src = signImages[letter];
    image.alt = `Bahasa isyarat alphabet ${letter}`;

    image.onload = () => {
        image.style.display = "block";
        placeholder.style.display = "none";
    };

    image.onerror = () => {
        image.style.display = "none";
        placeholder.style.display = "flex";
    };

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
}


// Menutup modal ketika tombol close atau area luar modal diklik.
function closeSignModal(event) {
    const modal = document.getElementById("sign-modal");

    if (!event || event.target === modal || event.target.classList.contains("modal-close")) {
        modal.classList.remove("show");
        modal.setAttribute("aria-hidden", "true");
    }
}


// Menutup modal dengan tombol Escape pada keyboard.
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeSignModal();
    }
});


// ==================== INISIALISASI ====================

// Mengatur halaman awal ketika website pertama kali dibuka.
document.addEventListener("DOMContentLoaded", () => {
    showPage("beranda");
});
