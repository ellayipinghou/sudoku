import math
import copy
import csv

def parse_csv(file):
        board = []
        to_assign = {}
        with open(file, mode ='r') as file:
                # read csv file line by line
                reader = csv.reader(file)
                for row_index, row in enumerate(reader):
                        int_row = []
                        for col_index, elem in enumerate(row):
                                elem = int(elem)
                                if math.isnan(elem):
                                        return None, None
                                if elem == -1:
                                        to_assign[row_index, col_index] = []
                                elif elem < 1 or elem > 9:
                                        return None, None
                                int_row.append(elem)
                                
                        board.append(int_row)
        return board, to_assign

# check that no two elements in a row are the same
def check_row(board: list, assigned: dict, row_index: int):
        # create a set for the values that have been seen within the row
        seen = set()

        # iterate over each element in a row
        for col_index, elem in enumerate(board[row_index]):
                if elem in seen and elem != -1:
                        return False
                
                # if the (row, col) element was initially unassigned, then check "assigned" for updated values
                if elem == -1 and (row_index, col_index) in assigned:
                        if assigned[(row_index, col_index)] in seen:
                                return False
                        else:
                                seen.add(assigned[(row_index, col_index)])
                if (elem != -1):
                        seen.add(elem)
        return True

# check that no two elements in a column are the same
def check_col(board: list, assigned: dict, col_index: int):
        seen = set()

        # iterate over column by visiting each row[col_index] value
        for row_index, row in enumerate(board):
                elem = row[col_index]
                if elem in seen and elem != -1:
                        return False
                
                # if the (row, col) element was initially unassigned, then check "assigned" for updated values
                if elem == -1 and (row_index, col_index) in assigned:
                        if assigned[(row_index, col_index)] in seen:
                                return False
                        else:
                                seen.add(assigned[(row_index, col_index)])
                if (elem != -1):
                        seen.add(elem)

        return True

# helper function for get_grid_indices, will return a (row, col) value for the start of the grid
def get_grid_indices(board: list, grid_number: int):
        # 3x3 grids numbered from 1-9, in row-major order
        match grid_number:
                case 0:
                        return 0, 0
                case 1:
                        return 3, 0
                case 2:
                        return 6, 0
                case 3:
                        return 3, 0
                case 4:
                        return 3, 3
                case 5:
                        return 3, 6
                case 6:
                        return 6, 0
                case 7:
                        return 6, 3
                case 8:
                        return 6, 6

# check that no two elements in a grid are the same
def check_grid(board: list, assigned: dict, grid_number: int):
        seen = set()
        # get the starting row and column values
        start_row, start_col = get_grid_indices(board, grid_number)

        # define curr row and curr col for iterating over 3x3 grid
        curr_row = start_row
        curr_col = start_col
        while curr_row <= start_row + 2 and curr_col <= start_col + 2:
                elem = board[curr_row][curr_col]
                if elem in seen and elem != -1:
                        return False
                
                # if the (row, col) element was initially unassigned, then check "assigned" for updated values
                if elem == -1 and (curr_row, curr_col) in assigned:
                        if assigned[(curr_row, curr_col)] in seen:
                                return False
                        else:
                                seen.add(assigned[(curr_row, curr_col)])
                if (elem != -1):
                        seen.add(elem)

                # at end of grid row, go to beginning of next column
                if curr_row == start_row + 2:
                        curr_row = start_row
                        curr_col += 1
                else:
                        curr_row += 1
        return True

# check that the current board and the assigned values satisfy the all-diff constraints for each row, column, and grid
def satisfies_constraints(board: list, assigned: dict):
        row_index = 0
        col_index = 0
        grid_index = 0
        while (row_index < 9):
                if not check_row(board, assigned, row_index):
                        return False
                row_index += 1
        while (col_index < 9):
                if not check_col(board, assigned, col_index):
                        return False
                col_index += 1

        while (grid_index < 9):
                if not check_grid(board, assigned, grid_index):
                        return False
                grid_index += 1

        return True

# remove the value being assigned from domain of all (col, row) unassigned variables in the same row, column, or grid as the variable it is being assigned to
def forward_checking(to_assign: dict, possible_value: str, row_index: int, col_index: int):
        # iterate over all the unassigned variables
        for elem in to_assign:
                # calculate whether the element is in the same grid as the given element
                same_grid = (math.floor(row_index / 3) * 3 == math.floor(elem[0] / 3) * 3) and (math.floor(col_index / 3) * 3 == math.floor(elem[1] / 3) * 3)
                
                # check if the element is is the same row, column, or grid
                if (row_index == elem[0] or col_index == elem[1] or same_grid):
                        # check if the element has the possible value in the domain
                        if possible_value in to_assign[elem]:
                                # if it's the last value in the domain, then there must be a mistake, so return False to signal backtracking!
                                if (len(to_assign[elem]) == 1):
                                        return False
                                # otherwise, remove the value from the domain
                                else:
                                        to_assign[elem].remove(possible_value)

        # if none of the domains are left empty, then return True
        return True

# recursive helper function for solve
def recursive_backtracking(board: list, to_assign: dict, assigned: dict):
        # if assignment complete, then return assignment
        if (len(to_assign) == 0 and satisfies_constraints(board, assigned)):
                # add each assignment from assigned to the board and return the completed board
                for elem in assigned:
                        board[elem[0]][elem[1]] = assigned[elem]
                return board
        
        # sort the dictionary by domain size and get the variable with the smallest domain
        # note: elem is of the form ((row, col), ['possible_value1', 'possible_value2', etc])
        elem = sorted(to_assign.items(), key=lambda x: len(x[1]))[0]

        # try each possible value in the element's domain until one works
        for possible_value in elem[1]:
                # make a copy of the variables and domains in to_assign, in case backtracking is triggered
                to_assign_copy = copy.deepcopy(to_assign)

                # add the assignment to assigned, remove the variable from to_assign
                assigned[(elem[0][0], elem[0][1])] = possible_value
                to_assign.pop((elem[0][0], elem[0][1]))

                # if the assignment satisfies the constraints, and forward-checking doesn't leave any domains empty, recurse to next variable
                if satisfies_constraints(board, assigned) and forward_checking(to_assign, possible_value, elem[0][0], elem[0][1]):
                        result = recursive_backtracking(board, to_assign, assigned)
                        # success! return resulting board
                        if result != None:
                                return result
                        
                # otherwise, backtrack by removing the assignment from assigned and restoring the to_assign
                assigned.pop((elem[0][0], elem[0][1]))
                to_assign = to_assign_copy

        # case: no solution
        return None
        
# the main algorithm for solving the sudoku puzzle
def solve(board: list, to_assign: dict):
        assigned = {}
        # get the initial variables to assign with the calculated domains
        to_assign = calculate_initial_domains(board, to_assign)
        # recursively backtrack until an answer or None is found!
        return recursive_backtracking(board, to_assign, assigned)

# initialize the domains of the unassigned variables in to_assign
def calculate_initial_domains(board: list, to_assign: dict):
        # iterate over to_assign and calculate each domain
        for elem in to_assign:
                to_assign[elem] = calculate_domain(board, elem[0], elem[1])

        # order so that the elements with the smallest domain appear first
        return dict(sorted(to_assign.items(), key=lambda x: len(x[1])))

# calculate the domain of a (row, col) variable based on the other values in the row/col/grid
# NOTE: this function is only used before any assignments are made, so I did not bother to consider values that have been assigned when calculating domain
def calculate_domain(board: list, row_index: int, col_index: int):
        # start with all possible values 1-9 in domain
        domain = [1, 2, 3, 4, 5, 6, 7, 8, 9]

        # iterate over the given row and remove the values of the other elements in the row
        for curr_col, elem in enumerate(board[row_index]):
                if elem in domain and elem != -1:
                        domain.remove(elem)

        # iterate over the given column and remove the values of the other elements in the column
        for curr_row, elem in enumerate(board):
                if elem[col_index] in domain and elem[col_index] != -1:
                        domain.remove(elem[col_index])

        # iterate over the given grid and remove the values of the other elements in the grid
        grid_row_start = (math.floor(row_index / 3) * 3)
        grid_col_start = (math.floor(col_index / 3) * 3)
        curr_row = grid_row_start 
        curr_col = grid_col_start
        while curr_row <= grid_row_start + 2 and curr_col <= grid_col_start + 2:
                        elem = board[curr_row][curr_col]
                        if elem in domain and elem != -1:
                                domain.remove(elem)
                        # if reached end of grid row, move to next col
                        if curr_row == grid_row_start + 2:
                                curr_row = grid_row_start
                                curr_col += 1
                        else:
                                curr_row += 1
        return domain

# if __name__ == "__main__":
#         filename = input("Enter file name: ")
#         board, to_assign = parse_csv(filename)
#         print(board)
#         print(to_assign)
#         solution = solve(board, to_assign)

#         if (solution == None):
#                 print("\nNo solution found.")
#         else:
# #               # print in a grid format
#                 print("\nSOLUTION:")
#                 for row in solution:
#                         for col_index, elem in enumerate(row):
# #                                 # add space after each element except for the last element in the row
#                                 if (col_index != 8):
#                                         print(elem, end=" ")
#                                 else:
#                                         print(elem, end="")      
# #                         # print on next line   
#                         print("")
