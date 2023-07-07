import json
from enum import Enum

import networkx as nx
from flask import Flask, request
from ipaddr import IPAddress

from DIAL.Address import Address
from DIAL.Color import Color, Colors
from DIAL.Message import Message
from DIAL.Simulator import Simulator
from DIAL.State import State


class API:
    simulator: Simulator
    host: IPAddress
    port: int
    api: Flask

    def __init__(self, simulator: Simulator, host: IPAddress = "127.0.0.1", port: int = 10101):
        self.simulator = simulator
        self.host = host
        self.port = port
        self.api = Flask(__name__, static_url_path='/', static_folder='../interface2')

        self.api.route('/topology', methods=['GET'])(self.get_topology)

        self.api.route('/messages', methods=['GET'])(self.get_messages)
        self.api.route('/message/<message_id>', methods=['GET'])(self.get_message)
        self.api.route('/message/<message_id>', methods=['DELETE'])(self.del_message)
        self.api.route('/message/<message_id>', methods=['PUT'])(self.put_message)

        self.api.route('/states', methods=['GET'])(self.get_states)
        self.api.route('/state/<node>/<algorithm>/<instance>', methods=['GET'])(self.get_state)
        self.api.route('/states/<node>/<algorithm>/<instance>', methods=['PUT'])(self.put_state)

        self.api.route('/reschedule/<message_id>/<time_str>/<theta_str>', methods=['GET'])(self.get_reschedule)

        # self.api.route('/step-forward/<steps_str>', methods=['GET'])(self.get_step_forward)
        # self.api.route('/step-backward/<steps_str>', methods=['GET'])(self.get_prev)

    def response(self, status: int, response: any):
        response = self.api.response_class(
            response=json.dumps(response, indent=4),
            status=status,
            mimetype='application/json',
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    def run(self):
        self.api.run(host=self.host, port=self.port, ssl_context=('../certs/cert.pem', '../certs/key.pem'))

    def get_topology(self):
        topology: dict[str, any] = {
            "nodes": self.simulator.topology.nodes,
            "edges": [[edge[0], edge[1]] for edge in self.simulator.topology.edges]
        }
        return self.response(status=200, response=topology)

    def get_messages(self):
        messages: dict[int, list[Message]] = {}
        for t in sorted(list(self.simulator.messages.keys())):
            messages[int(t)] = [msg.summary() for msg in self.simulator.messages[t]]
        response_data = {
            "time": int(self.simulator.time),
            "theta": int(self.simulator.theta),
            "messages": messages
        }
        return self.response(status=200, response=response_data)

    def get_message(self, message_id: str):
        message = self.simulator.get_message(message_id)
        if message is None:
            return self.response(status=404, response=f'No message with ID "{message_id}"')
        return self.response(status=200, response=message.to_json())

    def del_message(self, message_id: str):
        message = self.simulator.get_message(message_id)
        if message is None:
            return self.response(status=404, response=f'No message with ID "{message_id}"')
        # Remove reference from parent message
        if message._parent_message is not None:
            parent = self.simulator.get_message(message._parent_message)
            if parent is not None:
                parent._child_messages.remove(message._id)
        # Remove reference from child messages
        for child_id in message._child_messages:
            child = self.simulator.get_message(child_id)
            if child is not None:
                child._parent_message = None
        # Modify the arrival theta of all messages with the same time
        time = message._arrival_time
        theta = message._arrival_time
        if len(self.simulator.messages[time]) > theta + 1:
            for n in range(0, len(self.simulator.messages[time])):
                msg = self.simulator.messages[time][n]
                if msg._arrival_theta > theta:
                    msg._arrival_theta -= 1
        # Remove the message the simulator
        self.simulator.messages[time].remove(message)
        if len(self.simulator.messages[time]) == 0:
            del self.simulator.messages[time]
        return self.response(status=200, response=f'OK')

    def put_message(self, message_id: str):
        message = self.simulator.get_message(message_id)
        if message is None:
            return self.response(status=404, response=f'No message with ID "{message_id}"')
        new_values: dict[str, any] = request.get_json()
        changes: dict[str, any] = {}
        if "title" in new_values.keys():
            if not isinstance(new_values["title"], str):
                return self.response(status=300, response=f'Attribute message.title must be a string')
            changes["title"] = new_values["title"]
        if "color" in new_values.keys():
            color = Color.from_string(new_values["color"])
            if color is None:
                return self.response(status=300, response=f'Failed to parse attribute message.color')
            changes["color"] = color
        for address_key in ["target_address", "source_address"]:
            if address_key in new_values.keys():
                address = Address.from_string(new_values[address_key])
                if address is None:
                    return self.response(status=300, response=f'Failed to parse attribute message."{address_key}"')
                changes[address_key] = address
        if "data" in new_values.keys():
            if not isinstance(new_values["data"], dict):
                return self.response(status=300, response=f'message.data must be of type dict[str, any]')
            if not all(isinstance(elem, str) for elem in new_values["data"].keys()):
                return self.response(status=300, response=f'message.data must be of type dict[str, any]')
            changes["data"] = new_values["data"]
        for key in new_values.keys():
            if key not in ["data", "title", "color", "target_address", "source_address"]:
                return self.response(status=300, response=f'Invalid attribute message.{key}')
        if "data" in changes.keys():
            message.data = changes["data"]
        if "color" in changes.keys():
            message.color = changes["color"]
        if "title" in changes.keys():
            message.color = changes["title"]
        if "target_address" in changes.keys():
            message.color = changes["target_address"]
        if "source_address" in changes.keys():
            message.color = changes["source_address"]
        return self.response(status=200, response=message.to_json())

    def get_states(self):
        state_colors: dict[str, str] = {}
        for address in self.simulator.states.keys():
            color = self.simulator.states[address][-1].color
            if isinstance(color, Colors):
                color = color.value
            state_colors[address.__repr__()] = str(color.__repr__())
        return self.response(status=200, response=state_colors)

    def get_state(self, node: str, algorithm: str, instance: str):
        address = Address(node_name=node, algorithm=algorithm, instance=instance)
        if address not in self.simulator.states.keys():
            return self.response(status=300, response=f'State with address {str(address)} does not exist')
        return self.response(status=200, response=self.simulator.states[address][-1].to_json())

    def put_state(self, node: str, algorithm: str, instance: str):
        address = Address(node_name=node, algorithm=algorithm, instance=instance)
        if address not in self.simulator.states.keys():
            return self.response(status=300, response=f'State with address {str(address)} does not exist')
        state: State = self.simulator.states[address][-1]
        new_values: dict[str, any] = request.get_json()
        changes: dict[str, any] = {}
        if "color" in new_values.keys():
            color = Color.from_string(new_values["color"])
            if color is None:
                return self.response(status=300, response=f'Failed to parse attribute message.color')
            changes["color"] = color
        # CAVE: Only the address which is seen by the node itself is changed.
        # The address within the simulator under which a node is reachable by other nodes does NOT change!
        if "address" in new_values.keys():
            address = Address.from_string(new_values["address"])
            if address not in self.simulator.states.keys():
                return self.response(status=300, response=f'State with address {str(address)} does not exist')
        if "neighbors" in new_values.keys():
            if not isinstance(new_values["neighbors"], list):
                return self.response(status=300, response=f'state.neighbors must be of type list[str]')
            if not all(isinstance(elem, str) for elem in new_values["neighbors"]):
                return self.response(status=300, response=f'state.neighbors must be of type dict[str, str]')
        if "data" in new_values.keys():
            if not isinstance(new_values["data"], dict):
                return self.response(status=300, response=f'state.data must be of type dict[str, any]')
            if not all(isinstance(elem, str) for elem in new_values["data"].keys()):
                return self.response(status=300, response=f'state.data must be of type dict[str, any]')
            changes["data"] = new_values["data"]
        if "data" in changes.keys():
            state.data = changes["data"]
        if "color" in changes.keys():
            state.color = changes["color"]
        if "neighbors" in changes.keys():
            state.color = changes["neighbors"]
        if "address" in changes.keys():
            state.color = changes["address"]
        return self.response(status=200, response=state.to_json())

    def get_reschedule(self, message_id: str, time_str: str, theta_str: str):
        return self.response(status=500, response="Not implemented")

