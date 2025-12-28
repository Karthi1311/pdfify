const fileInput = document.getElementById('fileInput');
const previewList = document.getElementById('previewList');
const convertBtn = document.getElementById('convertBtn');
const uploadForm = document.getElementById('uploadForm');
const statusDiv = document.getElementById('status');
const fileNameInput = document.getElementById('fileName');

let selectedFiles = [];

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        // Append new files to existing ones
        selectedFiles = [...selectedFiles, ...files];
        renderPreviews();
        convertBtn.disabled = false;
    }
    // Reset input so same files can be selected again if needed
    fileInput.value = '';
});

function renderPreviews() {
    previewList.innerHTML = '';
    
    if (selectedFiles.length === 0) {
        previewList.innerHTML = '<div class="empty-state">No files selected</div>';
        convertBtn.disabled = true;
        return;
    }

    selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'preview-item';
        item.draggable = true;
        item.dataset.index = index;

        // Create thumbnail
        const img = document.createElement('img');
        img.className = 'preview-thumbnail';
        
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => { img.src = e.target.result; };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            // Render PDF first page
            const fileReader = new FileReader();
            fileReader.onload = async function() {
                const typedarray = new Uint8Array(this.result);
                try {
                    const pdf = await pdfjsLib.getDocument(typedarray).promise;
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 0.5 });
                    
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;

                    img.src = canvas.toDataURL();
                } catch (error) {
                    console.error('Error rendering PDF preview:', error);
                    img.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZTMzMzMzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTE0IDJINmEyIDIgMCAwIDAgLTIgMnYxNmEyIDIgMCAwIDAgMiAyaDEyYTIgMiAwIDAgMCAyLTJWOHoiPjwvcGF0aD48cG9seWxpbmUgcG9pbnRzPSIxNCAyIDE0IDggMjAgOCI+PC9wb2x5bGluZT48bGluZSB4MT0iMTYiIHkxPSIxMyIgeDI9IjgiIHkyPSIxMyI+PC9saW5lIHgxPSIxNiIgeTE9IjE3IiB4Mj0iOCIgeTI9IjE3Ij48L2xpbmU+PHBvbHlsaW5lIHBvaW50cz0iMTAgOSA5IDkgOCA5Ij48L3BvbHlsaW5lPjwvc3ZnPg==';
                }
            };
            fileReader.readAsArrayBuffer(file);
        }

        const name = document.createElement('div');
        name.className = 'preview-name';
        name.textContent = file.name;

        item.appendChild(img);
        item.appendChild(name);
        
        // Drag events
        item.addEventListener('dragstart', handleDragStart);
        item.addEventListener('dragover', handleDragOver);
        item.addEventListener('drop', handleDrop);
        item.addEventListener('dragend', handleDragEnd);

        previewList.appendChild(item);
    });
}

let draggedItemIndex = null;

function handleDragStart(e) {
    draggedItemIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e) {
    e.stopPropagation();
    const targetItem = e.target.closest('.preview-item');
    
    if (targetItem && draggedItemIndex !== null) {
        const targetIndex = parseInt(targetItem.dataset.index);
        
        if (draggedItemIndex !== targetIndex) {
            // Reorder array
            const itemToMove = selectedFiles[draggedItemIndex];
            selectedFiles.splice(draggedItemIndex, 1);
            selectedFiles.splice(targetIndex, 0, itemToMove);
            
            renderPreviews();
        }
    }
    return false;
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    draggedItemIndex = null;
}

uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach(file => {
        formData.append('files', file);
    });

    statusDiv.textContent = 'Converting...';
    convertBtn.disabled = true;

    try {
        const response = await fetch('/convert', {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            
            let downloadName = fileNameInput.value.trim();
            if (!downloadName) {
                downloadName = 'converted';
            }
            if (!downloadName.toLowerCase().endsWith('.pdf')) {
                downloadName += '.pdf';
            }
            
            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
            statusDiv.textContent = 'Conversion successful! Download started.';
            
            // Reset
            selectedFiles = [];
            renderPreviews();
            fileNameInput.value = '';
        } else {
            statusDiv.textContent = 'Error converting files.';
        }
    } catch (error) {
        console.error(error);
        statusDiv.textContent = 'An error occurred.';
    } finally {
        convertBtn.disabled = false;
    }
});
