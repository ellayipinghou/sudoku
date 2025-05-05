import React from 'react'
import { useState, useEffect } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import Papa from 'papaparse';

function App() {
    // create initial empty grid
    const createEmptyGrid = () => {
        const grid = [];
        for (let i = 0; i < 9; i++) {
            grid[i] = [];
            for (let j = 0; j < 9; j++) {
                grid[i][j] = -1; // initialize with -1
            }
        }
        return grid;
    };

    const createEntireUnfilledPositions = () => {
        // record which cells had values before solving and set unfilled positions
        const positions = new Set();
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                // create a unique key for each position
                const key = `${i}-${j}`;
                // store true if the cell has a value, false otherwise
                positions.add(key);
                
            }
        }
        return positions;
    }

    const [grid, setGrid] = useState(createEmptyGrid());
    const [prevGrid, setPrevGrid] = useState(createEmptyGrid());
    const [submitted, setSubmitted] = useState(false);

    // keeps track of the most recent element that hint revealed
    const [hintElem, setHintElem] = useState(null);
    // true when hovering over lightbulb
    const [showHintText, setShowHintText] = useState(false);

    // keeps track of duplicate, solve, server, and value, and format error
    const [error, setError] = useState(""); 

    const [showCSVModal, setShowCSVModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    
    // store unfilled input positions before solving, empty at first
    const [unfilledPositions, setUnfilledPositions] = useState(createEntireUnfilledPositions());

    const updateGrid = (e, rowIndex, colIndex) => {
        setSubmitted(false);
        setError("");
        const newVal = e.target.value;
        
        // if backspace or empty, set back to -1
        if (newVal === "") {
            // create new object to re-render grid
            const newGrid = [...grid.map(row => [...row])];
            newGrid[rowIndex][colIndex] = -1;
            setGrid(newGrid);
            return;
        }

        // if not a number (which means not a digit, since we limit input to 1 character), show error
        if (isNaN(newVal)) {
            setError("Please enter a digit between 1 and 9")
            return;
        }

        // get the integer version of the number
        const numVal = parseInt(newVal);

        // if not 1-9, show error
        if (numVal < 1 || numVal > 9) {
            setError("Please enter a digit between 1 and 9")
            return;
        }
        
        // check for duplicates and set error if true
        const rowDuplicate = checkRow(grid, numVal, rowIndex);
        const colDuplicate = checkCol(grid, numVal, colIndex);
        const blockDuplicate = checkBlock(grid, numVal, rowIndex, colIndex);

        if (rowDuplicate || colDuplicate || blockDuplicate) {
            setError("No duplicates allowed within rows, columns, or inner grids");
            return;
        }

        // make new grid and set
        const newGrid = [...grid.map(row => [...row])];
        newGrid[rowIndex][colIndex] = numVal;
        setGrid(newGrid);

        if (isFull(newGrid)) {
            //setSubmitted(true);
            setUnfilledPositions(new Set());
            return;
        }
    }

    const isFull = (currGrid) => {
        for (let row = 0; row < 9; row++) {
            if (currGrid[row].includes(-1)) {
                return false;
            }
        }
        return true;
    }

    // check if there are any duplicates in the row
    const checkRow = (currGrid, val, row) => {
        return (val != -1) && (currGrid[row].includes(parseInt(val)));
    }

    // check if there are any duplicates in the column
    const checkCol = (currGrid, val, col) => {
        if (val == -1) {
            return false;
        }
        for (let row = 0; row < 9; row++) {
            if (currGrid[row][col] === parseInt(val)) {
                return true;
            }
        }
        return false;
    }

    // check if there are any duplicates in the block
    const checkBlock = (currGrid, val, row, col) => {
        if (val == -1) {
            return false;
        }
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;

        for (let r = startRow; r < startRow + 3; r++) {
            for (let c = startCol; c < startCol + 3; c++) {
                if (currGrid[r][c] === parseInt(val)) {
                    return true;
                }
            }
        }
        return false;
    }

    // tell which borders a cell should have and how thick, avoids stacking issues
    const getCellBorderClasses = (rowInBox, colInBox, boxRow, boxCol) => {
        let classes = "";
        
        // add right border to all cells except those in the rightmost column of each box (will already have outer border)
        if (colInBox < 2) {
            classes += " border-r-2";
        }
        
        // add bottom border to all cells except those in the bottom row of each box (will already have outer border)
        if (rowInBox < 2) {
            classes += " border-b-2";
        }
        
        // add thicker right border for the right edge of each larger box (except the rightmost box)
        if (colInBox === 2 && boxCol < 2) {
            classes += " border-r-4";
        }
        
        // Add thicker bottom border for the bottom edge of each larger box (except the bottom box)
        if (rowInBox === 2 && boxRow < 2) {
            classes += " border-b-4";
        }
        
        return classes + " border-black";
    }

    const handleSubmit = async () => {
        if (error != "") {
            return;
        }

        const result = await getResult();
        if (result == null) {
            // server error case
            return
        } 
        if (result?.solution) {
            setGrid(result.solution);
            setSubmitted(true);
            setError("");

        } else {
            setError("No solution, check that all inputs are as intended");
        }
    };

    // TODO: possible bug - solving, unsolving, then unsolve again is allowed??
    const handleUnsolve = () => {
        setGrid([...prevGrid.map(row => [...row])]);
        setUnfilledPositions(createEntireUnfilledPositions());
        setError("");
        setSubmitted(false);
    }
    
    const handleReset = () => {
        setGrid(createEmptyGrid());
        setUnfilledPositions(createEntireUnfilledPositions());
        setError("");
        setSubmitted(false);
    }

    const handleCSV = async (e) => {
        e.preventDefault(); // prevent form from refreshing

        const fileInput = document.getElementById('csv_file');
        const file = fileInput.files[0];
        if (!file) {
            alert("Please select a file.");
            return;
        }
        console.log("fileInput is ", file);

        Papa.parse(file, {
            header: false,
            skipEmptyLines: true,
            complete: (results) => {
                console.log('Parsed CSV data:', results.data);
                // make sure there are 9 rows
                if (results.data.length != 9) {
                    setError("Incorrect CSV format: wrong row count");
                    return;
                }
                for (let r = 0; r < 9; r++) {
                    // make sure there are 9 columns
                    if (results.data[r].length != 9) {
                        setError("Incorrect CSV format: wrong column count");
                        return;
                    }

                    for (let c = 0; c < 9; c++) {
                        // convert each element to an int
                        const intResult = parseInt(results.data[r][c]);
                        // make sure element is a valid value
                        if (isNaN(intResult) || !Number.isInteger(intResult)) {
                            setError(`Value at row ${r}, column ${c} is not a valid integer`);
                            return;
                        }
                        if ((intResult != -1) && (intResult < 1 || intResult > 9)) {
                            setError(`Value at row ${r}, column ${c} must be -1 or between 1-9`);
                            return;
                        }

                        // TODO: check for floats?

                        // replace element in grid
                        results.data[r][c] = intResult;
                    }
                }

                // validate input for duplicates
                for (let r = 0; r < 9; r++) {
                    for (let c = 0; c < 9; c++) {
                        const val = results.data[r][c];
                        // temporarily set this cell to -1 to avoid counting it as a duplicate of itself
                        results.data[r][c] = -1;

                        const rowDuplicate = checkRow(results.data, val, r);
                        const colDuplicate = checkCol(results.data, val, c);
                        const blockDuplicate = checkBlock(results.data, val, r, c);

                        // restore value
                        results.data[r][c] = val;

                        if (rowDuplicate || colDuplicate || blockDuplicate) {
                            setError(`Duplicate value ${val} found at row ${r}, column ${c}`);
                            setGrid(results.data);
                            setSubmitted(false);
                            return;
                        }
                    }
                }

                // set grid and clear errors
                setError("");
                setGrid(results.data);
                setSubmitted(false);
                
            }
        })
        
        setShowCSVModal(false);
    }

    // TODO: write!
    const handleImage = () => {
        // e.preventDefault(); // prevent form from refreshing


        // const fileInput = document.getElementById('image_file');
        // const file = fileInput.files[0];
        // if (!file) {
        //     alert("Please select a file.");
        //     return;
        // }
        // console.log("fileInput is ", file);

        // const formData = new FormData();
        // formData.append('image_file', file);

        // TODO: send to backend, do image processing to get contours, recognize digits, etc
    }

    const getResult = async () => {
        try {
            // save current state before solving
            setPrevGrid([...grid.map(row => [...row])]);
            //setUnfilledPositions(createUnfilledPositions());
            const positions = new Set();
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    // only add to unfilled positions if exists in grid
                    if (grid[i][j] === -1) {
                        // create a unique key for each position
                        const key = `${i}-${j}`;
                        // store true if the cell has a value, false otherwise
                        positions.add(key);
                    }
                    
                }
            }
            
            setUnfilledPositions(positions);

            const response = await fetch('http://localhost:5000/solve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ grid }),
            });
            const result = await response.json();
            return result;
            
        } catch (err) {
            setError("Error sending board to server");
            return null;
        }
    }

    const handleHint = async () => {
        const result = await getResult();
        if (result == null) {
            // server error case
            return
        } 
        if (result?.solution) {
            const newGrid = [...grid.map((row) => [...row])];
            // make unfilledPositions into an array
            const position_array = Array.from(unfilledPositions);

            const randomIndex = Math.floor(Math.random() * position_array.length);
            const randomElem = position_array[randomIndex];
            
            const grid_indices = randomElem.split("-");
            const rowIndex = parseInt(grid_indices[0]);
            const colIndex = parseInt(grid_indices[1]);


            // Highlight for 2 seconds
            setHintElem([rowIndex, colIndex]);
            setTimeout(() => {
                setHintElem(null);
            }, 1500);
            
            newGrid[rowIndex][colIndex] = result.solution[rowIndex][colIndex];
            setGrid(newGrid);

            if (isFull(newGrid)) {
                setSubmitted(true);
                setUnfilledPositions(new Set());
                return;
            }

        } else {
            setSolveError(true);
            setError("");
        }
  
    }

    // Helper function to determine if a cell should be highlighted
    const shouldHighlightCell = (rowIndex, colIndex) => {
        if (!submitted) return false;
        
        const key = `${rowIndex}-${colIndex}`;
        // Highlight if the cell was empty before solving
        return unfilledPositions.has(key);
    };

    return (
        <div className="flex flex-col h-full w-full items-center justify-center">
            {/* modal for CSV upload button */}
            {showCSVModal && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[350px] w-[500px] rounded-md bg-white shadow-lg z-50">
                    <div className="relative w-full">
                        <button className="absolute top-2 right-2 z-60" onClick={() => setShowCSVModal(false)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="#DC143C" className="bi bi-x" viewBox="0 0 16 16">
                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                            </svg>
                        </button>
                    </div>
                    <div className="flex flex-col space-y-6 items-center mt-10 w-full h-full"> 
                        <h3 className="font-mulish -mt-2">Upload CSV File</h3>
                        <p className="font-mulish text-left mt-1 w-[80%]">Please upload a .csv file formatted as follows:
                            <li>Must be a 9×9 grid representing a Sudoku puzzle</li>
                            <li>Each cell contains a number from 1 to 9, or -1 for unknown cells</li>
                            <li>Values should be comma-separated, with each row on a new line</li>
                            <li>No duplicates within rows, columns, or 3x3 blocks</li>
                        </p>
                        <form onSubmit={handleCSV} className="mt-6">
                            <input id="csv_file" name="csv_file" type="file" accept=".csv"/>
                            <button type="submit" className="h-8 w-20 border-2 border-[#3D591C66] bg-[#B5D293] rounded-2 text-[#3D591C]">Submit</button>
                        </form>
                    </div>
                </div>
            )}
            {/* modal for upload button */}
            {showImageModal && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-[350px] w-[500px] rounded-md bg-white shadow-lg z-50">
                    <div className="relative w-full">
                        <button className="absolute top-2 right-2 z-60" onClick={() => setShowImageModal(false)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="#DC143C" className="bi bi-x" viewBox="0 0 16 16">
                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                            </svg>
                        </button>
                    </div>
                    <div className="flex flex-col space-y-6 items-center mt-10 w-full h-full"> 
                        <h3 className="font-mulish">Upload Image or Screenshot</h3>
                        <p className="font-mulish text-left mt-3 w-[80%]">Please upload an image of a sudoku board:
                            <li>Must be a 9×9 grid representing a Sudoku puzzle</li>
                            <li>Each cell contains a number from 1 to 9, or -1 if unknown</li>
                            <li>Should have reasonably clear grid boundaries, digit values, etc</li>
                        </p>
                        <form onSubmit={handleImage} className="mt-6">
                            <input id="image_file" name="image_file" type="file" accept="image/*"/>
                            <button type="submit" className="h-8 w-20 border-2 border-[#3D591C66] bg-[#B5D293] rounded-2 text-[#3D591C]">Submit</button>
                        </form>
                    </div>
                </div>
            )}
            <div className="absolute inset-0 -z-10 bg-cover bg-center opacity-40"
                style={{ backgroundImage: "url('/src/assets/paper-background.jpg')" }}>
            </div>
            
            {/* TODO: fix responsive styling of lightbulb */}
            <div>
                <button disabled={submitted} 
                    onMouseEnter={() => setShowHintText(true)}
                    onMouseLeave={() => setShowHintText(false)} 
                    className={`fixed right-[35%] top-[1%] ${submitted ? "cursor-not-allowed" : ""}`} 
                    onClick={handleHint}
                    >
                    <svg xmlns="absolute right-[20%] http://www.w3.org/2000/svg" width="36" height="36" fill="#F4BB44" class="bi bi-lightbulb mt-4" viewBox="0 0 16 16">
                        <path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13a.5.5 0 0 1 0 1 .5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1 0-1 .5.5 0 0 1 0-1 .5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m6-5a5 5 0 0 0-3.479 8.592c.263.254.514.564.676.941L5.83 12h4.342l.632-1.467c.162-.377.413-.687.676-.941A5 5 0 0 0 8 1"/>
                    </svg>
                </button>
                {showHintText && 
                    (<div className="absolute absolute right-[19%] top-[3%] border-2 border-gray-400 h-[35px] w-[220px] rounded-md bg-gray-200 flex items-center justify-center">
                        <p className="font-mulish text-[14px] text-gray-500 m-0">Reveal one element as a hint</p>
                    </div>)
                }

                {/* title */}
                <div className="flex flex-row items-center space-x-8">
                    <h1 className="text-6xl mt-3 mb-1 font-kaushan text-[#553F0D]">Sudoku Solver</h1>
                </div>
            
            </div>
            
            {/* optional error that appears/disappears under title */}
            <p className="text-lg text-red-500 mt-1 mb-2">
                {error != "" ? error : "\u00A0"}
            </p>
            
            <div className="grid grid-rows-3 grid-cols-3 h-[540px] w-[540px] border-4 border-black z-10">
                {/* map the large grid rows - rows 0, 1, 2 
                    use fragment to group multiple elements without adding extra nodes to the DOM
                */}
                {[0, 1, 2].map((boxRow) => (
                    <React.Fragment key={`row-${boxRow}`}>
                        {/* map the large grid cols - cols 0, 1, 2 */}
                        {[0, 1, 2].map((boxCol) => (
                            <div 
                                key={`box-${boxRow}-${boxCol}`} 
                                className="grid grid-rows-3 grid-cols-3 h-full w-full"
                            >
                                {/* map the inner grid rows - rows 0, 1, 2 */}
                                {[0, 1, 2].map((cellRow) => (
                                    <React.Fragment key={`cell-row-${cellRow}`}>
                                        {/* map the inner grid cols - rows 0, 1, 2 */}
                                        {[0, 1, 2].map((cellCol) => {
                                            // get overall indices within entire grid
                                            const rowIndex = boxRow * 3 + cellRow;
                                            const colIndex = boxCol * 3 + cellCol;
                                            const highlightLong = shouldHighlightCell(rowIndex, colIndex);
                                            const highlightTemp = hintElem?.[0] === rowIndex && hintElem?.[1] === colIndex;
                                            
                                            return (
                                                <div
                                                    key={`cell-${rowIndex}-${colIndex}`} 
                                                    className={`flex items-center justify-center h-full w-full 
                                                                ${getCellBorderClasses(cellRow, cellCol, boxRow, boxCol)}`}
                                                >
                                                    <input
                                                        type="text"
                                                        maxLength={1}
                                                        value={grid[rowIndex][colIndex] === -1 ? "" : grid[rowIndex][colIndex]}
                                                        onChange={(e) => updateGrid(e, rowIndex, colIndex)}
                                                        style={{
                                                            backgroundColor: highlightTemp || highlightLong ? '#B5D29366' : 'transparent'
                                                        }}
                                                        className="text-center text-xl w-full h-full focus:outline-none text-black"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                        ))}
                    </React.Fragment>
                ))}
            </div>
            {/* Buttons */}
            <div className="flex flex-row space-x-10">
                {/* Solve button, disables when already submitted */}
                <div className="flex align-center justify-center border-2 border-[#3D591C] rounded-md h-10 w-20 bg-[#B5D293] mt-10">
                    <button 
                        type="button" 
                        disabled={isFull(grid) || error != ""} 
                        className={`text-[#3D591C] text-md ${(isFull(grid) || error != "") ? "cursor-not-allowed" : ""}`} 
                        onClick={handleSubmit}
                    >
                        Solve
                    </button>
                </div>
                {/* Unsolve button, disables when not submitted */}
                <div className="flex align-center justify-center border-2 border-[#565748] rounded-md h-10 w-20 bg-[#e4e6c3] mt-10">
                    <button 
                        type="button" 
                        disabled={!submitted} 
                        className={`text-[#565748] text-md font-mulish ${submitted ? "" : "cursor-not-allowed"}`} 
                        onClick={handleUnsolve}
                    >
                        Unsolve
                    </button>
                </div>
                {/* Reset button */}
                <div className="flex align-center justify-center border-2 border-[#725E17] rounded-md h-10 w-20 bg-[#D6BC5D] mt-10">
                    <button 
                        type="button" 
                        onClick={handleReset}
                        className="text-[#725E17] text-md font-mulish"
                    >
                        Reset
                    </button>
                </div>
                {/* Upload CSV button */}
                <div className="flex align-center justify-center border-2 border-[#565748] rounded-md h-10 w-20 bg-[#e4e6c3] mt-10">
                    <button 
                        type="button" 
                        onClick={() => setShowCSVModal(true)}
                        className="text-[#565748] text-md font-mulish"
                    >
                        CSV File
                    </button>
                </div>
                {/* Upload Image button */}
                <div className="flex align-center justify-center border-2 border-[#3D591C] rounded-md h-10 w-20 bg-[#B5D293] mt-10">
                    <button 
                        type="button" 
                        disabled={submitted} 
                        className={`text-[#3D591C] text-md ${submitted ? "cursor-not-allowed" : ""}`} 
                        onClick={() => setShowImageModal(true)}
                    >
                        Image
                    </button>
                </div>
            </div>
        </div>
    )
}

export default App