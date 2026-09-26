/* ==========================================================================
   MemeForge | js/download.js
   Handles Exporting, Downloading, Sharing, and Copying to Clipboard
   ========================================================================== */

window.MemeDownload = (function() {
    // DOM Elements
    const els = {
        btnHeaderDownload: document.getElementById('btn-download'),
        btnHeaderShare: document.getElementById('btn-share'),
        modalExport: document.getElementById('modal-export'),
        modalCloseBtn: document.querySelector('#modal-export .modal-close'),
        previewImg: document.getElementById('export-preview-img'),
        inputFilename: document.getElementById('export-filename'),
        selectFormat: document.getElementById('export-format'),
        selectQuality: document.getElementById('export-quality'),
        btnModalDownload: document.getElementById('modal-btn-download-confirm'),
        btnModalCopy: document.getElementById('modal-btn-copy')
    };

    let currentExportDataUrl = null;

    /**
     * Initializes the download/export system
     */
    const init = () => {
        if (!els.btnHeaderDownload) return;

        bindEvents();
        checkNativeFeatures();
    };

    /**
     * Binds all event listeners for the export flow
     */
    const bindEvents = () => {
        // Open Export Modal
        els.btnHeaderDownload.addEventListener('click', openExportModal);

        // Native Share (Mobile usually)
        if (els.btnHeaderShare) {
            els.btnHeaderShare.addEventListener('click', handleNativeShare);
        }

        // Close Modal
        if (els.modalCloseBtn) {
            els.modalCloseBtn.addEventListener('click', closeExportModal);
        }
        
        // Close on backdrop click
        if (els.modalExport) {
            els.modalExport.addEventListener('click', (e) => {
                if (e.target === els.modalExport) closeExportModal();
            });
        }

        // Handle Format/Quality changes to update preview in real-time
        if (els.selectFormat) els.selectFormat.addEventListener('change', updatePreview);
        if (els.selectQuality) els.selectQuality.addEventListener('change', updatePreview);

        // Confirm Download
        if (els.btnModalDownload) {
            els.btnModalDownload.addEventListener('click', handleDownload);
        }

        // Copy to Clipboard
        if (els.btnModalCopy) {
            els.btnModalCopy.addEventListener('click', handleCopyToClipboard);
        }
    };

    /**
     * Checks browser support for native sharing and clipboard API
     * and shows/hides appropriate UI elements
     */
    const checkNativeFeatures = () => {
        // Check Web Share API
        if (navigator.share && els.btnHeaderShare) {
            els.btnHeaderShare.classList.remove('hidden');
        }

        // Check Clipboard API support for images
        // Safari/iOS can be finicky with this, so we wrap it safely
        const hasClipboardSupport = navigator.clipboard && window.ClipboardItem;
        if (!hasClipboardSupport && els.btnModalCopy) {
            els.btnModalCopy.style.display = 'none';
        }
    };

    /**
     * Opens the export modal and generates initial preview
     */
    const openExportModal = () => {
        if (!window.MemeCanvas) return;
        
        // Deselect any active object before export so handles don't show
        const canvas = MemeCanvas.getCanvas();
        if (canvas) {
            canvas.discardActiveObject();
            canvas.renderAll();
        }

        updatePreview();
        els.modalExport.classList.remove('hidden');
        
        // Generate a default filename based on date
        const date = new Date();
        const dateStr = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
        els.inputFilename.value = `memeforge-${dateStr}`;
    };

    /**
     * Closes the export modal
     */
    const closeExportModal = () => {
        els.modalExport.classList.add('hidden');
    };

    /**
     * Generates the Data URL from canvas and updates the modal preview image
     */
    const updatePreview = () => {
        const format = els.selectFormat.value;
        const quality = els.selectQuality.value;
        
        // Temporarily add visual processing effect
        if (els.previewImg.parentElement) {
            els.previewImg.parentElement.classList.add('canvas-processing');
        }

        // Give UI a tiny tick to render the processing state before synchronous canvas export blocks thread
        setTimeout(() => {
            currentExportDataUrl = MemeCanvas.exportImage(format, quality);
            
            if (currentExportDataUrl) {
                els.previewImg.src = currentExportDataUrl;
            } else {
                if (window.MemeUI) MemeUI.showToast("Failed to generate preview. Canvas might be tainted.", "error");
            }
            
            if (els.previewImg.parentElement) {
                els.previewImg.parentElement.classList.remove('canvas-processing');
            }
        }, 50);
    };

    /**
     * Handles the actual file download trigger
     */
    const handleDownload = () => {
        if (!currentExportDataUrl) return;

        let filename = els.inputFilename.value.trim();
        if (!filename) filename = 'memeforge-export';
        
        // Ensure correct extension
        const format = els.selectFormat.value;
        const ext = format === 'jpeg' ? 'jpg' : format;
        if (!filename.endsWith(`.${ext}`)) {
            filename += `.${ext}`;
        }

        // Create temporary link and trigger download natively
        const link = document.createElement('a');
        link.download = filename;
        link.href = currentExportDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (window.MemeUI) MemeUI.showToast("Meme downloaded successfully!", "success");
        closeExportModal();
    };

    /**
     * Converts a base64 Data URL to a Blob
     * Necessary for Clipboard API and Web Share API
     */
    const dataUrlToBlob = async (dataUrl) => {
        try {
            const res = await fetch(dataUrl);
            return await res.blob();
        } catch (e) {
            console.error("DataURL to Blob conversion failed", e);
            return null;
        }
    };

    /**
     * Copies the image to the system clipboard
     */
    const handleCopyToClipboard = async () => {
        if (!currentExportDataUrl) return;

        const originalText = els.btnModalCopy.innerHTML;
        els.btnModalCopy.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Copying...';
        els.btnModalCopy.disabled = true;

        try {
            // PNG is required for ClipboardItem in most browsers
            let blobDataUrl = currentExportDataUrl;
            
            // If current format isn't PNG, we must generate a PNG version for clipboard
            if (els.selectFormat.value !== 'png') {
                blobDataUrl = MemeCanvas.exportImage('png', 1.0);
            }

            const blob = await dataUrlToBlob(blobDataUrl);
            
            if (!blob) throw new Error("Could not create image blob");

            // Create ClipboardItem and write
            const item = new ClipboardItem({ [blob.type]: blob });
            await navigator.clipboard.write([item]);
            
            if (window.MemeUI) MemeUI.showToast("Copied to clipboard!", "success");
            closeExportModal();

        } catch (err) {
            console.error("Clipboard copy failed:", err);
            if (window.MemeUI) MemeUI.showToast("Clipboard copy failed. Your browser might not support copying images.", "error");
        } finally {
            els.btnModalCopy.innerHTML = originalText;
            els.btnModalCopy.disabled = false;
        }
    };

    /**
     * Triggers the native OS share dialog (iOS/Android)
     */
    const handleNativeShare = async () => {
        if (!navigator.share || !window.MemeCanvas) return;

        try {
            // Always use high-quality JPEG for native sharing to ensure compatibility and reasonable file size
            const dataUrl = MemeCanvas.exportImage('jpeg', 0.9);
            const blob = await dataUrlToBlob(dataUrl);
            
            if (!blob) throw new Error("Failed to create blob for sharing");

            const file = new File([blob], 'memeforge-share.jpg', { type: 'image/jpeg' });
            
            const shareData = {
                title: 'Made with MemeForge',
                files: [file]
            };

            // Check if file sharing is supported
            if (navigator.canShare && navigator.canShare(shareData)) {
                await navigator.share(shareData);
            } else {
                // Fallback if browser supports share() but not files[]
                if (window.MemeUI) MemeUI.showToast("Your browser doesn't support sharing image files directly. Please download instead.", "info");
            }
        } catch (err) {
            // AbortError is thrown when user cancels the share dialog, which is normal.
            if (err.name !== 'AbortError') {
                console.error("Share failed:", err);
                if (window.MemeUI) MemeUI.showToast("Failed to open share dialog.", "error");
            }
        }
    };

    // Public API
    return {
        init
    };

})();