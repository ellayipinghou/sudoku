# for flask server

from flask import Flask, request, jsonify
from flask_cors import CORS
from solver import solve
from solver import parse_csv

app = Flask(__name__)

# enables CORS for development
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

@app.route('/solve', methods=['POST'])
def solve_sudoku():
        data = request.get_json()
        grid = data.get('grid')

        to_assign = {}
        for row_index, row in enumerate(grid):
                for col_index, elem in enumerate(row):
                        if grid[row_index][col_index] == -1:
                               to_assign[row_index, col_index] = []

        solution = solve(grid, to_assign)



        # sends a JSON response back to the frontend, confirming the data was received
        return jsonify({"message": "Solution", "solution": solution})

@app.route('/uploadCSV', methods=['POST'])
def upload_CSV():
        if 'csv_file' not in request.files:
                return jsonify({'error': 'No file part'}), 400
        
        # get file from request
        file = request.files['csv_file']
        if file.filename == '':
                return jsonify({'error': 'No selected file'}), 400

        content = file.read().decode('utf-8')
        grid = parse_csv(content)

        return jsonify({"message": "resulting grid", "grid": grid})
       

if __name__ == '__main__':
    app.run(port=5000, debug=True)