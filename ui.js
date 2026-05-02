// UI and Upload Logic
document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const uploadZone = document.getElementById('uploadZone');
    const qrImageInput = document.getElementById('qrImageInput');
    const qrDataInput = document.getElementById('qrData');
    const previewContainer = document.getElementById('previewContainer');
    const previewImg = document.getElementById('previewImg');
    const processingInfo = document.getElementById('processingInfo');
    const scanAttempts = document.getElementById('scanAttempts');
    const decryptBtn = document.getElementById('decryptBtn');
    const resultContainer = document.getElementById('resultContainer');
    const decryptedUrlDiv = document.getElementById('decryptedUrl');
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    const copyBtn = document.getElementById('copyBtn');
    const openBtn = document.getElementById('openBtn');
    const newScanBtn = document.getElementById('newScanBtn');
    const canvas = document.getElementById('canvas');
    const tempCanvas = document.getElementById('tempCanvas');
    const ctx = canvas.getContext('2d');
    const tempCtx = tempCanvas.getContext('2d');

    let decryptedUrl = '';

    // Upload Zone Click
    uploadZone.addEventListener('click', () => {
        qrImageInput.click();
    });

    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    });

    // File Input Change
    qrImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageFile(file);
        }
    });

    // Handle Image File
    function handleImageFile(file) {
        if (file.size > 10 * 1024 * 1024) {
            showError('File size too large! Max 10MB');
            return;
        }

        hideAllMessages();
        processingInfo.classList.remove('d-none');

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewContainer.classList.remove('d-none');
            // Give UI time to update by using setTimeout before running heavy operations
            setTimeout(() => {
                advancedScanQRCode(e.target.result);
            }, 50);
        };
        reader.readAsDataURL(file);
    }

    // Advanced QR Scanning with 11 methods
    function advancedScanQRCode(imageSrc) {
        const img = new Image();
        img.onload = () => {
            
            // Resize image if it's huge to prevent blocking the UI
            const MAX_DIM = 1000;
            let width = img.width;
            let height = img.height;
            if (width > MAX_DIM || height > MAX_DIM) {
                const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const processCanvas = document.createElement('canvas');
            processCanvas.width = width;
            processCanvas.height = height;
            const processCtx = processCanvas.getContext('2d');
            processCtx.imageSmoothingEnabled = true;
            processCtx.imageSmoothingQuality = 'high';
            processCtx.drawImage(img, 0, 0, width, height);
            
            // Generate a resized image to pass to methods
            const resizedImg = new Image();
            resizedImg.onload = () => {
                executeScanMethods(resizedImg);
            };
            resizedImg.src = processCanvas.toDataURL('image/jpeg', 0.9);
        };
        img.src = imageSrc;
    }

    // Run methods asynchronously so we don't freeze the browser
    function executeScanMethods(img) {
        const attempts = [];
        
        const methods = [
            { name: 'Original', func: () => tryScan(img) },
            { name: 'High Contrast 1.5x', func: () => tryScanWithContrast(img, 1.5) },
            { name: 'Very High Contrast 2.0x', func: () => tryScanWithContrast(img, 2.0) },
            { name: 'Brightness 1.3x', func: () => tryScanWithBrightness(img, 1.3) },
            { name: 'Threshold 128', func: () => tryScanWithThreshold(img, 128) },
            { name: 'Threshold 100', func: () => tryScanWithThreshold(img, 100) },
            { name: 'Threshold 160', func: () => tryScanWithThreshold(img, 160) },
            { name: 'Inverted', func: () => tryScanInverted(img) },
            { name: 'Sharpened', func: () => tryScanSharpened(img) },
            { name: 'Upscaled 2x', func: () => tryScanUpscaled(img, 2) },
            { name: 'Upscaled 1.5x', func: () => tryScanUpscaled(img, 1.5) }
        ];

        let currentIndex = 0;

        function runNextMethod() {
            if (currentIndex >= methods.length) {
                handleScanFailure(attempts);
                return;
            }

            const method = methods[currentIndex];
            attempts.push(method.name);
            
            // Using a timeout to unblock the main thread
            setTimeout(() => {
                let result = null;
                try {
                    result = method.func();
                } catch (err) {
                    console.error("Method error:", method.name, err);
                }

                if (result) {
                    handleScanSuccess(result, attempts);
                } else {
                    currentIndex++;
                    runNextMethod();
                }
            }, 10);
        }

        // Start the loop
        runNextMethod();
    }

    function tryScan(img) {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
        });
        return code ? code.data : null;
    }

    function tryScanWithContrast(img, factor) {
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            for (let j = 0; j < 3; j++) {
                data[i + j] = ((data[i + j] - 128) * factor) + 128;
            }
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        const processedData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const code = jsQR(processedData.data, processedData.width, processedData.height, {
            inversionAttempts: "attemptBoth",
        });
        return code ? code.data : null;
    }

    function tryScanWithBrightness(img, factor) {
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            for (let j = 0; j < 3; j++) {
                data[i + j] = data[i + j] * factor;
            }
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        const processedData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const code = jsQR(processedData.data, processedData.width, processedData.height, {
            inversionAttempts: "attemptBoth",
        });
        return code ? code.data : null;
    }

    function tryScanWithThreshold(img, threshold) {
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const val = avg > threshold ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = val;
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        const processedData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const code = jsQR(processedData.data, processedData.width, processedData.height, {
            inversionAttempts: "attemptBoth",
        });
        return code ? code.data : null;
    }

    function tryScanInverted(img) {
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        const processedData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const code = jsQR(processedData.data, processedData.width, processedData.height, {
            inversionAttempts: "attemptBoth",
        });
        return code ? code.data : null;
    }

    function tryScanSharpened(img) {
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        const output = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let sum = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                            const kernelIdx = (ky + 1) * 3 + (kx + 1);
                            sum += data[idx] * kernel[kernelIdx];
                        }
                    }
                    output[(y * width + x) * 4 + c] = sum;
                }
            }
        }
        
        const sharpened = new ImageData(output, width, height);
        tempCtx.putImageData(sharpened, 0, 0);
        const processedData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const code = jsQR(processedData.data, processedData.width, processedData.height, {
            inversionAttempts: "attemptBoth",
        });
        return code ? code.data : null;
    }

    function tryScanUpscaled(img, scale) {
        tempCanvas.width = img.width * scale;
        tempCanvas.height = img.height * scale;
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "attemptBoth",
        });
        return code ? code.data : null;
    }

    function handleScanSuccess(data, attempts) {
        processingInfo.classList.add('d-none');
        qrDataInput.value = data;
        scanAttempts.classList.remove('d-none');
        scanAttempts.innerHTML = `✓ QR Code detected with: <strong>${attempts[attempts.length - 1]}</strong> (${attempts.length} attempts)`;
        
        // Auto decrypt
        setTimeout(() => {
            decryptBtn.click();
        }, 500);
    }

    function handleScanFailure(attempts) {
        processingInfo.classList.add('d-none');
        scanAttempts.classList.remove('d-none');
        scanAttempts.className = 'alert alert-danger';
        scanAttempts.innerHTML = `❌ QR Code not detected after ${attempts.length} methods. Please paste manually or use clearer image.`;
    }

    // Decrypt Button
    decryptBtn.addEventListener('click', () => {
        let rawData = qrDataInput.value.trim();
        hideAllMessages();

        if (!rawData) {
            showError('Please enter the scanned QR data or upload an image.');
            return;
        }

        if (typeof window.decryptCore === 'function') {
            const result = window.decryptCore(rawData);
            if (result.success) {
                decryptedUrl = result.url;
                decryptedUrlDiv.textContent = result.url;
                openBtn.href = result.url;
                resultContainer.classList.remove('d-none');
                
                if (result.hasError) {
                    showError("Warning: The QR might have scanning errors. Check the URL for strange characters.");
                }
            } else {
                showError(result.error);
            }
        } else {
            showError("Decryption core not loaded yet. Please wait or refresh the page.");
        }
    });

    // Copy Button
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(decryptedUrl).then(() => {
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✓ Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 2000);
        });
    });

    // New Scan Button
    newScanBtn.addEventListener('click', () => {
        qrImageInput.value = '';
        qrDataInput.value = '';
        decryptedUrl = '';
        hideAllMessages();
        previewContainer.classList.add('d-none');
    });

    function showError(msg) {
        errorMessage.textContent = msg;
        errorContainer.classList.remove('d-none');
    }

    function hideAllMessages() {
        resultContainer.classList.add('d-none');
        errorContainer.classList.add('d-none');
        processingInfo.classList.add('d-none');
        scanAttempts.classList.add('d-none');
        scanAttempts.className = 'alert alert-info d-none';
    }
});
