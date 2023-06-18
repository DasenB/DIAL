import types
from copy import deepcopy
from typing import Callable

import numpy.random
from numpy import random

from Address import Address
from Color import Colors, Color
from Message import Message
from State import State
from Topology import Topology, EdgeMessageOrder, EdgeConfig

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
    random_number_generator_states: list[any]
    algorithms: dict[str, Algorithm]
    random_generator: numpy.random.Generator

    def __init__(self, topology: Topology, algorithms: dict[str, Algorithm], initial_messages: list[Message], seed=0):
        self.random_generator = random.default_rng(seed)
        self.random_number_generator_states = [self.random_generator.__getstate__()]
        self.topology = topology
        self.algorithms = algorithms
        self.messages = []
        self.time = -1
        for initial_message in initial_messages:
            self.insert_message_to_queue(initial_message)
        self.time = 0
        self.states = {}

    def insert_message_to_queue(self, message: Message):

        edge_config: EdgeConfig | None = self.topology.get_edge_config(message.source_address.node, message.target_address.node)
        if edge_config is None:
            print(f'No edge exists between {message.source_address.node} and {message.target_address.node}. Can not send message.')
            return

        message._is_lost: bool = self.random_generator.random() < edge_config.reliability

        lowest_index_respecting_fifo: int = 0
        if edge_config.message_order == EdgeMessageOrder.FIFO:
            counter: int = 0
            for m in self.messages:
                if m.source_address.node == message.source_address.node and m.target_address.node == message.target_address.node:
                    lowest_index_respecting_fifo = counter
                counter += 1

        minimal_insert_index: int = max(self.time + 1, lowest_index_respecting_fifo)
        maximal_insert_index: int = len(self.messages)
        insert_index: int = maximal_insert_index

        if maximal_insert_index > minimal_insert_index:
            insert_index = self.random_generator.integers(low=minimal_insert_index, high=maximal_insert_index + 1)
        self.messages.insert(insert_index, message)

        # Store modified arrival time in the messages so that the simulator can calculate their progress
        self.messages[insert_index].title
        for i in range(insert_index, len(self.messages)):
            self.messages[i]._arrival_time[self.time] = i

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
        self.random_number_generator_states.append(self.random_generator.__getstate__())

        if verbose:
            print(f't={self.time-1}: {target_address} received Message from {current_message.source_address}')
            print(f'\t\tColor:\t{current_state.color} -> {new_state.color}')
            print(f'\t\tMessages:\t {[msg.target_address for msg in new_messages]}')

            for m in self.messages:
                print(f'\t\tTimes:\t {m._arrival_time}')
            print("")

    def step_backward(self, verbose=False):
        if self.time == 0:
            return
        self.time -= 1
        current_message = self.messages[self.time]
        for index in range(self.time, len(self.messages)):
            if self.time in self.messages[index]._arrival_time.keys():
                del self.messages[index]._arrival_time[self.time]
        self.messages = list(filter(lambda msg: msg._id not in current_message._child_messages, self.messages))

        self.states[current_message.target_address].pop()
        self.random_number_generator_states.pop()
        self.random_generator.__setstate__(self.random_number_generator_states[-1])

        if verbose:
            print(f't={self.time-1}: {current_message.target_address} UN-received Message from {current_message.source_address}')
            for m in self.messages:
                print(f'\t\tTimes:\t {m._arrival_time}')
            print("")

