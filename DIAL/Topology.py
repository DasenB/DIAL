from __future__ import annotations
from enum import Enum
from typing import Tuple
from DIAL.Scheduler import Scheduler, DefaultSchedulers



class EdgeDirection(Enum):
    UNIDIRECTIONAL = "UNIDIRECTIONAL"
    BIDIRECTIONAL = "BIDIRECTIONAL"


class EdgeConfig:
    scheduler: Scheduler
    direction: EdgeDirection
    reliability: float

    def __init__(self, scheduler: Scheduler | DefaultSchedulers, direction: EdgeDirection, reliability: float = 1.0):
        self.scheduler = scheduler
        self.direction = direction
        self.reliability = reliability


class Topology:
    nodes: list[str]
    edges: dict[Tuple[str, str], EdgeConfig]
    all_nodes_have_loops: bool

    def __init__(self, all_nodes_have_loops: bool = True, template: DefaultTopologies | None = None):
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
        return neighbors

    def add_node(self, node: str) -> bool:
        if node in self.nodes:
            return False
        self.nodes.append(node)
        if self.all_nodes_have_loops:
            self_edge_config = EdgeConfig(
                reliability=1.0,
                direction=EdgeDirection.UNIDIRECTIONAL,
                scheduler=DefaultSchedulers.LOCAL_FIFO
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


class DefaultTopologies(Enum):
    RING_BIDIRECTIONAL = 0,
    RING_UNIDIRECTIONAL = 1,
    TREE = 2,
    EXAMPLE_NETWORK_1 = 3
    EXAMPLE_NETWORK_2 = 4
    EXAMPLE_NETWORK_3 = 5

    def __init__(self, value):
        if value == 0:
            self.topology_object = self.ring_bidirectional()
        if value == 1:
            self.topology_object = self.ring_unidirectional()
        if value == 2:
            self.topology_object = self.tree()
        if value == 3:
            self.topology_object = self.example_network_1()
        if value == 4:
            self.topology_object = self.example_network_2()
        if value == 5:
            self.topology_object = self.example_network_3()
    def ring_bidirectional(self):
        t = Topology(all_nodes_have_loops=False, template=None)
        nodes = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R"]
        for node in nodes:
            t.add_node(node)
        edge_config = EdgeConfig(
            reliability=1.0,
            direction=EdgeDirection.BIDIRECTIONAL,
            scheduler=DefaultSchedulers.LOCAL_FIFO
        )
        for index in range(0, len(nodes)):
            source_node = nodes[index - 1]
            target_node = nodes[index]
            t.add_edge(source_node, target_node, edge_config)
        return t

    def ring_unidirectional(self):
        t = Topology(all_nodes_have_loops=True, template=None)
        nodes = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R"]
        for node in nodes:
            t.add_node(node)
        edge_config = EdgeConfig(
            reliability=1.0,
            direction=EdgeDirection.UNIDIRECTIONAL,
            scheduler=DefaultSchedulers.LOCAL_FIFO
        )
        for index in range(0, len(nodes)):
            source_node = nodes[index - 1]
            target_node = nodes[index]
            t.add_edge(source_node, target_node, edge_config)
        return t

    def tree(self):
        t = Topology(all_nodes_have_loops=False, template=None)
        nodes = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"]
        for node in nodes:
            t.add_node(node)
        edge_config = EdgeConfig(
            reliability=1.0,
            direction=EdgeDirection.UNIDIRECTIONAL,
            scheduler=DefaultSchedulers.LOCAL_FIFO
        )
        t.add_edge("A", "B", edge_config)
        t.add_edge("A", "C", edge_config)
        t.add_edge("B", "D", edge_config)
        t.add_edge("B", "E", edge_config)
        t.add_edge("C", "F", edge_config)
        t.add_edge("C", "G", edge_config)
        t.add_edge("D", "H", edge_config)
        t.add_edge("D", "I", edge_config)
        t.add_edge("E", "J", edge_config)
        t.add_edge("E", "K", edge_config)
        t.add_edge("F", "L", edge_config)
        t.add_edge("F", "M", edge_config)
        t.add_edge("G", "N", edge_config)
        t.add_edge("G", "O", edge_config)
        return t

    def example_network_1(self):
        t = Topology(all_nodes_have_loops=True)
        edge_config = EdgeConfig(
            reliability=1.0,
            direction=EdgeDirection.BIDIRECTIONAL,
            scheduler=DefaultSchedulers.LOCAL_FIFO
        )
        nodes = ["A", "B", "C", "D", "E", "F"]
        for node in nodes:
            t.add_node(node)
        t.add_edge("A", "E", edge_config)
        t.add_edge("E", "A", edge_config)
        t.add_edge("E", "E", edge_config)
        t.add_edge("C", "E", edge_config)
        t.add_edge("D", "F", edge_config)
        t.add_edge("B", "D", edge_config)
        t.add_edge("F", "E", edge_config)
        t.add_edge("B", "C", edge_config)
        return t

    def example_network_2(self):
        t = Topology(all_nodes_have_loops=True)
        edge_config = EdgeConfig(
            reliability=1.0,
            direction=EdgeDirection.UNIDIRECTIONAL,
            scheduler=DefaultSchedulers.LOCAL_FIFO
        )
        nodes = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W"]
        edges = [(0, 1), (1, 0), (21, 2), (6, 19), (2, 5), (12, 9), (17, 10), (9, 16), (21, 15), (2, 4), (8, 19), (7, 13), (11, 12), (7, 18), (12, 22), (19, 11), (12, 5), (22, 7), (22, 20), (3, 21), (13, 6), (15, 7), (16, 19), (17, 6), (2, 11), (13, 22), (5, 21), (5, 21), (14, 6), (8, 18), (22, 8), (3, 20), (7, 0), (6, 14), (17, 11), (20, 10), (14, 21), (1, 1), (0, 19), (18, 2), (3, 20), (12, 0)]
        for node in nodes:
            t.add_node(node)
        for edge in edges:
            t.add_edge(nodes[edge[0]], nodes[edge[1]], edge_config)
        return t

    def example_network_3(self):
        t = Topology(all_nodes_have_loops=True)
        edge_config = EdgeConfig(
            reliability=1.0,
            direction=EdgeDirection.BIDIRECTIONAL,
            scheduler=DefaultSchedulers.LOCAL_FIFO
        )
        nodes = ["A", "B", "C", "D", "E", "F", "G"]
        for node in nodes:
            t.add_node(node)
        t.add_edge("A", "B", edge_config)
        t.add_edge("C", "A", edge_config)
        t.add_edge("C", "D", edge_config)
        t.add_edge("B", "D", edge_config)
        t.add_edge("D", "E", edge_config)
        t.add_edge("D", "F", edge_config)
        t.add_edge("F", "G", edge_config)
        t.add_edge("E", "G", edge_config)
        return t