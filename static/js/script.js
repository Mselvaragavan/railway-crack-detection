document.addEventListener('DOMContentLoaded', function() {
    // Elements for single upload
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const uploadButton = document.getElementById('upload-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const resultsSection = document.getElementById('results-section');
    const originalImage = document.getElementById('original-image');
    const processedImage = document.getElementById('processed-image');
    const resultHeader = document.getElementById('result-header');
    const resultTitle = document.getElementById('result-title');
    const resultStatus = document.getElementById('result-status');
    const confidenceBar = document.getElementById('confidence-bar');
    const confidenceText = document.getElementById('confidence-text');
    const resultDetails = document.getElementById('result-details');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    // Elements for batch upload
    const batchUploadForm = document.getElementById('batch-upload-form');
    const batchFileInput = document.getElementById('batch-file-input');
    const batchLoadingSpinner = document.getElementById('batch-loading-spinner');
    const batchResultsSection = document.getElementById('batch-results-section');
    const batchResultsTable = document.getElementById('batch-results-table');
    const batchErrorMessage = document.getElementById('batch-error-message');
    const batchErrorText = document.getElementById('batch-error-text');
    const crackedCount = document.getElementById('cracked-count');
    const notCrackedCount = document.getElementById('not-cracked-count');
    const errorCount = document.getElementById('error-count');
    
    // Modal elements
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const imageModalLabel = document.getElementById('imageModalLabel');
    
    // Single image upload
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!fileInput.files || fileInput.files.length === 0) {
                showError('Please select a file to upload.');
                return;
            }
            
            const file = fileInput.files[0];
            if (!isValidImageFile(file)) {
                showError('Invalid file format. Only JPG, JPEG, and PNG files are allowed.');
                return;
            }
            
            // Reset previous results
            hideResults();
            hideError();
            
            // Show loading spinner
            loadingSpinner.classList.remove('d-none');
            uploadButton.disabled = true;
            
            // Prepare form data for upload
            const formData = new FormData();
            formData.append('file', file);
            
            // Send request to server
            fetch('/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Hide loading spinner
                loadingSpinner.classList.add('d-none');
                uploadButton.disabled = false;
                
                if (data.status === 'success') {
                    displayResult(data);
                } else {
                    showError(data.message || 'An error occurred during image processing.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                loadingSpinner.classList.add('d-none');
                uploadButton.disabled = false;
                showError('An error occurred while communicating with the server.');
            });
        });
    }
    
    // Batch image upload
    if (batchUploadForm) {
        batchUploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!batchFileInput.files || batchFileInput.files.length === 0) {
                showBatchError('Please select files to upload.');
                return;
            }
            
            // Check all files
            const files = batchFileInput.files;
            let allValid = true;
            for (let i = 0; i < files.length; i++) {
                if (!isValidImageFile(files[i])) {
                    allValid = false;
                    break;
                }
            }
            
            if (!allValid) {
                showBatchError('One or more files have invalid formats. Only JPG, JPEG, and PNG files are allowed.');
                return;
            }
            
            // Reset previous results
            hideBatchResults();
            hideBatchError();
            
            // Show loading spinner
            batchLoadingSpinner.classList.remove('d-none');
            document.getElementById('batch-upload-button').disabled = true;
            
            // Prepare form data for upload
            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append('files[]', files[i]);
            }
            
            // Send request to server
            fetch('/batch_upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Hide loading spinner
                batchLoadingSpinner.classList.add('d-none');
                document.getElementById('batch-upload-button').disabled = false;
                
                if (data.status === 'success') {
                    displayBatchResults(data.results);
                } else {
                    showBatchError(data.message || 'An error occurred during batch processing.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                batchLoadingSpinner.classList.add('d-none');
                document.getElementById('batch-upload-button').disabled = false;
                showBatchError('An error occurred while communicating with the server.');
            });
        });
    }
    
    // Image preview modal functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('.image-container') || e.target.classList.contains('result-thumbnail')) {
            const imgElement = e.target.closest('.image-container') ? 
                e.target.closest('.image-container').querySelector('img') : e.target;
            
            if (imgElement && imgElement.src) {
                modalImage.src = imgElement.src;
                imageModalLabel.textContent = imgElement.alt || 'Image Viewer';
                
                // Initialize and show Bootstrap modal
                const modal = new bootstrap.Modal(imageModal);
                modal.show();
            }
        }
    });

    // Validation function
    function isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        return file && validTypes.includes(file.type);
    }
    
    // Single upload result display
    function displayResult(data) {
        // Set images
        originalImage.src = '/' + data.original_image;
        originalImage.alt = 'Original Image';
        processedImage.src = '/' + data.processed_image;
        processedImage.alt = 'Processed Image with Detection';
        
        // Set result status
        resultStatus.textContent = data.result;
        
        // Set confidence information
        const confidencePercent = Math.round(data.confidence * 100);
        confidenceBar.style.width = `${confidencePercent}%`;
        confidenceBar.textContent = `${confidencePercent}%`;
        confidenceText.textContent = `Confidence Level: ${confidencePercent}%`;
        
        // Set result styling
        if (data.result === 'Cracked') {
            resultDetails.classList.add('result-cracked');
            resultDetails.classList.remove('result-not-cracked');
            resultHeader.classList.add('bg-danger');
            resultHeader.classList.remove('bg-success');
            confidenceBar.classList.add('bg-danger');
            confidenceBar.classList.remove('bg-success');
            resultTitle.textContent = 'Crack Detected!';
        } else {
            resultDetails.classList.add('result-not-cracked');
            resultDetails.classList.remove('result-cracked');
            resultHeader.classList.add('bg-success');
            resultHeader.classList.remove('bg-danger');
            confidenceBar.classList.add('bg-success');
            confidenceBar.classList.remove('bg-danger');
            resultTitle.textContent = 'No Cracks Detected';
        }
        
        // Show results section
        resultsSection.classList.remove('d-none');
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Batch results display
    function displayBatchResults(results) {
        // Clear previous results
        batchResultsTable.innerHTML = '';
        
        let crackedTotal = 0;
        let notCrackedTotal = 0;
        let errorTotal = 0;
        
        // Generate result rows
        results.forEach(result => {
            const row = document.createElement('tr');
            
            if (result.status === 'error') {
                // Error row
                row.innerHTML = `
                    <td>-</td>
                    <td>${result.filename}</td>
                    <td><span class="badge bg-secondary">Error</span></td>
                    <td>-</td>
                    <td>${result.message}</td>
                `;
                errorTotal++;
            } else {
                // Success row
                const isCracked = result.result === 'Cracked';
                const confidencePercent = Math.round(result.confidence * 100);
                
                if (isCracked) {
                    crackedTotal++;
                } else {
                    notCrackedTotal++;
                }
                
                row.innerHTML = `
                    <td>
                        <img src="/${result.original_image}" alt="${result.filename}" class="result-thumbnail">
                    </td>
                    <td>${result.filename}</td>
                    <td>
                        <span class="badge ${isCracked ? 'status-cracked' : 'status-not-cracked'}">
                            ${result.result}
                        </span>
                    </td>
                    <td>${confidencePercent}%</td>
                    <td>
                        <button class="btn btn-sm btn-outline-secondary view-processed" 
                                data-src="/${result.processed_image}" data-filename="${result.filename}">
                            <i class="fas fa-eye"></i> View
                        </button>
                    </td>
                `;
            }
            
            batchResultsTable.appendChild(row);
        });
        
        // Update summary counts
        crackedCount.textContent = crackedTotal;
        notCrackedCount.textContent = notCrackedTotal;
        errorCount.textContent = errorTotal;
        
        // Show results section
        batchResultsSection.classList.remove('d-none');
        
        // Add event listeners for view buttons
        document.querySelectorAll('.view-processed').forEach(button => {
            button.addEventListener('click', function() {
                modalImage.src = this.getAttribute('data-src');
                imageModalLabel.textContent = 'Processed: ' + this.getAttribute('data-filename');
                
                // Initialize and show Bootstrap modal
                const modal = new bootstrap.Modal(imageModal);
                modal.show();
            });
        });
        
        // Scroll to results
        batchResultsSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Error handling functions
    function showError(message) {
        errorText.textContent = message;
        errorMessage.classList.remove('d-none');
    }
    
    function hideError() {
        errorMessage.classList.add('d-none');
    }
    
    function showBatchError(message) {
        batchErrorText.textContent = message;
        batchErrorMessage.classList.remove('d-none');
    }
    
    function hideBatchError() {
        batchErrorMessage.classList.add('d-none');
    }
    
    // UI reset functions
    function hideResults() {
        resultsSection.classList.add('d-none');
    }
    
    function hideBatchResults() {
        batchResultsSection.classList.add('d-none');
    }
});
