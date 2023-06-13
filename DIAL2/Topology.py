from enum import Enum
from typing import Tuple, Callable
from Message import Message

class EdgeReliability(Enum):
    RELIABLE = "RELIABLE"
    UNRELIABLE = "UNRELIABLE"

class EdgeMessageOrder(Enum):
    FIFO = "FIFO"
    RANDOM = "RANDOM"

class EdgeDirection(Enum):
    UNIDIRECTIONAL = "UNIDIRECTIONAL"
    BIDIRECTIONAL = "BIDIRECTIONAL"


class EdgeConfig:
    message_order: EdgeMessageOrder
    direction: EdgeDirection
    reliability: float

    def __init__(self,
                 message_order: EdgeMessageOrder = None,
                 direction: EdgeDirection = None,
                 reliability: float = 1.0
                 ):

        if message_order is None:
            self.message_order = EdgeMessageOrder.FIFO
        else:
            self.message_order = message_order

        if direction is None:
            self.direction = EdgeDirection.BIDIRECTIONAL
        else:
            self.direction = direction

        self.reliability = reliability



class Topology:
    nodes: list[str]
    edges: dict[Tuple[str, str], EdgeConfig]

    def __init__(self):
        self.nodes = []
        self.edges = {}

    def has_node(self, node: str) -> bool:
        return node in self.nodes

    def has_edge(self, source: str, target: str):
        return (source, target) in self.edges.keys()

    def get_neighbors(self, node: str) -> list[str]:
        neighbors: list[str] = []
        for other in self.nodes:
            if self.has_edge(source=node, target=other):
                neighbors.append(other)
        return neighbors

    def add_node(self, node: str) -> bool:
        if node not in self.nodes:
            self.nodes.append(node)
            return True
        return False

    def get_edge_config(self, source: str, target: str) -> EdgeConfig|None:
        if not self.has_edge(source, target):
            return None
        return self.edges[(source, target)]

    def add_edge(self, x: str, y: str, config: EdgeConfig) -> bool:
        if config is None:
            config = EdgeConfig()

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

