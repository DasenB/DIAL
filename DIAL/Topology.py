from enum import Enum
from typing import Tuple, Callable
import numpy
from DIAL.Message import Message

Scheduler = Callable[
    [any, int, int, dict[int, list[Message]], Message, numpy.random.Generator],
    int
] # (Topology, time, theta, messageQueue, message, RNG) -> (time)


class EdgeDirection(Enum):
    UNIDIRECTIONAL = "UNIDIRECTIONAL"
    BIDIRECTIONAL = "BIDIRECTIONAL"


class EdgeConfig:
    scheduler: Scheduler
    direction: EdgeDirection
    reliability: float

    def __init__(self, scheduler: Scheduler, direction: EdgeDirection, reliability: float = 1.0):
        self.scheduler = scheduler
        self.direction = direction
        self.reliability = reliability


class Topology:
    nodes: list[str]
    edges: dict[Tuple[str, str], EdgeConfig]
    all_nodes_have_loops: bool

    def __init__(self, all_nodes_have_loops: bool = True):
        self.nodes = []
        self.edges = {}
        self.all_nodes_have_loops = all_nodes_have_loops

    def has_node(self, node: str) -> bool:
        return node in self.nodes

    def has_edge(self, source: str, target: str):
        return (source, target) in self.edges.keys()

    def get_neighbors(self, node: str) -> list[str]:
        neighbors: list[str] = []
        for other in self.nodes:
            if self.has_edge(source=node, target=other):
                neighbors.append(other)
        # CAVE: with this an algorithm has no way of knowing if it can send a self-message or not
        # if node in neighbors:
        #     neighbors.remove(node)
        return neighbors

    def add_node(self, node: str) -> bool:
        if node in self.nodes:
            return False
        self.nodes.append(node)
        if self.all_nodes_have_loops:
            self_edge_config = EdgeConfig(
                reliability=1.0,
                direction=EdgeDirection.UNIDIRECTIONAL,
                scheduler=DefaultScheduler.LOCAL_FIFO
            )
            self.add_edge(node, node, self_edge_config)
        return True

    def get_edge_config(self, source: str, target: str) -> EdgeConfig | None:
        if not self.has_edge(source, target):
            return None
        return self.edges[(source, target)]

    def add_edge(self, x: str, y: str, config: EdgeConfig) -> bool:
        if not self.has_node(x):
            return False
        if not self.has_node(y):
            return False
        if self.has_edge(x, y):
            return False
        if config.direction == EdgeDirection.UNIDIRECTIONAL:
            self.edges[(x, y)] = config
        if config.direction == EdgeDirection.BIDIRECTIONAL:
            self.edges[(x, y)] = config
            self.edges[(y, x)] = config
        return True

def local_fifo_scheduler(
        topology: Topology,
        time: int,
        theta: int,
        message_queue: dict[int, list[Message]],
        message: Message,
        random_number_generator: numpy.random.Generator
) -> int:
    min_valid_time: int = 0
    if time is not None:
        min_valid_time = time + 1
    else:
        return 0
    for time_index in message_queue.keys():
        if time_index < time:
            continue
        for theta_index in range(0, len(message_queue[time_index])):
            if time_index == time and theta_index <= theta:
                continue
            selected_message = message_queue[time_index][theta_index]
            if selected_message.source_address.node_name == message.source_address.node_name and selected_message.target_address.node_name == message.target_address.node_name:
                min_valid_time = time_index + 1
    insert_time = random_number_generator.integers(min_valid_time, min_valid_time + 10)
    return insert_time

def global_fifo_scheduler(
        topology: Topology,
        time: int,
        theta: int,
        message_queue: dict[int, list[Message]],
        message: Message,
        random_number_generator: numpy.random.Generator
) -> int:
    return max(message_queue.keys()) + 1


def random_scheduler(
        topology: Topology,
        time: int, theta: int,
        message_queue: dict[int, list[Message]],
        message: Message,
        random_number_generator: numpy.random.Generator
) -> int:
    insert_time = random_number_generator.integers(low=time + 1, high=time + 11)
    # A node can not receive multiple messages at the same time.
    # If a node already receives a message at a given time the message must be delayed.
    return insert_time


class DefaultScheduler(Enum):
    LOCAL_FIFO = local_fifo_scheduler
    RANDOM = random_scheduler
    GLOBAL_FIFO = global_fifo_scheduler
