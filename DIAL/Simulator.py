import copy
import textwrap
import types
from copy import deepcopy
from typing import Callable, Tuple

import numpy.random

from DIAL.Address import Address
from DIAL.Color import DefaultColors, Color
from DIAL.Message import Message
from DIAL.State import State
from DIAL.Topology import Topology, EdgeConfig, DefaultTopologies
from DIAL.ReadOnlyDict import ReadOnlyDict

Algorithm = Callable[[State, Message, int, ReadOnlyDict], None]
ConditionHook = Callable[[State, list[Message], int, ReadOnlyDict], None]

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
    time: int | None
    theta: int | None

    messages: dict[int, list[Message]]
    states: dict[Address, list[State]]
    node_colors: dict[Tuple[int | None, int | None], dict[Address, Color]]
    node_neighbors: dict[Tuple[int | None, int | None], dict[Address, list[str]]]

    topology: Topology
    algorithms: dict[str, Algorithm]
    condition_hooks: list[ConditionHook]

    random_number_generator_states: list[any]
    random_generator: numpy.random.Generator

    def __init__(self, topology: Topology | DefaultTopologies, algorithms: dict[str, Algorithm], initial_messages: dict[int, list[Message]],
                 seed=0,
                 condition_hooks: list[ConditionHook] = []):

        # Setup RNG
        self.random_generator = numpy.random.default_rng(seed)
        self.random_number_generator_states = [self.random_generator.__getstate__()]

        # Store static information of the simulation environment
        if isinstance(topology, DefaultTopologies):
            self.topology = topology.topology_object
        else:
            self.topology = topology
        self.algorithms = algorithms
        self.condition_hooks = condition_hooks

        # Initialize state of the simulation
        if len(initial_messages.keys()) == 0:
            print("Error: No initial messages supplied!")
            exit(1)
        self.messages = initial_messages
        for t in self.messages.keys():
            for message in self.messages[t]:
                if message.target_address.algorithm not in self.algorithms.keys():
                    print(f"ERROR: Unknown algorithm in target_address '{message.target_address}'")
                    exit(1)

        self.time = None
        self.theta = None

        for t in self.messages.keys():
            n = 0
            for msg in self.messages[t]:
                msg._arrival_theta = n
                msg._arrival_time = t
                n += 1
        self.states = {}
        self.node_colors = {}
        self.node_neighbors = {}

    def find_first(self) -> Tuple[int, int] | None:
        if len(self.messages.keys()) == 0:
            return None
        t = min(self.messages.keys())
        if len(self.messages[t]) == 0:
            return None
        return t, 0

    def find_next(self) -> Tuple[int, int] | None:
        if self.time is None and self.theta is None:
            return self.find_first()
        if self.theta + 1 < len(self.messages[self.time]):
            return self.time, self.theta + 1
        for t in sorted(self.messages.keys()):
            if t > self.time and len(self.messages[t]) > 0:
                return t, 0
        return None

    def find_previous(self) -> Tuple[int, int] | None:
        if self.theta > 0:
            return self.time, self.theta - 1
        for t in sorted(self.messages.keys(), reverse=True):
            if t < self.time and len(self.messages[t]) > 0:
                return t, len(self.messages[t]) - 1
        return None

    def insert_message_to_queue(self, message: Message, time: int | None = None, theta: int | None = None, is_lost: bool | None = None) -> bool:

        # Determine whether message is lost
        edge_config: EdgeConfig | None = self.topology.get_edge_config(message.source_address.node_name,
                                                                       message.target_address.node_name)
        if edge_config is None:
            print(f'No edge exists between {message.source_address.node_name} and {message.target_address.node_name}. Can not send message.')
            return False
        if is_lost is None:
            message._is_lost = self.random_generator.random() > edge_config.reliability
        else:
            message._is_lost = is_lost

        if message.target_address.algorithm not in self.algorithms.keys():
            print(f"ERROR: Unknown algorithm in target_address '{message.target_address}'")
            exit(1)

        # Determine position in the queue
        scheduler = edge_config.scheduler
        insert_time = time
        if time is None:
            insert_time = scheduler(self.topology, self.time, self.theta, self.messages, message, self.random_generator)
        if insert_time not in self.messages.keys():
            self.messages[insert_time] = []
        message._arrival_time = insert_time

        insert_theta = len(self.messages[insert_time])
        if theta is not None:
            if insert_theta != theta:
                return False
        message._arrival_theta = insert_theta
        self.messages[insert_time].append(message)
        return True

    def get_message(self, message_id: str | None) -> Message | None:
        if message_id is None:
            return None
        for t in self.messages.keys():
            for msg in self.messages[t]:
                if str(msg._id) == str(message_id):
                    return msg
        return None

    def insert_self_message_to_queue(self, message: Message):
        if message.target_address.algorithm not in self.algorithms.keys():
            print(f"ERROR: Unknown algorithm in target_address '{message.target_address}'")
            exit(1)
        if message.target_address.node_name != message.source_address.node_name:
            print(f"ERROR: Self-Messages can not be send to a different node.")
            exit(1)
        current_time = self.time
        if current_time is None:
            current_time = self.find_first()[0]
        insert_time = current_time + message._self_message_delay
        message._arrival_time = insert_time
        if insert_time not in self.messages.keys():
            self.messages[insert_time] = []
        message._arrival_theta = len(self.messages[insert_time])
        self.messages[insert_time].append(message)

    def step_forward(self, verbose=False) -> dict[str, any] | None:
        # Advance time
        new_position = self.find_next()
        if new_position is None:
            return None
        self.time = new_position[0]
        self.theta = new_position[1]
        # Find inputs for the next processing step
        current_message = self.messages[self.time][self.theta]
        edge_is_in_topology = self.topology.has_edge(current_message.source_address.node_name, current_message.target_address.node_name)
        if not edge_is_in_topology:
            warning_message = f'''
            > WARNING: Message {str(current_message._id)} violates topology!
            > 
            > Edge {current_message.source_address.node_name} -> {current_message.target_address.node_name} is not in topology.
            '''
            warning_message = textwrap.dedent(warning_message)
            print('\033[96m' + warning_message + '\033[0m')

        target_address = current_message.target_address
        if target_address not in self.states.keys():
            neighbors = self.topology.get_neighbors(target_address.node_name)
            new_seed = self.random_generator.integers(low=0, high=100)
            empty_state: State = State(address=target_address, neighbors=neighbors, seed=new_seed)
            self.states[target_address] = [empty_state]
        current_state = self.states[target_address][-1]
        algorithm = self.algorithms[target_address.algorithm]

        # Collect all local states
        local_state_copies: dict[Address, State] = {}
        for address in self.states.keys():
            if address.node_name == current_message.target_address.node_name:
                local_state_copies[address] = copy.deepcopy(self.states[address][-1])

        # Modify algorithm to always include relevant objects for better usability
        # also possible that this reduces usability as users can not import their own modules anymore
        # TODO: Test and remove if necessary
        scope: dict[str, any] = {
            "DefaultColors": DefaultColors,
            "Color": Color,
            "Message": Message,
            "Address": Address,
            "State": State,
            "send": send,
            "send_to_self": send_to_self
        }
        algorithm = types.FunctionType(algorithm.__code__, dict(scope, **__builtins__))

        # Execute the algorithm function and retrieve its results
        global _send_messages_
        _send_messages_ = []
        new_state = current_state
        if not current_message._is_lost:
            new_state = deepcopy(current_state)
            algorithm(new_state, current_message, self.time, ReadOnlyDict(local_state_copies))
            for hook in self.condition_hooks:
                hook(new_state, _send_messages_, self.time, ReadOnlyDict(local_state_copies))
        new_messages: list[Message] = _send_messages_
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

        # Update Node Color
        self.node_colors[self.time, self.theta] = {}
        self.node_colors[self.time, self.theta][target_address] = new_state.color

        # Update Node Neighbors
        self.node_neighbors[self.time, self.theta] = {}
        self.node_neighbors[self.time, self.theta][target_address] = new_state.neighbors

        if verbose:
            new_row = "\n                    "
            new_messages_str = "[" + new_row + new_row.join([( str(msg._arrival_time) + " -> " + msg.target_address.__repr__()) for msg in new_messages]) + "\n               ]"
            if len(new_messages) == 0:
                new_messages_str = "[]"

            print(f''
                  f'Direction:      >> Forward >>\n'
                  f'New Time:       {self.time}/{self.theta}\n'
                  f'Receiver:       {target_address}\n'
                  f'Message:        {{\n'
                  f'                    id:           {current_message.summary()["id"]}\n'
                  f'                    color:        {current_message.summary()["color"]}\n'
                  f'                    title:        {current_message.summary()["title"]}\n'
                  f'                    parent:       {current_message.summary()["parent"]}\n'
                  f'                    children:     {len(current_message.summary()["children"])}\n'
                  f'                    creation:     {current_message.summary()["creation_time"]}/{current_message.summary()["creation_theta"]}\n'
                  f'                    arrival:      {current_message.summary()["arrival_time"]}/{current_message.summary()["arrival_theta"]}\n'
                  f'                    is_lost:      {current_message.summary()["is_lost"]}\n'
                  f'                    self_message: {current_message.summary()["self_message"]}\n'
                  f'                }}\n'
                  f'State:          {{\n'
                  f'                    color:        {current_state.color} -> {new_state.color},\n'
                  f'                    neighbors:    {current_state.neighbors} -> {new_state.neighbors},\n'
                  f'                }}\n'
                  f'New Messages:   {new_messages_str}\n'
                  f'Queue Times:    {sorted(self.messages.keys())}\n'
                  f'===================================================================================\n'
                  )

        # Build summary of the last action
        action: dict[str, any] = {
            "time": self.time,
            "theta": self.theta,
            "consumed_message": current_message.summary(),
            "produced_messages": [msg.summary() for msg in new_messages]
        }
        return action

    def step_backward(self, verbose=False) -> dict[str, any] | None:

        if self.time is None and self.theta is None:
            return None

        # Undo action
        current_message: Message = self.messages[self.time][self.theta]
        removed_messages: list[Message] = []
        for t in list(self.messages.keys()):
            keep_messages: list[Message] = []
            for msg in self.messages[t]:
                if msg._id in current_message._child_messages:
                    removed_messages.append(msg)
                else:
                    keep_messages.append(msg)
            self.messages[t] = keep_messages
            if len(self.messages[t]) == 0:
                del self.messages[t]

        # Remove Node Color
        del self.node_colors[self.time, self.theta]

        # Remove Node Neighbors
        del self.node_neighbors[self.time, self.theta]

        self.states[current_message.target_address].pop()
        if len(self.states[current_message.target_address]) == 1:
            del self.states[current_message.target_address]
        self.random_number_generator_states.pop()
        self.random_generator.__setstate__(self.random_number_generator_states[-1])


        # Decrease time
        new_position = self.find_previous()
        if new_position is None:
            self.time = None
            self.theta = None
        else:
            self.time = new_position[0]
            self.theta = new_position[1]

        if verbose:
            new_row = "\n                    "
            removed_messages_str = "[" + new_row + new_row.join(
                [(str(msg._arrival_time) + " -> " + msg.target_address.__repr__()) for msg in
                 removed_messages]) + "\n               ]"
            if len(removed_messages) == 0:
                removed_messages_str = "[]"
            print(f''
                  f'Direction:      << Backward <<\n'
                  f'New Time:       {self.time}/{self.theta}\n'
                  f'Receiver:       {current_message.target_address}\n'
                  f'Message:        {{\n'
                  f'                    id:           {current_message.summary()["id"]}\n'
                  f'                    color:        {current_message.summary()["color"]}\n'
                  f'                    title:        {current_message.summary()["title"]}\n'
                  f'                    parent:       {current_message.summary()["parent"]}\n'
                  f'                    children:     {len(current_message.summary()["children"])}\n'
                  f'                    creation:     {current_message.summary()["creation_time"]}/{current_message.summary()["creation_theta"]}\n'
                  f'                    arrival:      {current_message.summary()["arrival_time"]}/{current_message.summary()["arrival_theta"]}\n'
                  f'                    is_lost:      {current_message.summary()["is_lost"]}\n'
                  f'                    self_message: {current_message.summary()["self_message"]}\n'
                  f'                }}\n'
                  f'Removed:        {removed_messages_str}\n'
                  f'Queue Times:    {sorted(self.messages.keys())}\n'
                  f'===================================================================================\n'
                  )

        # Build summary of the last action
        action: dict[str, any] = {
            "time": self.time,
            "theta": self.theta,
            "undone_message": current_message.summary(),
            "deleted_messages": [msg.summary() for msg in removed_messages]
        }

        return action
