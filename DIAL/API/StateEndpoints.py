from flask import request
from DIAL.Address import Address
from DIAL.Color import Color
from DIAL.State import State
import uuid


class StateEndpoints:
    api: any

    def __init__(self, api: any):
        self.api = api

    def get_states(self):
        color_transitions: dict[str, any] = {}
        for time_tuple in self.api.simulator.node_colors.keys():
            time_str = str(time_tuple[0]) + "/" + str(time_tuple[1])
            for address in self.api.simulator.node_colors[time_tuple].keys():
                color_transitions[time_str] = {
                    address.__repr__(): self.api.simulator.node_colors[time_tuple][address].__str__()
                }
        neighbor_transitions: dict[str, any] = {}
        for time_tuple in self.api.simulator.node_neighbors.keys():
            time_str = str(time_tuple[0]) + "/" + str(time_tuple[1])
            for address in self.api.simulator.node_neighbors[time_tuple].keys():
                neighbor_transitions[time_str] = {
                    address.__repr__(): self.api.simulator.node_neighbors[time_tuple][address].__str__()
                }
        response: dict[str, any] = {
            "colors": color_transitions,
            "neighbors": neighbor_transitions
        }

        return self.api.response(status=200, response=response)

    def get_state(self, node: str, algorithm: str, instance: str):
        address = Address(node_name=node, algorithm=algorithm, instance=instance)
        if address not in self.api.simulator.states.keys():
            return self.api.response(status=300, response=f'State with address {str(address)} does not exist')
        return self.api.response(status=200, response=self.api.simulator.states[address][-1].to_json())

    def put_state(self, node: str, algorithm: str, instance: str):
        address = Address(node_name=node, algorithm=algorithm, instance=instance)
        if address not in self.api.simulator.states.keys():
            return self.api.response(status=300, response=f'State with address {str(address)} does not exist')
        state: State = self.api.simulator.states[address][-1]
        new_values: dict[str, any] = request.get_json()
        changes: dict[str, any] = {}
        if "color" in new_values.keys():
            color = Color.from_string(new_values["color"])
            if color is None:
                return self.api.response(status=300, response=f'Failed to parse attribute message.color')
            changes["color"] = color
        # CAVE: Only the address which is seen by the node itself is changed.
        # The address within the simulator under which a node is reachable by other nodes does NOT change!¼¼
        if "address" in new_values.keys():
            address = Address.from_string(new_values["address"])
            if address not in self.api.simulator.states.keys():
                return self.api.response(status=300, response=f'State with address {str(address)} does not exist')
        if "neighbors" in new_values.keys():
            if not isinstance(new_values["neighbors"], list):
                return self.api.response(status=300, response=f'state.neighbors must be of type list[str]')
            if not all(isinstance(elem, str) for elem in new_values["neighbors"]):
                return self.api.response(status=300, response=f'state.neighbors must be of type dict[str, str]')
        if "data" in new_values.keys():
            if not isinstance(new_values["data"], dict):
                return self.api.response(status=300, response=f'state.data must be of type dict[str, any]')
            if not all(isinstance(elem, str) for elem in new_values["data"].keys()):
                return self.api.response(status=300, response=f'state.data must be of type dict[str, any]')
            changes["data"] = new_values["data"]
        if "data" in changes.keys():
            state.data = changes["data"]
        if "color" in changes.keys():
            state.color = changes["color"]
        if "neighbors" in changes.keys():
            state.color = changes["neighbors"]
        if "address" in changes.keys():
            state.color = changes["address"]
        return self.api.response(status=200, response=state.to_json())
