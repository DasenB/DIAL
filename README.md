# DIAL
Framework for Distributed Algorithms in Python

## Mandatory Requirements
[] Simulation of distributed algorithms
[] It is possible to go back in time within the simulation
    - Option 1: Using a seed and count the number of steps to rerun to the desired position
    - Option 2: Save the state after every action
[] Visualizing the state of the algorithm
[] It should be possible to stop the simulation to get a console on the individual nodes to change its state

## Optional Requirements
[] Multiple Algorithms can run on the network at the same time
[] Allow execution on multiple physical machines

## Problems
- Running multiple algorithms on the same network at the same time
- How do individual nodes know their neighbors?

## Hard Problems
  - Subroutines: Calling child algorithm to use its result in the parent algorithm
  - Recreating previous states of the system if the user uses global variables outside DIALs control


## TODO
- Finish the interface
- Error-handling
- Documentation and extensive comments
- Network adapter
- Example algorithms