from copy import deepcopy

import numpy

from DIAL.Address import Address
from DIAL.Color import Color


class State:
    address: Address
    color: Color
    neighbors: list[str]
    current_time: int
    data: dict[str, any]
    random_number_generator: numpy.random.Generator

    def __init__(self, address: Address, neighbors: list[str] = [], current_time: int = 0, seed: int | None = None):
        self.address = address
        self.color = Color()
        self.neighbors = neighbors
        self.current_time = current_time
        self.data = {}
        self.random_number_generator = numpy.random.default_rng(seed=seed)

    def update_color(self, color: Color):
        self.color = deepcopy(color)
