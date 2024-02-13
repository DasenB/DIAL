from flask import request
from DIAL.Address import Address
from DIAL.Error import Error
from DIAL.State import State, StateParser
from DIAL.Color import DefaultColors


class StateEndpoints:
    api: any

    def __init__(self, api: any):
        self.api = api

    def get_states(self):
        color_transitions: dict[str, any] = {}
        for time_tuple in self.api.simulator.node_colors.keys():
            time_str = str(time_tuple[0]) + "/" + str(time_tuple[1])
            for address in self.api.simulator.node_colors[time_tuple].keys():
                color_object = self.api.simulator.node_colors[time_tuple][address]
                if isinstance(color_object, DefaultColors):
                    color_object = color_object.value
                color_transitions[time_str] = {
                    address.__repr__(): color_object.__str__()
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
            return self.api.response(status=400, response=f'State with address {str(address)} does not exist')
        return self.api.response(status=200, response=self.api.simulator.states[address][-1].to_json())

    def put_state(self, node: str, algorithm: str, instance: str):
        address = Address(node_name=node, algorithm=algorithm, instance=instance)
        if address not in self.api.simulator.states.keys():
            return self.api.response(status=400, response=f'State with address {str(address)} does not exist')
        json: dict[str, any] = request.get_json()
        state_parser = StateParser(simulator=self.api.simulator)
        new_state = state_parser.parse_state(json)
        if isinstance(new_state, Error):
            return self.api.response(status=400, response=new_state.message)
        old_state: State = self.api.simulator.states[address][-1]
        for key in json.keys():
            if key not in ["color", "address", "neighbors", "data"]:
                return self.api.response(status=300, response=f'Invalid attribute message.{key}')
        if new_state.address != old_state.address:
            return self.api.response(status=400, response=f'Modifying state.address is not allowed')
        node_colors = self.api.simulator.node_colors
        latest_time_tuple = None
        for time_tuple in node_colors.keys():
            if old_state.address not in node_colors[time_tuple].keys():
                continue
            if time_tuple[0] is None and time_tuple[1] is None:
                latest_time_tuple = time_tuple
                break
            if latest_time_tuple is None:
                latest_time_tuple = time_tuple
                continue
            if (time_tuple[0] > latest_time_tuple[0]) or (time_tuple[0] == latest_time_tuple[0] and time_tuple[1] > latest_time_tuple[1]):
                latest_time_tuple = time_tuple
                continue
        if latest_time_tuple is None:
            return self.api.response(status=400, response=f'Can not change color :( OH No! This error should never happen...')
        node_colors[latest_time_tuple][old_state.address] = new_state.color
        old_state.neighbors = new_state.neighbors
        old_state.color = new_state.color
        old_state.data = new_state.data

        return self.api.response(status=200, response=new_state.to_json())
