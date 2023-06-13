from copy import deepcopy

from Address import Address
from Color import Color


class State:
    address: Address
    color: Color
    neighbors: list[str]
    current_time: int
    data: dict[str, any]

    def __init__(self, address: Address, neighbors: list[str] = [], current_time: int = 0):
        self.address = address
        self.color = Color()
        self.neighbors = neighbors
        self.current_time = current_time
        self.data = {}

    def update_color(self, color: Color):
        self.color = deepcopy(color)
