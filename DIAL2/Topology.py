from typing import Tuple


class Topology:
    nodes: list[str]
    edges: list[Tuple[str, str]]

    def __init__(self):
        self.nodes = []
        self.edges = []

    def has_node(self, node: str) -> bool:
        return node in self.nodes

    def has_edge(self, x: str, y: str):
        return (x, y) in self.edges or (y, x) in self.edges

    def get_neighbors(self, node: str) -> list[str]:
        neighbors: list[str] = []
        for other in self.nodes:
            if self.has_edge(node, other):
                neighbors.append(other)
        return neighbors

    def add_node(self, node: str) -> bool:
        if node not in self.nodes:
            self.nodes.append(node)
            return True
        return False

    def add_edge(self, x: str, y: str) -> bool:
        if not self.has_node(x):
            return False
        if not self.has_node(y):
            return False
        if self.has_edge(x, y):
            return False
        self.edges.append((x, y))
        return True

