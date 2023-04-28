from __future__ import annotations

import uuid
from uuid import UUID

import flask
import networkx
import networkx as nx
import json
from ipaddr import IPAddress
from flask import Flask, jsonify, Response, request

from DIAL.Address import ProcessAddress, InstanceAddress, ProgramAddress
from DIAL.Context import Context
from DIAL.Message import Message
from DIAL.Process import Program, Process
from DIAL.Simulator import Simulator


# API

# GET GENERAL INFORMATION ###########################################
# GET topology                          -> Topology
# GET process/{address}/programs        -> list[ProgramAddress]
# GET process/{address}/instances       -> list[InstanceAddress]

# MANIPULATE STATE ##################################################
# GET instance/{address}/context        -> Context
# PUT instance/{address}/context        -> Context
# GET message/{uuid}                    -> Message
# PUT message/{uuid}                    -> Message
# DEL message/{uuid}                    -> bool

# CONTROL SIMULATION ################################################
# GET simulator                         -> consumed=list[UUID], pending=list[UUID]
# PUT simulator/next                    -> Error | None
# PUT simulator/prev                    -> Error | None
# PUT simulator/reorder                 -> new_pending=list[UUID]
# PUT simulator/reset                   -> None
# PUT simulator/append_message          -> Message


class SimulatorWebserver:
    simulator: Simulator
    host: IPAddress
    port: int
    api: Flask

    def __init__(self, host: IPAddress, port: int, topology: nx.Graph, programs: dict[str, Program]):
        self.simulator = Simulator(topology=topology, programs=programs)
        self.host = host
        self.port = port
        self.api = Flask(__name__)
        self.api.route('/topology', methods=['GET'])(self.get_topology)
        self.api.route('/programs', methods=['GET'])(self.get_programs)
        self.api.route('/messages', methods=['GET'])(self.get_messages)
        self.api.route('/message_details/<message_id>', methods=['GET'])(self.get_message_details)
        self.api.route('/process_details/<node>:<port>/<process>', methods=['GET'])(self.get_process_details)
        self.api.route('/program_details/<program>', methods=['GET'])(self.get_program_details)
        self.api.route('/instance_details/<node>:<port>/<process>/<program>/<instance>', methods=['GET'])(self.get_instance_details)

        self.api.route('/message_details/<message_id>', methods=['PUT'])(self.put_message_details)


    def run(self):
        self.api.run(host=self.host, port=self.port, ssl_context=('../certs/cert.pem', '../certs/key.pem'))

    def _str_to_address(self, address_string: str) -> ProgramAddress | InstanceAddress:
        arr: list[str] = address_string.split("/")
        node_and_port = arr[0]
        process = arr[1]
        program_and_instance = arr[2]
        arr1: list[str] = node_and_port.split(":")
        arr2: list[str] = program_and_instance.split("#")
        address = ProgramAddress(node=arr1[0], port=int(arr1[2]), process=process, program=arr2[0])
        if len(arr2) > 1:
            address = address.extend(instance=UUID(arr2[1]))
        return address

    def get_topology(self) -> Response:
        processes: dict[str, str] = {}
        for nx_node in self.simulator.topology.nodes:
            address: ProcessAddress = self.simulator.topology.nodes[nx_node]["address"]
            neighbors = nx.all_neighbors(self.simulator.topology, node=nx_node)
            neighbor_addresses: list[ProcessAddress] = [self.simulator.topology.nodes[neighbor]["address"] for neighbor
                                                        in neighbors]
            process: dict[str, any] = {
                "address": address.__repr__(),
                "name": address.process,
                "neighbors": [n.__repr__() for n in neighbor_addresses],
            }
            processes[address.__repr__()] = process

        edges: list[dict[str, str]] = []
        for nx_edge in self.simulator.topology.edges:
            edge: dict[str, str] = {
                "A": self.simulator.topology.nodes[nx_edge[0]]["address"].__repr__(),
                "B": self.simulator.topology.nodes[nx_edge[1]]["address"].__repr__()
            }
            edges.append(edge)

        topology: dict[str, any] = {
            "processes": processes,
            "edges": edges
        }
        response = self.api.response_class(
            response=json.dumps(topology),
            status=200,
            mimetype='application/json'
        )
        return response

    def get_programs(self) -> Response:
        programs: dict[str, list[str]] = {}

        for program_name in self.simulator.programs.keys():
            instance_list: list[InstanceAddress] = self.simulator.get_instances(program_name=program_name)
            programs[program_name] = [addr.__repr__() for addr in instance_list]

        response = self.api.response_class(
            response=json.dumps(programs),
            status=200,
            mimetype='application/json'
        )
        return response

    def get_messages(self) -> Response:
        messages: list[any] = []
        for msg_uuid in self.simulator.consumed_messages + self.simulator.pending_messages:
            message = self.simulator.messages[msg_uuid]
            m: dict[str, any] = {
                "uuid": msg_uuid.__str__(),
                "source": message.source_address.__repr__(),
                "target": message.target_address.__repr__(),
                "return": message.return_address.__repr__(),
                "color": message.color.__repr__(),
            }
            messages.append(m)
        response_data: dict[str, any] = {
            "position": len(self.simulator.consumed_messages),
            "messages": messages
        }
        response = self.api.response_class(
            response=json.dumps(response_data),
            status=200,
            mimetype='application/json'
        )
        return response

    def get_message_details(self, message_id: str) -> Response:
        message: Message = self.simulator.get_message(message_uuid=UUID(message_id))

        response_data: dict[str, any] = {
            "uuid": message_id.__str__(),
            "source": message.source_address.__repr__(),
            "target": message.target_address.__repr__(),
            "return": message.return_address.__repr__(),
            "color": message.color.__repr__(),
            "data": message.data
        }
        response = self.api.response_class(
            response=json.dumps(response_data),
            status=200,
            mimetype='application/json'
        )
        return response

    def get_process_details(self, node: str, port: str, process: str) -> Response:
        process_address = ProcessAddress(node=node, port=int(port), process=process)

        process = self.simulator.processes[process_address][-1]

        incoming_messages: list[str] = []
        outgoing_messages: list[str] = []
        for uuid in self.simulator.pending_messages:
            if self.simulator.messages[uuid].target_address.__repr__().startswith(process_address.__repr__()):
                incoming_messages.append(uuid.__str__())
            if self.simulator.messages[uuid].source_address.__repr__().startswith(process_address.__repr__()):
                outgoing_messages.append(uuid.__str__())

        response_data: dict[str, any] = {
            "instances": [address.__repr__() for address in process._instance_context.keys()],
            "neighbors": [address.__repr__() for address in process._neighbors],
            "incoming_messages": incoming_messages,
            "outgoing_messages": outgoing_messages,
        }
        response = self.api.response_class(
            response=json.dumps(response_data),
            status=200,
            mimetype='application/json'
        )
        return response

    def get_program_details(self, program: str) -> Response:
        instances_adresses: list[InstanceAddress] = self.simulator.get_instances(program_name=program)
        response_data: dict[str, any] = {}
        for ia in instances_adresses:
            instance_id = program + "#" + ia.instance.__str__()
            if instance_id not in response_data.keys():
                response_data[instance_id] = {
                    "instances": [],
                    "initial_message": self.simulator.get_initial_message_of_instance(ia.instance).__str__(),
                    "pending_messages": [],
                    "consumed_messages": []
                }
            response_data[instance_id]["instances"].append(ia.__repr__())

        for message in self.simulator.messages.values():
            if message.source_address.__class__.__name__ == "InstanceAddress":
                instance_id = message.source_address.program + "#" + message.source_address.instance.__str__()
                if instance_id in response_data.keys():
                    if message.uuid in self.simulator.pending_messages:

                        response_data[instance_id]["pending_messages"].append(message.uuid.__str__())
                    else:
                        response_data[instance_id]["consumed_messages"].append(message.uuid.__str__())
                    continue
            if message.target_address.__class__.__name__ == "InstanceAddress":
                instance_id = message.target_address.program + "#" + message.target_address.instance.__str__()
                if instance_id in response_data.keys():
                    if message.uuid in self.simulator.pending_messages:
                        response_data[instance_id]["pending_messages"].append(message.uuid.__str__())
                    else:
                        response_data[instance_id]["consumed_messages"].append(message.uuid.__str__())
                    continue

        response = self.api.response_class(
            response=json.dumps(response_data),
            status=200,
            mimetype='application/json'
        )
        return response

    def get_instance_details(self, node: str, port: str, process: str, program: str, instance: str):
        instance_address: InstanceAddress = InstanceAddress(
            node=node,
            port=int(port),
            process=process,
            program=program,
            instance=uuid.UUID(instance)
        )
        process: Process = self.simulator.processes[instance_address.process_address()][-1]
        context: Context = process._instance_context[instance_address]
        response_data: dict[str, any] = {
            "context": {
                "address": context.address.__repr__(),
                "status": context.status.name,
                "color": context.color.__repr__(),
                "return_address": context.return_address.__repr__(),
                "neighbors": [addr.__repr__() for addr in context.neighbors],
                "state": context.state
            },
            "pending_messages": [],
            "consumed_messages": []
        }

        for message in self.simulator.messages.values():
            if instance_address.__eq__(message.source_address):
                if message.uuid in self.simulator.pending_messages:
                    response_data["pending_messages"].append(message.uuid.__str__())
                else:
                    response_data["consumed_messages"].append(message.uuid.__str__())
                continue
            if instance_address.__eq__(message.source_address):
                if message.uuid in self.simulator.pending_messages:
                    response_data["pending_messages"].append(message.uuid.__str__())
                else:
                    response_data["consumed_messages"].append(message.uuid.__str__())
                continue

        response = self.api.response_class(
            response=json.dumps(response_data),
            status=200,
            mimetype='application/json'
        )
        return response

    def put_message_details(self, message_id: str):
        if message_id not in self.simulator.pending_messages:
            return
        content = request.get_json()
        msg_id = uuid.UUID(message_id)
        msg_source = self._str_to_address(content['source'])
        msg_target = self._str_to_address(content['target'])
        msg_return = self._str_to_address(content['return'])
        msg_color = content['color']
        msg_data = content['data']
        message = Message(source=msg_source, target=msg_target, return_address=msg_return, color=msg_color)
        message.uuid = msg_id
        message.data = msg_data
        self.simulator.messages[msg_id] = message


