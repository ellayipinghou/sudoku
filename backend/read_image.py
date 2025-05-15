import sys
import cv2 # for image processing
import numpy as np # for numerical processing
import keras
import tensorflow as tf
model = tf.keras.models.load_model('kaggle_digit_model.h5')

# isolate the board from the rest of the image and warp to a flat perspective
def process_outer_board(img):
    # blur to prepare for contour detection
    blurred = cv2.blur(img, (4, 4))
    # use threshold to get black and white image
    thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 3)
    # get contours and sort by largest area
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)

    # iterate over contours starting from largest area
    for contour in contours:
        # calculate total perimeter around the (closed) shape
        peri = cv2.arcLength(contour, True)
        # if the approcimated contour has 4 points, likely the board
        approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
        if len(approx) == 4:
            sudoku_contour = approx
            break

    # get the points in order to prepare for aroing
    pts = reorder_points(sudoku_contour)
    # get the destination (desired) coordinates for each of the four points in tl, tr, br, bl order - creates a 450 x 450 grid
    dst_pts = np.array([[0, 0], [450, 0], [450, 450], [0, 450]], dtype='float32')

    # calculate the transformation matrix M that maps the 4 corners in pts to the dst_pts
    M = cv2.getPerspectiveTransform(pts.astype('float32'), dst_pts)
    # warp the image perspective using the transformation matrix and the desired size
    warp = cv2.warpPerspective(img, M, (450, 450))

    return warp

# order the points
def reorder_points(pts):
    # reshape to a numpy array of 4 points with (x, y) coordinates
    pts = pts.reshape(4, 2)
    # compute x + y for each point, since top left has smallest sum and bottom-right has largest sum
    # note: top-left = (0,0) -> increases downwards and to the right
    sum_pts = pts.sum(axis=1)
    # compute x - y for each point, since top right has smallest difference and bottom-left has largest difference
    diff_pts = np.diff(pts, axis=1)
    
    # return array of the points in order: tl, tr, br, bl
    return np.array([
        pts[np.argmin(sum_pts)],   # top-left
        pts[np.argmin(diff_pts)],  # top-right
        pts[np.argmax(sum_pts)],   # bottom-right
        pts[np.argmax(diff_pts)]   # bottom-left
    ])

# split the image into 81 cells
def split_into_cells(warped):
    cells = []
    side_length = int(warped.shape[0] / 9) # 450 / 9 = 50px
    # loop over rows
    for i in range(9):
        # loop over columns
        for j in range(9):
            # slice the cell and add to array
            cell = warped[side_length * i: side_length * (i + 1), side_length * j: side_length * (j + 1)]
            cells.append(cell)
    return cells

# process the cells and return a 2d array of the digits
def get_digits(cells):
    digits = []
    for i, curr_cell in enumerate(cells):
        # resize to 28 x 28 input, matching model training data
        resized = cv2.resize(curr_cell, (28, 28), interpolation=cv2.INTER_AREA)
        
        # create binary image with adaptive thresholding - white text on black background, matches training data
        cell_thresh = cv2.adaptiveThreshold(resized, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                        cv2.THRESH_BINARY_INV, 11, 8)
        
        # find contours in the cell and sort by largest area
        contours, _ = cv2.findContours(cell_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        
        height, width = resized.shape[:2]
        digit_found = False
        
        # loop through contours to find the digit contour
        for j, contour in enumerate(contours):
            # get bounding rectangle and area
            x, y, w, h = cv2.boundingRect(contour)
            area = cv2.contourArea(contour)

            # if not touching the edge and the area is big enough, it's likely the digit
            if (x > 0 and y > 0 and x + w < width and y + h < height and area > 16 and not digit_found):   
                digit_found = True            
                
                # add small padding around the digit
                padding = 1
                x_start = max(0, x - padding)
                y_start = max(0, y - padding)
                x_end = min(width, x + w + padding)
                y_end = min(height, y + h + padding)
                
                # make mask of all white
                digit_mask = np.zeros_like(cell_thresh)
                digit_mask[y_start : y_end, x_start : x_end] = 255 
                
                # apply the mask get only the digit without grid lines, noise, etc
                processed_cell = cv2.bitwise_and(cell_thresh, digit_mask)
                model_input = processed_cell.reshape(1, 28, 28, 1)
                model_input = model_input.astype('float32') / 255.0

                # make prediction
                prediction = model.predict(model_input, verbose=0)
                predicted_digit = np.argmax(prediction[0])
        
        # add the value to the array
        if digit_found:
            # empty cell that wasn't caught in preprocessing
            if predicted_digit == 0:
                digits.append(-1)
            else:
                digits.append(predicted_digit)
        else:
            # empty cell that was caught in preprocessing
            digits.append(-1)

    # reshape to 2d array
    digits = np.reshape(digits, (9, 9))

    return digits

def parser(filename):
    img = cv2.imread(filename, 0)
    warped = process_outer_board(img)
    cells = split_into_cells(warped)
    digits = get_digits(cells)

    return digits

# BELOW: used for testing
# if __name__ == '__main__':
#     # TODO: change image!!!
#     img = cv2.imread('sudoku_picture.jpg', 0)
#     warped = process_outer_board(img)
#     cells = split_into_cells(warped)

#     digits = get_digits(cells)

#     print(digits)

#     correct = [[8, -1, -1, -1, 1, -1, -1, -1, 9], 
#                [-1, 5, -1, 8, -1, 7, -1, 1, -1],
#                [-1, -1, 4, -1, 9, -1, 7, -1, -1],
#                [-1, 6, -1, 7, -1, 1, -1, 2, -1],
#                [5, -1, 8, -1, 6, -1, 1, -1, 7],
#                [-1, 1, -1, 5, -1, 2, -1, 9, -1],
#                [-1, -1, 7, -1 ,4, -1, 6, -1, -1],
#                [-1, 8, -1, 3, -1, 9, -1, 4, -1],
#                [3, -1, -1, -1, 5, -1 ,-1, -1, 8]]

#     count = 0
#     for i, row in enumerate(digits):
#         for j, elem in enumerate(row):
#             if elem == correct[i][j]:
#                 count += 1
            
#     print(count)

