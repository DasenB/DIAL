import random
import types
from copy import deepcopy
from typing import Callable, Tuple

import numpy.random

from DIAL.Address import Address
from DIAL.Color import Colors, Color
from DIAL.Message import Message
from DIAL.State import State
from DIAL.Topology import Topology, EdgeConfig

# Algorithm = Callable[[State, Message], tuple[State, list[Message]]]
Algorithm = Callable[[State, Message, int], None]
ConditionHook = Callable[[State, list[Message], int], None]

_send_messages_: list[Message] = []


def send(message: Message):
    global _send_messages_
    _send_messages_.append(message)


def send_to_self(message: Message, min_time_delay: int):
    global _send_messages_
    message._is_self_message = True
    message._self_message_delay = min_time_delay
    _send_messages_.append(message)


class Simulator:
    time: int
    theta: int

    messages: dict[int, list[Message]]
    states: dict[Address, list[State]]

    topology: Topology
    algorithms: dict[str, Algorithm]
    condition_hooks: list[ConditionHook]

    random_number_generator_states: list[any]
    random_generator: numpy.random.Generator

    def __init__(self, topology: Topology, algorithms: dict[str, Algorithm], initial_messages: list[Message], seed=0,
                 condition_hooks: list[ConditionHook] = []):
        # Setup RNG
        self.random_generator = numpy.random.default_rng(seed)
        self.random_number_generator_states = [self.random_generator.__getstate__()]

        # Store static information of the simulation environment
        self.topology = topology
        self.algorithms = algorithms
        self.condition_hooks = condition_hooks

        # Initialize state of the simulation
        self.time = 0
        self.theta = 0
        self.messages = {
            0: initial_messages
        }
        self.states = {}

    def insert_message_to_queue(self, message: Message):
        if message.source_address.node_name == message.target_address.node_name:
            print("No edge is necessary")

        # Determine whether message is lost
        edge_config: EdgeConfig | None = self.topology.get_edge_config(message.source_address.node_name,
                                                                       message.target_address.node_name)
        if edge_config is None:
            print(
                f'No edge exists between {message.source_address.node} and {message.target_address.node}. Can not send message.')
            exit(1)
        message._is_lost = self.random_generator.random() < edge_config.reliability

        # Determine position in the queue
        scheduler = edge_config.scheduler
        insert_time = scheduler(self.topology, self.time, self.theta, self.messages, message, self.random_generator)
        if insert_time not in self.messages.keys():
            self.messages[insert_time] = []
        message._arrival_time = insert_time
        message._arrival_theta = len(self.messages[insert_time])
        self.messages[insert_time].append(message)
        print(f'{message._arrival_time} {message._arrival_theta}')

    def insert_self_message_to_queue(self, message: Message):
        insert_time = self.time + message._self_message_delay

        # A node can not receive multiple messages at the same time.
        # If a node already receives a message at a given time the message must be delayed.
        while True:
            if insert_time not in self.messages.keys():
                self.messages[insert_time] = []
                break
            if any(m.target_address.node_name == message.target_address.node_name for m in self.messages[insert_time]):
                insert_time += 1
            else:
                break
        message._arrival_time = insert_time
        message._arrival_theta = len(self.messages[insert_time])
        self.messages[insert_time].append(message)
        print(f'{message._arrival_time} {message._arrival_theta}')

    def step_forward(self, verbose=False) -> bool:
        if self.time not in self.messages.keys():
            return False
        if self.theta == len(self.messages.keys()):
            return False

        # Find inputs for the next processing step
        current_message = self.messages[self.time][self.theta]
        target_address = current_message.target_address
        if target_address not in self.states.keys():
            neighbors = self.topology.get_neighbors(target_address.node_name)
            new_seed = self.random_generator.integers(low=0, high=100)
            empty_state: State = State(address=target_address, neighbors=neighbors, seed=new_seed)
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
            "send_to_self": send_to_self
        }
        algorithm = types.FunctionType(algorithm.__code__, dict(scope, **__builtins__))

        # Execute the algorithm function and retrieve its results
        global _send_messages_
        _send_messages_ = []
        new_state = deepcopy(current_state)
        algorithm(new_state, current_message, self.time)
        for hook in self.condition_hooks:
            hook(new_state, _send_messages_, self.time)
        new_messages = _send_messages_
        _send_messages_ = []

        # Update state
        self.states[target_address].append(new_state)
        current_message._child_messages = [msg._id for msg in new_messages]
        for msg in new_messages:
            msg._parent_message = current_message._id
            msg._creation_time = self.time
            msg._creation_theta = self.theta
            if msg._is_self_message:
                self.insert_self_message_to_queue(msg)
            else:
                self.insert_message_to_queue(msg)
        self.random_number_generator_states.append(self.random_generator.__getstate__())

        if verbose:
            print(
                f't={self.time}/{self.theta}: {target_address} received Message from {current_message.source_address}')
            print(f'\t\tColor:\t{current_state.color} -> {new_state.color}')
            print(f'\t\tMessages:\t {[msg.target_address for msg in new_messages]}')
            print('\n')

        # Advance time
        if len(self.messages[self.time]) == self.theta + 1:
            new_time = self.time + 1
            for t in sorted(self.messages.keys()):
                if t > self.time:
                    new_time = t
                    break
            self.time = new_time
            self.theta = 0
        else:
            self.theta += 1

        return True

    def step_backward(self, verbose=False):
        if self.time == min(self.messages.keys()) and self.theta == 0:
            return False

        # Decrease time
        if self.theta == 0:
            new_time = self.time - 1
            for t in sorted(self.messages.keys(), reverse=True):
                if t < self.time:
                    new_time = t
                    break
            self.time = new_time
            self.theta = len(self.messages[self.time]) - 1
        else:
            self.theta -= 1

        # Undo action
        current_message = self.messages[self.time][self.theta]
        for t in list(self.messages.keys()):
            if t < self.time:
                continue
            self.messages[t] = list(
                filter(lambda msg: msg._id not in current_message._child_messages, self.messages[t]))
            if len(self.messages[t]) == 0:
                del self.messages[t]

        self.states[current_message.target_address].pop()
        if len(self.states[current_message.target_address]) == 1:
            del self.states[current_message.target_address]
        self.random_number_generator_states.pop()
        self.random_generator.__setstate__(self.random_number_generator_states[-1])

        if verbose:
            print(
                f't={self.time}/{self.theta}: {current_message.target_address} UN-received Message from {current_message.source_address}')
            print("")

        return True
