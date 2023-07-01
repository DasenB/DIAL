import json

import networkx as nx
from flask import Flask
from ipaddr import IPAddress

from DIAL.Message import Message
from DIAL.Simulator import Simulator


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
        self.api.route('/reset', methods=['GET'])(self.get_reset)

        self.api.route('/next', methods=['GET'])(self.get_next)
        self.api.route('/prev', methods=['GET'])(self.get_prev)
        # self.api.route('/jump_to_end', methods=['GET'])(self.get_jump_to_end)
        # self.api.route('/jump_to_start', methods=['GET'])(self.get_jump_to_start)

    def run(self):
        self.api.run(host=self.host, port=self.port, ssl_context=('../certs/cert.pem', '../certs/key.pem'))

    def get_topology(self):
        topology: dict[str, any] = {
            "nodes": self.simulator.topology.nodes,
            "edges": self.simulator.topology.edges
        }
        response = self.api.response_class(
            response=json.dumps(topology),
            status=200,
            mimetype='application/json',
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    def get_reset(self):
        while self.simulator.time > 0:
            self.simulator.step_backward()
        self.simulator.messages = [self.simulator.messages[0]]
        response = self.api.response_class(
            response=json.dumps("OK"),
            status=200,
            mimetype='application/json',
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    def get_messages(self):
        response_data = {
            "time": self.simulator.time,
            "messages": [msg.summary() for msg in self.simulator.messages]
        }
        response = self.api.response_class(
            response=json.dumps(response_data),
            status=200,
            mimetype='application/json',
        )
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    def get_next(self):
        if self.simulator.time == len(self.simulator.messages):
            response = self.api.response_class(
                response=json.dumps("No more messages to process."),
                status=400,
                mimetype='application/json',
            )
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response

        processed_message = self.simulator.messages[self.simulator.time]
        self.simulator.step_forward()
        new_messages: list[Message] = []
        for message in self.simulator.messages:
            if message._id in processed_message._child_messages:
                new_messages.append(message.summary())

        response_data: dict[str, any] = {
            "processed_message": processed_message.summary(),
            "new_messages": new_messages,
            "time": self.simulator.time - 1
        }
        response = self.api.response_class(
            response=json.dumps(response_data),
            status=200,
            mimetype='application/json',
        )
        return response

    def get_prev(self):
        if self.simulator.time == 0:
            response = self.api.response_class(
                response=json.dumps("No more messages to revert."),
                status=400,
                mimetype='application/json',
            )
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response

        reverted_message = self.simulator.messages[self.simulator.time - 1]
        removed_messages: list[Message] = []
        for message in self.simulator.messages:
            if message._id in reverted_message._child_messages:
                removed_messages.append(message.summary())
        self.simulator.step_backward()

        response_data: dict[str, any] = {
            "reverted_message": reverted_message.summary(),
            "removed_messages": removed_messages,
            "time": self.simulator.time
        }
        response = self.api.response_class(
            response=json.dumps(response_data),
            status=200,
            mimetype='application/json',
        )
        return response
