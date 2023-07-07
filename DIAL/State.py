import json
from copy import deepcopy

import numpy

from DIAL.Address import Address
from DIAL.Color import Color, Colors


class State:
    address: Address
    color: Color
    neighbors: list[str]
    data: dict[str, any]
    random_number_generator: numpy.random.Generator

    def __init__(self, address: Address, neighbors: list[str] = [], seed: int | None = None):
        self.address = address
        self.color = Color()
        self.neighbors = neighbors
        self.data = {}
        self.random_number_generator = numpy.random.default_rng(seed=seed)

    def update_color(self, color: Color):
        self.color = deepcopy(color)

    def to_json(self):
        color = self.color
        if isinstance(color, Colors):
            color = color.value
        json_dict: dict[str, any] = {
            "color": str(color.__repr__()),
            "address": str(self.address.__repr__()),
            "neighbors": self.neighbors,
            "data": json.dumps(self.data)
        }
        return json_dict
