import copy
import json
import os
import sys

import math
import uuid
from enum import Enum
from typing import Tuple

import networkx as nx
from flask import Flask, request
from ipaddr import IPAddress
import logging

from DIAL.State import State
from DIAL.Address import Address
from DIAL.Color import Color, Colors
from DIAL.Message import Message
from DIAL.Simulator import Simulator
from flask_cors import CORS

class API:
    simulator: Simulator
    host: IPAddress
    port: int
    api: Flask
    initial_simulator: Simulator

    def __init__(self, simulator: Simulator, host: IPAddress = "127.0.0.1", port: int = 10101, verbose: bool = False):
        self.initial_simulator = copy.deepcopy(simulator)

        self.simulator = simulator
        self.host = host
        self.port = port
        self.api = Flask(__name__, static_folder="../../interface/", static_url_path="/")
        CORS(self.api)
        if not verbose:
            # Do not print every HTTP-request
            logging.getLogger("werkzeug").disabled = True


        self.api.route('/topology', methods=['GET'])(self.get_topology)

        self.api.route('/reset', methods=['GET'])(self.get_reset)

        self.api.route('/messages', methods=['GET'])(self.get_messages)
        self.api.route('/message/<message_id>', methods=['GET'])(self.get_message)
        self.api.route('/message/<message_id>', methods=['DELETE'])(self.del_message)
        self.api.route('/message/<message_id>', methods=['PUT'])(self.put_message)

        self.api.route('/reschedule/<message_id>/<time_str>/<theta_str>', methods=['GET'])(self.get_reschedule)

        self.api.route('/states', methods=['GET'])(self.get_states)
        self.api.route('/state/<node>/<algorithm>/<instance>', methods=['GET'])(self.get_state)
        self.api.route('/states/<node>/<algorithm>/<instance>', methods=['PUT'])(self.put_state)

        self.api.route('/step-forward/<steps_str>', methods=['GET'])(self.get_step_forward)
        self.api.route('/step-backward/<steps_str>', methods=['GET'])(self.get_step_backward)
        self.api.route('/time-forward/<time_str>', methods=['GET'])(self.get_time_forward)
        self.api.route('/time-backward/<time_str>', methods=['GET'])(self.get_time_backward)


    def response(self, status: int, response: any):
        response = self.api.response_class(
            response=json.dumps(response, indent=4, default=str),
            status=status,
            mimetype='application/json',
        )
        return response

    def run(self):
        cert_path_prefix = ""
        if os.getcwd().endswith("/DIAL/DIAL"):
            cert_path_prefix = "../"
        self.api.run(host=self.host, port=self.port, ssl_context=(cert_path_prefix + 'certs/cert.pem', cert_path_prefix + 'certs/key.pem'))


    def get_topology(self):
        topology: dict[str, any] = {
            "nodes": self.simulator.topology.nodes,
            "edges": [[edge[0], edge[1]] for edge in self.simulator.topology.edges]
        }
        return self.response(status=200, response=topology)

    def get_reset(self):
        self.simulator = copy.deepcopy(self.initial_simulator)
        return self.response(status=200, response="OK")

    def get_messages(self):
        messages: dict[int, list[Message]] = {}
        for t in sorted(list(self.simulator.messages.keys())):
            messages[int(t)] = [msg.summary() for msg in self.simulator.messages[t]]
        response_data = {
            "time": self.simulator.time,
            "theta": self.simulator.theta,
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
        # Remove the message from the simulator
        self.simulator.messages[time].remove(message)
        if len(self.simulator.messages[time]) == 0:
            del self.simulator.messages[time]
        return self.response(status=200, response=f'OK')

    def put_message(self, message_id: str):
        message = self.simulator.get_message(message_id)
        if message is None:
            return self.response(status=404, response=f'No message with ID "{message_id}"')
        new_values: dict[str, any] = request.get_json()
        for key in new_values.keys():
            if key not in list(message.summary().keys()) + ["data"]:
                return self.response(status=300, response=f'Invalid attribute message.{key}')
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
        for address_key in ["target", "source"]:
            if address_key in new_values.keys():
                address = Address.from_string(new_values[address_key])
                if address is None:
                    return self.response(status=300, response=f'Failed to parse attribute message."{address_key}"')
                changes[address_key + "_address"] = address
        if "data" in new_values.keys():
            if not isinstance(new_values["data"], dict):
                return self.response(status=300, response=f'message.data must be of type dict[str, any]')
            if not all(isinstance(elem, str) for elem in new_values["data"].keys()):
                return self.response(status=300, response=f'message.data must be of type dict[str, any]')
            changes["data"] = new_values["data"]
        if "parent" in new_values.keys():
            parent = new_values["parent"]
            if not isinstance(parent, str):
                return self.response(status=300, response=f'Attribute message.parent must be a string')
            if parent == "None":
                changes["parent"] = None
            else:
                try:
                    changes["parent"] = uuid.UUID(parent)
                except:
                    return self.response(status=300, response=f'Attribute message.parent must be a valid UUID4')
        # CHILDREN
        for attribute in ["creation_time", "creation_theta", "arrival_time", "arrival_theta", "self_message_delay"]:
            if attribute in new_values.keys():
                if not isinstance(new_values[attribute], int):
                    return self.response(status=300, response=f'Attribute message.{attribute} must be an integer')
                if attribute in ["creation_theta", "arrival_theta", "self_message_delay"]:
                    if new_values[attribute] < 0:
                        return self.response(status=300, response=f'Attribute message.{attribute} must be >= 0')
                changes[attribute] = new_values[attribute]
        for attribute in ["self_message", "is_lost"]:
            if attribute not in new_values.keys():
                continue
            if isinstance(new_values[attribute], str):
                if new_values[attribute] == "True":
                    changes[attribute] = True
                elif new_values[attribute] == "False":
                    changes[attribute] = False
                else:
                    return self.response(status=300, response=f'Attribute message.{attribute} must be either "True" or "False"')
            if isinstance(new_values[attribute], bool):
                changes[attribute] = new_values[attribute]


        if "arrival_time" in changes.keys() or "arrival_theta" in changes.keys():
            both_parameters_set = "arrival_time" in changes.keys() and "arrival_theta" in changes.keys()
            if not both_parameters_set:
                return self.response(status=300, response=f'To reschedule a message both message.arrival_theta and arrival_time must be set.')
            reschedule_result = self.get_reschedule(message_id=message_id, time_str=changes["arrival_time"], theta_str=changes["arrival_theta"])
            if reschedule_result.status_code != 200:
                return reschedule_result

        for key in changes.keys():
            private_variable_prefix = "_"
            if key in ["source_address", "target_address", "color", "title", "data"]:
                private_variable_prefix = ""
            setattr(message, private_variable_prefix + key, changes[key])

        return self.response(status=200, response=message.to_json())

    def get_reschedule(self, message_id: str, time_str: str, theta_str: str):
        message: Message = self.simulator.get_message(message_id)
        if message is None:
            return self.response(status=404, response=f'No message with ID "{message_id}"')
        original_time: int = message._arrival_time
        original_theta: int = message._arrival_theta
        time: int = None
        theta: int = None
        try:
            if time_str == "_":
                time = int(original_time)
            else:
                time = int(time_str)
        except ValueError:
            return self.response(status=300, response="Failed to parse time")
        try:
            if theta_str == "_":
                theta = int(original_theta)
            else:
                theta = int(theta_str)
        except ValueError:
            return self.response(status=300, response="Failed to parse theta")

        if self.simulator.time is not None or self.simulator.theta is not None:
            # Only messages that have not been received can be changed
            if original_time < self.simulator.time or (original_time == self.simulator.time and original_theta < self.simulator.theta):
                return self.response(status=300, response="Can not reschedule messages that already have been received.")
            # Can not move a message into the past
            if time < self.simulator.time or (time == self.simulator.time and theta <= self.simulator.theta):
                return self.response(status=300, response="Can not reschedule a message into the past")
        # Cannot move a message to a time before it was created
        if time < message._creation_time or (time == message._creation_time and theta <= message._creation_theta):
            return self.response(status=300, response="Can not reschedule a message to a time before it was created.")
        # A message can not be rescheduled to a time before it was created
        parent_arrival_time: int = -sys.maxsize
        parent_arrival_theta: int = -sys.maxsize
        if message._parent_message is not None:
            parent = self.simulator.get_message(message._parent_message)
            if parent is not None:
                parent_arrival_time = parent._arrival_time
                parent_arrival_theta = parent._arrival_theta
        if time < parent_arrival_time or (time == parent_arrival_time and theta <= parent_arrival_theta):
            return self.response(status=300,
                                 response="Can not reschedule messages to a time before its parent message has been received.")
        # A message can not be inserted with a theta greater than the length of the list at the given time
        if time not in self.simulator.messages.keys() and theta != 0:
            return self.response(status=300, response=f'Theta is out of range for time={time}')
        if time in self.simulator.messages.keys() and theta > len(self.simulator.messages[time]):
            return self.response(status=300, response=f'Theta is out of range for time={time}')
        # Remove the message from its old place
        for index in range(original_theta + 1, len(self.simulator.messages[original_time])):
            self.simulator.messages[original_time][index]._arrival_theta -= 1
        self.simulator.messages[original_time].remove(message)
        if len(self.simulator.messages[original_time]) == 0:
            del self.simulator.messages[original_time]
        # Insert the message into its new place
        if time not in self.simulator.messages.keys():
            self.simulator.messages[time] = []
        self.simulator.messages[time].insert(theta, message)
        message._arrival_time = time
        message._arrival_theta = theta
        for index in range(theta + 1, len(self.simulator.messages[time])):
            self.simulator.messages[time][index]._arrival_theta += 1
        return self.response(status=200, response=f'OK')

    def get_states(self):
        color_transitions: dict[str, any] = {}
        for time_tuple in self.simulator.node_colors.keys():
            time_str = str(time_tuple[0]) + "/" + str(time_tuple[1])
            for address in self.simulator.node_colors[time_tuple].keys():
                color_transitions[time_str] = {
                    address.__repr__(): self.simulator.node_colors[time_tuple][address].__str__()
                }
        neighbor_transitions: dict[str, any] = {}
        for time_tuple in self.simulator.node_neighbors.keys():
            time_str = str(time_tuple[0]) + "/" + str(time_tuple[1])
            for address in self.simulator.node_neighbors[time_tuple].keys():
                neighbor_transitions[time_str] = {
                    address.__repr__(): self.simulator.node_neighbors[time_tuple][address].__str__()
                }
        response: dict[str, any] = {
            "colors": color_transitions,
            "neighbors": neighbor_transitions
        }

        return self.response(status=200, response=response)

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
        # The address within the simulator under which a node is reachable by other nodes does NOT change!¼¼
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

    def get_step_forward(self, steps_str: str):
        steps: int = None
        try:
            steps = int(steps_str)
        except ValueError:
            return self.response(status=300, response="Failed to parse steps")

        result: dict[str, any] = {
            "time": self.simulator.time,
            "theta": self.simulator.theta,
            "steps": int(0),
            "actions": [],
        }

        for i in range(0, steps):
            action = self.simulator.step_forward(verbose=False)
            if action is None:
                return self.response(status=200, response=result)
            else:
                result["time"] = int(self.simulator.time)
                result["theta"] = int(self.simulator.theta)
                result["steps"] = int(result["steps"] + 1)
                result["actions"].append(action)
        return self.response(status=200, response=result)

    def get_step_backward(self, steps_str: str):
        steps: int = None
        try:
            steps = int(steps_str)
        except ValueError:
            return self.response(status=300, response="Failed to parse steps")

        result: dict[str, any] = {
            "time": str(self.simulator.time),
            "theta": str(self.simulator.theta),
            "steps": int(0),
            "actions": [],
        }

        for i in range(0, steps):
            action = self.simulator.step_backward(verbose=False)
            if action is None:
                return self.response(status=200, response=result)
            else:
                result["time"] = str(self.simulator.time)
                result["theta"] = str(self.simulator.theta)
                result["steps"] = int(result["steps"] + 1)
                result["actions"].append(action)
        return self.response(status=200, response=result)

    def get_time_forward(self, time_str: str):
        time: int = None
        try:
            time = int(time_str)
        except ValueError:
            return self.response(status=300, response="Failed to parse steps")

        result: dict[str, any] = {
            "time": self.simulator.time,
            "theta": self.simulator.theta,
            "steps": int(0),
            "actions": [],
        }

        if self.simulator.time is None:
            action = self.simulator.step_forward(verbose=False)
            if action is None:
                return self.response(status=200, response=result)
            else:
                result["time"] = int(self.simulator.time)
                result["theta"] = int(self.simulator.theta)
                result["steps"] = int(result["steps"] + 1)
                result["actions"].append(action)

        minimum_target_time = self.simulator.time + time

        while self.simulator.time < minimum_target_time:
            action = self.simulator.step_forward(verbose=False)
            if action is None:
                return self.response(status=200, response=result)
            else:
                result["time"] = int(self.simulator.time)
                result["theta"] = int(self.simulator.theta)
                result["steps"] = int(result["steps"] + 1)
                result["actions"].append(action)
        return self.response(status=200, response=result)

    def get_time_backward(self, time_str: str):
        time: int = None
        try:
            time = int(time_str)
        except ValueError:
            return self.response(status=300, response="Failed to parse steps")

        if self.simulator.time is None:
            return self.response(status=300, response="Can not move further back in time.")


        result: dict[str, any] = {
            "time": str(self.simulator.time),
            "theta": str(self.simulator.theta),
            "steps": int(0),
            "actions": [],
        }

        maximum_target_time = self.simulator.time - time

        while self.simulator.time > maximum_target_time:
            action = self.simulator.step_backward(verbose=False)
            if action is None:
                return self.response(status=200, response=result)
            else:
                result["time"] = str(self.simulator.time)
                result["theta"] = str(self.simulator.theta)
                result["steps"] = int(result["steps"] + 1)
                result["actions"].append(action)

                if self.simulator.time is None:
                    return self.response(status=200, response=result)

        return self.response(status=200, response=result)
