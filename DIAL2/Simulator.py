import types
from copy import deepcopy
from typing import Callable

import numpy.random
from numpy import random

from Address import Address
from Color import Colors, Color
from Message import Message
from State import State
from Topology import Topology, EdgeMessageOrder

#Algorithm = Callable[[State, Message], tuple[State, list[Message]]]
Algorithm = Callable[[State, Message], None]


_send_messages_: list[Message] = []

def send(message: Message):
    global _send_messages_
    _send_messages_.append(message)

class Simulator:
    time: int
    topology: Topology
    messages: list[Message]
    states: dict[Address, list[State]]
    algorithms: dict[str, Algorithm]
    random_generator: numpy.random.Generator

    def __init__(self, topology: Topology, algorithms: dict[str, Algorithm], initial_messages: list[Message], seed=0):
        self.topology = topology
        self.algorithms = algorithms
        self.messages = initial_messages
        self.states = {}
        self.time = 0
        self.random_generator = random.default_rng(seed)

    def insert_message_to_queue(self, message: Message):

        edge_config = self.topology.get_edge_config(message.source_address.node, message.target_address.node)
        message._is_lost = self.random_generator.random() < edge_config.reliability

        lowest_index_respecting_fifo = 0
        if edge_config.message_order == EdgeMessageOrder.FIFO:
            counter = 0
            for m in self.messages:
                if m.source_address.node == message.source_address.node and m.target_address.node == message.target_address.node:
                    lowest_index_respecting_fifo = counter
                counter += 1

        minimal_insert_index = max(self.time + 1, lowest_index_respecting_fifo)
        insert_index = self.random_generator.integers(low=minimal_insert_index, high=len(self.messages) + 1)
        self.messages.insert(insert_index, message)

    def step_forward(self, verbose=False):
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

        # Modify algorithm to always include relevant objects for better usability
        # also possible that this reduces usability as users can not import their own modules anymore
        # TODO: Test and remove if necessary
        scope: dict[str, any] = {
            "Colors": Colors,
            "Color": Color,
            "Message": Message,
            "send": send,
        }
        algorithm = types.FunctionType(algorithm.__code__, dict(scope, **__builtins__))

        # Execute the algorithm function and retrieve its results
        global _send_messages_
        _send_messages_ = []
        new_state = deepcopy(current_state)
        algorithm(new_state, current_message, self.time)
        new_messages = _send_messages_
        _send_messages_ = []


        # Update state
        #new_state, new_messages = algorithm(deepcopy(current_state), current_message)
        self.states[target_address].append(new_state)
        current_message._child_messages = [msg._id for msg in new_messages]
        for msg in new_messages:
            msg._parent_message = current_message._id
            self.insert_message_to_queue(msg)
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
