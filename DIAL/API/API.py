import copy
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
    initial_simulator: Simulator

    def __init__(self, simulator: Simulator, host: IPAddress = "127.0.0.1", port: int = 10101):
        self.initial_simulator = copy.deepcopy(simulator)

        self.simulator = simulator
        self.host = host
        self.port = port
        self.api = Flask(__name__, static_url_path='/', static_folder='../../interface3')

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
            message.title = changes["title"]
        if "target_address" in changes.keys():
            message.target_address = changes["target_address"]
        if "source_address" in changes.keys():
            message.source_address = changes["source_address"]
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
            time = int(time_str)
        except ValueError:
            return self.response(status=300, response="Failed to parse time")
        try:
            theta = int(theta_str)
        except ValueError:
            return self.response(status=300, response="Failed to parse theta")
        # Only messages that have not been received can be changed
        if original_time < self.simulator.time or (original_time == self.simulator.time and original_theta < self.simulator.theta):
            return self.response(status=300, response="Can not reschedule messages that already have been received.")
        # Can not move a message into the past
        if time < self.simulator.time or (time == self.simulator.time and theta < self.simulator.theta):
            print(f'time={time}/{theta}')
            return self.response(status=300, response="Can not reschedule a message into the past")
        # A message can not be rescheduled to a time before it was created
        parent_arrival_time: int = 0
        parent_arrival_theta: int = 0
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
            return self.response(status=300, response=f'Theta is ot of range for time={time}')
        if time in self.simulator.messages.keys() and theta > len(self.simulator.messages[time]):
            return self.response(status=300, response=f'Theta is ot of range for time={time}')
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
