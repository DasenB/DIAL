from typing import Callable

from State import State
from Message import Message
from Topology import Topology
from Address import Address
from copy import deepcopy

Algorithm = Callable[[State, Message], tuple[State, list[Message]]]


class Simulator:
    time: int
    topology: Topology
    messages: list[Message]
    states: dict[Address, list[State]]
    algorithms: dict[str, Algorithm]

    def __init__(self, topology: Topology, algorithms: dict[str, Algorithm], initial_messages: list[Message]):
        self.topology = topology
        self.algorithms = algorithms
        self.messages = initial_messages
        self.states = {}
        self.time = 0

    def step_forward(self, verbose=False) -> Message | None:
        if self.time == len(self.messages):
            return None

        # Find inputs for the next processing step
        current_message = self.messages[self.time]
        target_address = current_message.target_address
        if target_address not in self.states.keys():
            neighbors = self.topology.get_neighbors(target_address.node)
            empty_state: State = State(address=target_address, neighbors=neighbors)
            self.states[target_address] = [empty_state]
        current_state = self.states[target_address][-1]
        current_state.current_time = self.time
        algorithm = self.algorithms[target_address.algorithm]

        # Update state
        new_state, new_messages = algorithm(deepcopy(current_state), current_message)
        self.states[target_address].append(new_state)
        current_message._child_messages = [msg._id for msg in new_messages]
        for msg in new_messages:
            msg._parent_message = current_message._id
        self.messages.extend(new_messages)
        self.time += 1

        if verbose:
            print(f't={self.time-1}: {target_address} received Message from {current_message.source_address}')
            print(f'\t\tColor:\t{current_state.color} -> {new_state.color}')
            print(f'\t\tMessages:\t {[msg.target_address for msg in new_messages]}')
            print("")

    def step_backward(self, verbose=False):
        if self.time == 0:
            return
        self.time -= 1
        current_message = self.messages[self.time]
        self.messages = list(filter(lambda msg: msg not in current_message._child_messages, self.messages))
        self.states[current_message.target_address].pop()
