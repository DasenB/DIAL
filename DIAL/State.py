import json
import textwrap
from copy import deepcopy
import numpy
from DIAL.Error import Error
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
        json_representation: dict[str, any] = {
            "color": str(color.__repr__()),
            "address": str(self.address.__repr__()),
            "neighbors": self.neighbors,
            "data": self.data
        }
        try:
            json.dumps(self.data)
        except TypeError as error:
            warning_message = f"""
                    > Warning: '{error}'
                    >
                    > The data attribute of the state with ADDRESS='{self.address}' might not look as expected.
                    > If you want to use states containing data formats that are not serializable to
                    > JSON you must encode and decode it to some JSON serializable datatype yourself.
                    > https://stackoverflow.com/questions/3768895/how-to-make-a-class-json-serializable
                    """
            warning_message = textwrap.dedent(warning_message)
            print('\033[96m' + warning_message + '\033[0m')
        return json_representation


class StateParser:

    simulator: any

    def __init__(self, simulator: any):
        self.simulator = simulator

    def parse_state(self, json: dict[str, any]) -> State | Error:

        parse_function_mapping: dict[str, any] = {
            "address": self.parse_address,
            "color": self.parse_color,
            "neighbors": self.parse_neighbors,
            "data": self.parse_data,
        }

        parsed_values: dict[str, any] = {}
        for key in parse_function_mapping.keys():
            function = parse_function_mapping[key]
            result = function(json, key)
            if type(result) is Error:
                return result
            parsed_values[key] = result

        state = State(address=parsed_values["address"], neighbors=parsed_values["neighbors"])
        state.color = parsed_values["color"]
        state.data = parsed_values["data"]
        # state.neighbors = parsed_values["neighbors"]

        if state.address not in self.simulator.states.keys():
            return Error(f"No state with ADDRESS={state.address} exists and creating new states is not allowed.")
        latest_state = self.simulator.states[state.address][-1]
        state.random_number_generator = latest_state.random_number_generator

        for neighbor in state.neighbors:
            if not self.simulator.topology.has_edge(state.address.node_name, neighbor):
                return Error(f"Topology does not contain edge {state.address.node_name} -> {neighbor}")

        return state

    def parse_address(self, json: dict[str, any], key: str) -> Address | Error:
        if key not in json.keys():
            return Error(f"Missing attribute state.{key}")
        if not isinstance(json[key], str):
            return Error(f"state.{key} is not a string")
        address = Address.from_string(json[key])
        if address is None:
            return Error(f"Invalid attribute state.{key}")
        if not self.simulator.topology.has_node(address.node_name):
            return Error(f"Node of attribute state.{key} is not in topology")
        if address.algorithm not in self.simulator.algorithms.keys():
            return Error(f"Algorithm of attribute state.{key} does not exist")
        return address

    def parse_color(self, json: dict[str, any], key: str) -> Color | Error:
        if key not in json.keys():
            return Error(f"Missing attribute state.{key}")
        if not isinstance(json[key], str):
            return Error(f"state.{key} is not a string")
        color = Color.from_string(json[key])
        if color is None:
            return Error(f"Invalid attribute state.{key}")
        return color

    def parse_neighbors(self, json: dict[str, any], key: str) -> list[str] | Error:
        if key not in json.keys():
            return Error(f"Missing attribute state.{key}")
        if not isinstance(json[key], list):
            return Error(f"state.{key} is not a list")
        for item in json[key]:
            if not isinstance(item, str):
                return Error(f"state.{key} contains non sting items")
            if not self.simulator.topology.has_node(item):
                return Error(f"Node of attribute state.{key} is not in topology")
        return json[key]

    def parse_data(self, json: dict[str, any], key: str) -> dict[str, any] | Error:
        if key not in json.keys():
            return Error(f"Missing attribute state.{key}")
        type_matches = isinstance(json[key], dict) and all(isinstance(x, str) for x in json[key].keys())
        if not type_matches:
            return Error(f"state.{key} must be of type dict[str, any]")
        return json[key]

