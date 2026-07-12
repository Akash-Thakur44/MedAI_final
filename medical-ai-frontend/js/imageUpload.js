/* ============================================
   IMAGE UPLOAD LOGIC
   ============================================ */

/* ==================== STATE ==================== */
const ImageUpload = {
    images: [],
    maxImages: CONFIG.MAX_IMAGES || 3,
    maxSizeBytes: CONFIG.MAX_IMAGE_SIZE_BYTES || 5 * 1024 * 1024,
    allowedTypes: CONFIG.ALLOWED_IMAGE_TYPES || [
        'image/jpeg',
        'image/png',
        'image/webp'
    ],
    currentImageType: 'skin'
};


/* ==================== INIT ==================== */
document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;
    if (path.includes('symptom-checker')) {
        initImageUpload();
    }
});


function initImageUpload() {
    initDropZone();
    initImageTypeSelector();
    initFileInput();
}


/* ==================== DROP ZONE ==================== */
function initDropZone() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('imageInput');

    if (!dropZone) return;

    dropZone.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        this.classList.remove('dragover');

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFilesSelected(files);
        }
    });

    dropZone.addEventListener('click', function (e) {
        if (e.target === fileInput) return;
        if (fileInput) fileInput.click();
    });
}


/* ==================== FILE INPUT ==================== */
function initFileInput() {
    const fileInput = document.getElementById('imageInput');
    if (!fileInput) return;

    fileInput.addEventListener('change', function (e) {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            handleFilesSelected(files);
        }
        this.value = '';
    });
}


/* ==================== IMAGE TYPE SELECTOR ==================== */
function initImageTypeSelector() {
    const typeInputs = document.querySelectorAll('input[name="imageType"]');

    typeInputs.forEach(input => {
        input.addEventListener('change', function () {
            ImageUpload.currentImageType = this.value;
        });
    });

    const defaultType = document.querySelector(
        'input[name="imageType"]:checked'
    );
    if (defaultType) {
        ImageUpload.currentImageType = defaultType.value;
    }
}


/* ==================== HANDLE FILES ==================== */
function handleFilesSelected(files) {
    const remaining = ImageUpload.maxImages - ImageUpload.images.length;

    if (remaining <= 0) {
        showImageError(
            `Maximum ${ImageUpload.maxImages} images allowed. Remove an image first.`
        );
        return;
    }

    const filesToProcess = files.slice(0, remaining);
    const skipped = files.length - filesToProcess.length;

    if (skipped > 0) {
        showImageError(
            `Only ${remaining} more image(s) can be added. ${skipped} file(s) skipped.`
        );
    }

    filesToProcess.forEach(file => {
        processImageFile(file);
    });
}


async function processImageFile(file) {
    const validation = validateImageFile(file);

    if (!validation.valid) {
        showImageError(validation.error);
        return;
    }

    try {
        const result = await readFileAsBase64(file);

        const imageObj = {
            id: generateImageId(),
            file: file,
            base64: result.base64,
            preview: result.dataUrl,
            type: ImageUpload.currentImageType,
            mimeType: file.type,
            name: file.name,
            size: file.size
        };

        ImageUpload.images.push(imageObj);

        if (AppState) {
            AppState.images = ImageUpload.images;
        }

        renderImagePreviews();

    } catch (error) {
        showImageError('Failed to process image. Please try again.');
        console.error('Image processing error:', error);
    }
}


/* ==================== FILE VALIDATION ==================== */
function validateImageFile(file) {
    if (!ImageUpload.allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type: ${file.name}. Only JPG, PNG, and WEBP are allowed.`
        };
    }

    if (file.size > ImageUpload.maxSizeBytes) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return {
            valid: false,
            error: `File too large: ${file.name} (${sizeMB}MB). Maximum size is 5MB.`
        };
    }

    if (file.size === 0) {
        return {
            valid: false,
            error: `File is empty: ${file.name}`
        };
    }

    return { valid: true };
}


/* ==================== READ FILE ==================== */
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (e) {
            const dataUrl = e.target.result;
            const base64 = dataUrl.split(',')[1];

            resolve({ dataUrl, base64 });
        };

        reader.onerror = function () {
            reject(new Error('Failed to read file'));
        };

        reader.readAsDataURL(file);
    });
}


/* ==================== RENDER PREVIEWS ==================== */
function renderImagePreviews() {
    const previewGrid = document.getElementById('imagePreviewGrid');
    const dropZone = document.getElementById('dropZone');

    if (!previewGrid) return;

    if (ImageUpload.images.length > 0) {
        previewGrid.style.display = 'grid';

        previewGrid.innerHTML = ImageUpload.images.map(img => `
            <div class="image-preview-item" id="preview-${img.id}">
                <img
                    src="${img.preview}"
                    alt="${img.type} image"
                    onclick="openImagePreviewLightbox('${img.id}')"
                    style="cursor: pointer;"
                >
                <button
                    class="image-preview-remove"
                    onclick="removeImage('${img.id}')"
                    title="Remove image"
                >
                    <i class="fas fa-times"></i>
                </button>
                <div class="image-preview-type">
                    <i class="fas fa-${getTypeIcon(img.type)}"></i>
                    ${capitalizeFirstLetter(img.type)}
                </div>
            </div>
        `).join('');

        if (dropZone && ImageUpload.images.length >= ImageUpload.maxImages) {
            dropZone.style.opacity = '0.5';
            dropZone.style.pointerEvents = 'none';
            dropZone.querySelector('h3').textContent = 'Maximum images reached';
        }

    } else {
        previewGrid.style.display = 'none';
        previewGrid.innerHTML = '';

        if (dropZone) {
            dropZone.style.opacity = '1';
            dropZone.style.pointerEvents = '';
            const h3 = dropZone.querySelector('h3');
            if (h3) h3.textContent = 'Drag and Drop Images Here';
        }
    }

    updateImageCount();
}


/* ==================== REMOVE IMAGE ==================== */
function removeImage(imageId) {
    ImageUpload.images = ImageUpload.images.filter(img => img.id !== imageId);

    if (AppState) {
        AppState.images = ImageUpload.images;
    }

    renderImagePreviews();
}


/* ==================== IMAGE LIGHTBOX ==================== */
function openImagePreviewLightbox(imageId) {
    const image = ImageUpload.images.find(img => img.id === imageId);
    if (!image) return;

    const modal = document.getElementById('cropModal');
    const cropImage = document.getElementById('cropImage');

    if (!modal || !cropImage) return;

    cropImage.src = image.preview;
    cropImage.alt = `${image.type} image`;

    modal.style.display = 'flex';

    const closeBtn = document.getElementById('cropModalClose');
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }

    const applyBtn = document.getElementById('applyCropBtn');
    if (applyBtn) {
        applyBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }

    const rotateBtn = document.getElementById('rotateCropBtn');
    if (rotateBtn) {
        let rotation = 0;
        rotateBtn.onclick = () => {
            rotation = (rotation + 90) % 360;
            cropImage.style.transform = `rotate(${rotation}deg)`;
        };
    }
}


/* ==================== CAMERA MODAL ==================== */
function initCameraModal() {
    const cameraModal = document.getElementById('cameraModal');
    const cameraClose = document.getElementById('cameraModalClose');
    const captureBtn = document.getElementById('captureBtn');
    const switchBtn = document.getElementById('switchCameraBtn');
    const video = document.getElementById('cameraFeed');
    const canvas = document.getElementById('cameraCanvas');

    let stream = null;
    let facingMode = 'environment';

    async function startCamera() {
        try {
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }

            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            if (video) video.srcObject = stream;

        } catch (error) {
            showImageError('Camera access denied or not available.');
            if (cameraModal) cameraModal.style.display = 'none';
        }
    }

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            stream = null;
        }
        if (video) video.srcObject = null;
    }

    if (cameraClose) {
        cameraClose.addEventListener('click', () => {
            stopCamera();
            if (cameraModal) cameraModal.style.display = 'none';
        });
    }

    if (switchBtn) {
        switchBtn.addEventListener('click', () => {
            facingMode = facingMode === 'environment' ? 'user' : 'environment';
            startCamera();
        });
    }

    if (captureBtn && video && canvas) {
        captureBtn.addEventListener('click', async () => {
            const context = canvas.getContext('2d');

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);

            canvas.toBlob(async (blob) => {
                if (!blob) return;

                const file = new File(
                    [blob],
                    `camera-capture-${Date.now()}.jpg`,
                    { type: 'image/jpeg' }
                );

                stopCamera();
                if (cameraModal) cameraModal.style.display = 'none';

                await processImageFile(file);

            }, 'image/jpeg', 0.9);
        });
    }

    return { startCamera, stopCamera };
}


/* ==================== IMAGE COUNT ==================== */
function updateImageCount() {
    const count = ImageUpload.images.length;
    const max = ImageUpload.maxImages;

    const dropZoneInfo = document.querySelector('.drop-zone-info');
    if (dropZoneInfo) {
        dropZoneInfo.textContent = count > 0
            ? `${count}/${max} images selected | Max 5MB per image`
            : `Supports: JPG, PNG, WEBP | Max: 5MB | Up to ${max} images`;
    }
}


/* ==================== GET ALL IMAGES DATA ==================== */
function getImagesForSubmission() {
    return ImageUpload.images.map(img => ({
        data: img.base64,
        type: img.type,
        mime_type: img.mimeType,
        name: img.name
    }));
}


function getImageTypes() {
    return ImageUpload.images.map(img => img.type);
}


function hasImages() {
    return ImageUpload.images.length > 0;
}


function clearAllImages() {
    ImageUpload.images = [];

    if (AppState) {
        AppState.images = [];
    }

    renderImagePreviews();
}


/* ==================== IMAGE REVIEW FOR STEP 3 ==================== */
function getImagesForReview() {
    return ImageUpload.images.map(img => ({
        preview: img.preview,
        type: img.type
    }));
}


/* ==================== ERROR DISPLAY ==================== */
function showImageError(message) {
    let errorEl = document.getElementById('imageUploadError');

    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = 'imageUploadError';
        errorEl.className = 'admin-alert alert-error';
        errorEl.style.cssText = `
            margin-top: 12px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            border-radius: 10px;
            font-size: 0.85rem;
            font-weight: 500;
            background: rgba(239, 68, 68, 0.08);
            color: #dc2626;
            border: 1px solid rgba(239, 68, 68, 0.2);
        `;

        const dropZone = document.getElementById('dropZone');
        if (dropZone && dropZone.parentNode) {
            dropZone.parentNode.insertBefore(errorEl, dropZone.nextSibling);
        }
    }

    errorEl.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    errorEl.style.display = 'flex';

    setTimeout(() => {
        if (errorEl) errorEl.style.display = 'none';
    }, 4000);
}


/* ==================== UTILITY FUNCTIONS ==================== */
function generateImageId() {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}


function getTypeIcon(type) {
    const icons = {
        skin: 'hand-paper',
        eye: 'eye',
        throat: 'head-side-cough',
        other: 'plus-circle'
    };
    return icons[type] || 'image';
}


function capitalizeFirstLetter(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}


function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}


function isImageFile(file) {
    return ImageUpload.allowedTypes.includes(file.type);
}


function compressImage(file, maxWidthPx = 1024, quality = 0.85) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (e) {
            const img = new Image();

            img.onload = function () {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidthPx) {
                    height = Math.round((height * maxWidthPx) / width);
                    width = maxWidthPx;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Compression failed'));
                            return;
                        }

                        const compressedFile = new File(
                            [blob],
                            file.name,
                            { type: 'image/jpeg' }
                        );

                        resolve(compressedFile);
                    },
                    'image/jpeg',
                    quality
                );
            };

            img.onerror = () => reject(new Error('Image load failed'));
            img.src = e.target.result;
        };

        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
    });
}