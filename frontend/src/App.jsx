import React from 'react'
import UploadModule from '../components/upload';
import { useState, useEffect } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css';
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

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

    const [grid, setGrid] = useState(createEmptyGrid());
    const [prevGrid, setPrevGrid] = useState(createEmptyGrid());
    const [NaNError, setNaNError] = useState(false);
    const [duplicateError, setDuplicateError] = useState(false);
    const [solveError, setSolveError] = useState(false);
    const [serverError, setServerError] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [showUploadModal, setShowUploadModal] = useState(false);
    
    // store unfilled input positions before solving, empty at first
    const [unfilledPositions, setUnfilledPositions] = useState(new Set());

    const updateGrid = (e, rowIndex, colIndex) => {
        setSubmitted(false);
    
        const newVal = e.target.value;
        // if backspace or empty, set back to -1
        if (newVal === "") {
            // create new object to re-render grid
            const newGrid = [...grid.map(row => [...row])];
            newGrid[rowIndex][colIndex] = -1;
            setGrid(newGrid);

            // set all errors false
            setDuplicateError(false);
            setNaNError(false);
            setSolveError(false);
            setServerError(false);
            return;
        }

        // if not a number (which means not a digit, since we limit input to 1 character), show error
        if (isNaN(newVal)) {
            setNaNError(true);

            setDuplicateError(false);
            setSolveError(false);
            setServerError(false);
            return;
        }

        // get the integer version of the number
        const numVal = parseInt(newVal);

        // if not 1-9, show error
        if (numVal < 1 || numVal > 9) {
            setNaNError(true);
            return;
        }

        setNaNError(false);
        setDuplicateError(false);
        setSolveError(false);
        setServerError(false);
        
        // check for duplicates and set error if true
        const rowDuplicate = checkRow(numVal, rowIndex);
        const colDuplicate = checkCol(numVal, colIndex);
        const blockDuplicate = checkBlock(numVal, rowIndex, colIndex);

        if (rowDuplicate || colDuplicate || blockDuplicate) {
            setDuplicateError(true);
            return;
        }

        // make new grid and set
        const newGrid = [...grid.map(row => [...row])];
        newGrid[rowIndex][colIndex] = numVal;
        setGrid(newGrid);

        if (isFull(newGrid)) {
            setSubmitted(true);
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
    const checkRow = (val, row) => {
        return grid[row].includes(parseInt(val));
    }

    // check if there are any duplicates in the column
    const checkCol = (val, col) => {
        for (let row = 0; row < 9; row++) {
            if (grid[row][col] === parseInt(val)) {
                return true;
            }
        }
        return false;
    }

    // check if there are any duplicates in the block
    const checkBlock = (val, row, col) => {
        const startRow = Math.floor(row / 3) * 3;
        const startCol = Math.floor(col / 3) * 3;

        for (let r = startRow; r < startRow + 3; r++) {
            for (let c = startCol; c < startCol + 3; c++) {
                if (grid[r][c] === parseInt(val)) {
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
        if (duplicateError || NaNError) {
            return;
        }

        try {
            // save current state before solving
            setPrevGrid([...grid.map(row => [...row])]);
            
            // record which cells had values before solving and set unfilled positions
            const positions = new Set();
            for (let i = 0; i < 9; i++) {
                for (let j = 0; j < 9; j++) {
                    // only add to unfilled positions if it does not exists in grid
                    if (grid[i][j] === -1) {
                        // create a unique key for each position
                        const key = `${i}-${j}`;
                        // store true if the cell has a value, false otherwise
                        positions.add(key);
                    }
                    
                }
            }
            setUnfilledPositions(positions);
            
            console.log("Unfilled positions:", positions);

            // send to backend
            const response = await fetch('http://localhost:5000/solve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ grid }),
            });
    
            const result = await response.json();
            console.log("Response from backend:", result);
            
            // if there's a solution, set the grid with the new solution
            if (result?.solution) {
                setGrid(result.solution);
                setSubmitted(true);

                setDuplicateError(false);
                setNaNError(false);
                setSolveError(false);
                setServerError(false);
            } else {
                setSolveError(true);

                setDuplicateError(false);
                setNaNError(false);
                setSubmitted(false);
                setServerError(false);
            }
        } catch (error) {
            setServerError(true);

            console.error("Error sending grid to backend:", error);
            setSolveError(false);
            setDuplicateError(false);
            setNaNError(false);
            setSubmitted(false);
        }
    };

    const handleUnsolve = () => {
        setGrid([...prevGrid.map(row => [...row])]);
        setUnfilledPositions(new Set());
        setSubmitted(false);
        setDuplicateError(false);
        setNaNError(false);
        setServerError(false);
        setSolveError(false);
    }
    
    const handleReset = () => {
        setGrid(createEmptyGrid());
        setUnfilledPositions(new Set());
        setSubmitted(false);
        setDuplicateError(false);
        setNaNError(false);
        setServerError(false);
        setSolveError(false);
    }

    const handleUpload = () => {
        setShowUploadModal(true);
    }

    const handleHint = async () => {
        // TODO: handle empty case and full case

        try {
            // save current state before solving
            setPrevGrid([...grid.map(row => [...row])]);
            
            // record which cells had values before solving and set unfilled positions
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
            console.log("Response from backend:", result);

            if (result?.solution) {
                const newGrid = [...grid.map((row) => [...row])];
                // make unfilledPositions into an array
                const position_array = Array.from(positions);

                const randomIndex = Math.floor(Math.random() * position_array.length);
                const randomElem = position_array[randomIndex];
                console.log("random element to reveal is ", randomElem);
                
                const grid_indices = randomElem.split("-");
                const rowIndex = parseInt(grid_indices[0]);
                const colIndex = parseInt(grid_indices[1]);
                console.log("row is " + rowIndex + ", col is " + colIndex);
                
                newGrid[rowIndex][colIndex] = result.solution[rowIndex][colIndex];
                console.log("elem in solution is " + result.solution[rowIndex][colIndex]);
                setGrid(newGrid);

                if (isFull(newGrid)) {
                    setSubmitted(true);
                    setUnfilledPositions(new Set());
                    return;
                }

            } else {
                setSolveError(true);

                setDuplicateError(false);
                setNaNError(false);
                setSubmitted(false);
                setServerError(false);
            }

        } catch (err) {
            setServerError(true);
            console.error("Error sending grid to backend:", error);
            setSolveError(false);
            setDuplicateError(false);
            setNaNError(false);
            setSubmitted(false);
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
            <div className="absolute inset-0 -z-10 bg-cover bg-center opacity-40"
                style={{ backgroundImage: "url('/src/assets/paper-background.jpg')" }}>
            </div>
            <div className="flex flex-row items-center space-x-8">
                <h1 className="text-6xl mt-4 mb-1 font-kaushan text-[#553F0D]">Sudoku Solver</h1>
                <button disabled={submitted} className={`${submitted ? "cursor-not-allowed" : ""}`} onClick={handleHint}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="#F4BB44" class="bi bi-lightbulb mt-4" viewBox="0 0 16 16">
                        <path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13a.5.5 0 0 1 0 1 .5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1 0-1 .5.5 0 0 1 0-1 .5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m6-5a5 5 0 0 0-3.479 8.592c.263.254.514.564.676.941L5.83 12h4.342l.632-1.467c.162-.377.413-.687.676-.941A5 5 0 0 0 8 1"/>
                    </svg>
                </button>
                
            </div>
            
            <p className="text-lg text-red-500 mb-3">
                {NaNError && "Please enter a digit between 1 and 9"}
                {duplicateError && "No duplicates allowed within rows, columns, or inner grids"}
                {solveError && "No solution, check all inputs are as intended"}
                {serverError && "Error sending board to server"}
                {!NaNError && !duplicateError && !solveError && !serverError && "\u00A0"}
            </p>
            
            <div className="grid grid-rows-3 grid-cols-3 h-[540px] w-[540px] border-4 border-black box-border">
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
                                            const highlighted = shouldHighlightCell(rowIndex, colIndex);
                                            
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
                                                            backgroundColor: highlighted ? '#B5D29359' : 'transparent'
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
            {showUploadModal && <UploadModule onClick={() => setShowUploadModal(false)}></UploadModule>}
            {/* Buttons */}
            <div className="flex flex-row space-x-16">
                {/* Solve button, disables when already submitted */}
                <div className="flex align-center justify-center border-2 border-[#3D591C] rounded-md h-10 w-20 bg-[#B5D293] mt-10">
                    <button 
                        type="button" 
                        disabled={submitted} 
                        className={`text-[#3D591C] ${submitted ? "cursor-not-allowed" : ""}`} 
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
                        className={`text-[#565748] font-mulish ${submitted ? "" : "cursor-not-allowed"}`} 
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
                        className="text-[#725E17] font-mulish"
                    >
                        Reset
                    </button>
                </div>
                {/* Upload button */}
                <div className="flex align-center justify-center border-2 border-[#565748] rounded-md h-10 w-20 bg-[#e4e6c3] mt-10">
                    <button 
                        type="button" 
                        onClick={handleUpload}
                        className="text-[#725E17] font-mulish"
                    >
                        Upload
                    </button>
                </div>
            </div>
        </div>
    )
}

export default App