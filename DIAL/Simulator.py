from __future__ import annotations

import copy
from typing import Tuple

import networkx as nx

from uuid import UUID
from DIAL.Address import ProcessAddress, InstanceAddress
from DIAL.Message import Message
from DIAL.Process import Process, Program
from DIAL.Context import Context
from DIAL.Error import Error, guard


class Simulator:
    topology: nx.Graph
    programs: dict[str, Program]
    processes: dict[ProcessAddress, list[Process]]
    # TODO: Do not duplicate the entire Process every time it is executed. Instead only store the last modified context.

    messages: dict[UUID, Message]
    consumed_messages: list[UUID]
    pending_messages: list[UUID]
    manual_messages: list[UUID]
    message_tree: dict[UUID, list[UUID]]
    recording: bool

    def __init__(self, topology: nx.Graph, programs: dict[str, Program]):
        self.topology = topology
        self.programs = programs
        self.processes = {}
        self.messages = {}
        self.consumed_messages = []
        self.pending_messages = []
        self.manual_messages = []
        self.message_tree = {}
        self.recording = True

        # Create processes
        for node in self.topology.nodes:
            address = self.topology.nodes[node]["address"]
            neighbors = nx.all_neighbors(self.topology, node=node)
            neighbor_addresses: list[ProcessAddress] = [self.topology.nodes[neighbor]["address"] for neighbor in
                                                        neighbors]
            self.processes[address] = [Process(address=address, neighbors=neighbor_addresses)]

        # Load the programs into the processes
        for program_name, program in programs.items():
            for process_address in self.processes.keys():
                err = self.processes[process_address][0].load_program(name=program_name, function=program)
                guard(err)

    def add_message(self, message: Message) -> Error | None:
        msg_uuid = message.uuid
        if msg_uuid in self.messages.keys():
            return Error(msg=f"Message with with UUID {msg_uuid} already exists.")
        self.messages[msg_uuid] = message
        self.pending_messages.append(msg_uuid)
        self.manual_messages.append(msg_uuid)
        return None

    def next(self) -> Error | None:
        if len(self.pending_messages) == 0:
            return Error(msg="No messages to process.")
        msg_uuid = self.pending_messages.pop(0)
        msg = self.messages[msg_uuid]
        process_address = msg.target_address.process_address()
        last_process_version = self.processes[process_address][-1]
        new_process_version = copy.deepcopy(last_process_version)
        new_messages = new_process_version.receive(msg)
        self.processes[process_address].append(new_process_version)
        new_msg_uuids = [new_msg.uuid for new_msg in new_messages]
        self.message_tree[msg.uuid] = new_msg_uuids
        self.consumed_messages.append(msg_uuid)
        self.pending_messages.extend(new_msg_uuids)
        for new_msg in new_messages:
            self.messages[new_msg.uuid] = new_msg
        return None

    def prev(self) -> Tuple[Error | None, dict[str, any] | None]:
        if len(self.consumed_messages) == 0:
            return Error(msg="No previous messages consumed."), None

        msg_uuid = self.consumed_messages.pop()

        reverted_message: Message = self.messages[msg_uuid]
        removed_messages: list[Message] = []

        self.pending_messages.insert(0, msg_uuid)
        headless_message_uuids = self.message_tree[msg_uuid]
        for hm_uuid in headless_message_uuids:
            removed_messages.append(self.messages[hm_uuid])
            self.pending_messages.remove(hm_uuid)
            self.messages.pop(hm_uuid)

        msg = self.messages[msg_uuid]
        process_address = msg.target_address.process_address()
        self.processes[process_address].pop()

        touched_messages: dict[str, any] = {
            "reverted_message": reverted_message,
            "removed_messages": removed_messages
        }
        return None, touched_messages

    def reorder(self, new_pending: list[UUID]) -> Error | None:
        if set(new_pending) != set(self.pending_messages):
            return Error(msg="The reordered list must contain the same elements as the original list.")
        self.pending_messages = new_pending
        return None

    def reset(self) -> None:
        self.message_tree = {}
        self.consumed_messages = []
        self.pending_messages = []
        self.messages = {}
        self.manual_messages = []

        for process_address in self.processes.keys():
            if len(self.processes[process_address]) > 1:
                self.processes[process_address] = [self.processes[process_address][0]]

    def get_queue(self) -> dict[str, list[UUID]]:
        message_queues: dict[str, list[UUID]] = {
            "pending": self.pending_messages,
            "consumed": self.consumed_messages
        }
        return message_queues

    def get_message(self, message_uuid: UUID) -> Message | Error:
        if message_uuid not in self.messages.keys():
            return Error(msg=f"No message with UUID {message_uuid} exists.")
        return self.messages[message_uuid]

    def modify_message(self, message: Message) -> Message | Error:
        message_uuid = message.uuid
        if message_uuid not in self.messages.keys():
            return Error(msg=f"No message with UUID {message_uuid} exists.")
        self.messages[message_uuid] = message
        return message

    def delete_message(self, message_uuid: UUID) -> Error | None:
        if message_uuid not in self.messages.keys():
            return Error(msg=f"No message with UUID {message_uuid} exists.")
        del self.messages[message_uuid]
        return None

    def set_recording_state(self, recording: bool) -> None:
        self.recording = recording

    def get_context(self, instance_address: InstanceAddress) -> Context | Error:
        process_address = instance_address.program_address()
        if process_address not in self.processes.keys():
            return Error(msg=f"No process with address {process_address} exists.")
        if instance_address not in self.processes[process_address][-1]._instance_context.keys():
            return Error(msg=f"No instance with address {process_address} exists.")
        context = self.processes[process_address][-1]._instance_context[instance_address]
        return context

    def modify_context(self, instance_address: InstanceAddress, context: Context) -> None | Error:
        process_address = instance_address.program_address()
        if process_address not in self.processes.keys():
            return Error(msg=f"No process with address {process_address} exists.")
        if instance_address not in self.processes[process_address][-1]._instance_context.keys():
            return Error(msg=f"No instance with address {process_address} exists.")
        self.processes[process_address][-1]._instance_context[instance_address] = context
        return None

    def get_instances(self, program_name: str | None = None) -> list[InstanceAddress]:
        instance_addresses: list[InstanceAddress] = []

        for process_address in self.processes.keys():
            process_instance_addresses = self.processes[process_address][-1]._instance_context
            # If no program name is supplied add all instance_addresses
            if program_name is None:
                instance_addresses.extend(process_instance_addresses)
                continue
            # If a program name is supplied add only the mathcing instance_addresses
            for i in process_instance_addresses:
                if i.program == program_name:
                    instance_addresses.append(i)
        return instance_addresses

    def get_initial_message_of_instance(self, instance: UUID):
        previous: UUID | None = None

        for key_uuid in self.message_tree.keys():
            if instance in self.message_tree[key_uuid]:
                previous = key_uuid
                break

        if previous is None:
            return instance
        else:
            return self.get_initial_message_of_instance(previous)
