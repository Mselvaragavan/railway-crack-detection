import os
import cv2
import numpy as np
import logging
import uuid

def detect_cracks(image_path):
    """
    Detects cracks in railway track images using OpenCV image processing techniques.
    
    Args:
        image_path (str): Path to the input image
        
    Returns:
        tuple: (result, processed_image_path, confidence)
            - result: 'Cracked' or 'Not Cracked'
            - processed_image_path: Path to the processed/annotated image
            - confidence: Confidence level of the detection (0.0 to 1.0)
    """
    try:
        # Read the image
        logging.debug(f"Reading image from {image_path}")
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError("Failed to read image")
        
        # Create a copy for visualization
        visualization = image.copy()
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Apply adaptive thresholding to get binary image
        binary = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 11, 2
        )
        
        # Apply morphological operations to enhance crack-like structures
        kernel = np.ones((3, 3), np.uint8)
        opening = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)
        
        # Dilate to connect nearby components
        dilated = cv2.dilate(opening, kernel, iterations=2)
        
        # Find contours in the binary image
        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours based on characteristics typical of cracks
        crack_contours = []
        min_area = 100  # Minimum area threshold
        min_length = 50  # Minimum length threshold
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < min_area:
                continue
                
            # Calculate shape characteristics
            perimeter = cv2.arcLength(contour, True)
            if perimeter == 0:
                continue
                
            circularity = 4 * np.pi * area / (perimeter * perimeter)
            
            # Cracks typically have low circularity (elongated shapes)
            if circularity < 0.5:
                # Get bounding rectangle
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = max(w, h) / min(w, h)
                
                # Cracks typically have high aspect ratio
                if aspect_ratio > 2.5 and max(w, h) > min_length:
                    crack_contours.append(contour)
        
        # Calculate crack characteristics for confidence scoring
        total_crack_area = sum(cv2.contourArea(cnt) for cnt in crack_contours)
        image_area = image.shape[0] * image.shape[1]
        normalized_area = min(1.0, total_crack_area / (image_area * 0.1))  # Normalize (max at 10% of image)
        
        crack_count_factor = min(1.0, len(crack_contours) / 10)  # Normalize (max at 10 cracks)
        
        # Combined confidence score
        confidence = (normalized_area * 0.7) + (crack_count_factor * 0.3)
        
        # Decision threshold
        CRACK_THRESHOLD = 0.25
        is_cracked = confidence > CRACK_THRESHOLD
        
        # Draw results on visualization image
        cv2.drawContours(visualization, crack_contours, -1, (0, 0, 255), 2)
        
        # Add text information about the result
        result_text = "CRACKED" if is_cracked else "NOT CRACKED"
        cv2.putText(
            visualization, 
            result_text, 
            (20, 40), 
            cv2.FONT_HERSHEY_SIMPLEX, 
            1, 
            (0, 0, 255) if is_cracked else (0, 255, 0), 
            2
        )
        
        # Add confidence text
        confidence_text = f"Confidence: {confidence:.2f}"
        cv2.putText(
            visualization, 
            confidence_text, 
            (20, 80), 
            cv2.FONT_HERSHEY_SIMPLEX, 
            0.7, 
            (255, 255, 255), 
            2
        )
        
        # Save the processed image
        output_dir = os.path.join('static', 'processed')
        os.makedirs(output_dir, exist_ok=True)
        
        base_filename = os.path.basename(image_path)
        processed_filename = f"processed_{uuid.uuid4()}_{base_filename}"
        processed_image_path = os.path.join(output_dir, processed_filename)
        
        cv2.imwrite(processed_image_path, visualization)
        
        result = "Cracked" if is_cracked else "Not Cracked"
        return result, processed_image_path, float(confidence)
        
    except Exception as e:
        logging.error(f"Error in crack detection: {str(e)}")
        raise
