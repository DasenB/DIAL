from __future__ import annotations

import uuid
from typing import Callable, Tuple
import types
from inspect import signature, Signature
from Address import NodeAddress, ProcessAddress, ProgramAddress, InstanceAddress
from DIAL.Color import Color
from DIAL.Context import Context, Status
from DIAL.Error import Error
from DIAL.Message import Message

Program = Callable[[Context, Message], tuple[Context, list[Message]]]

class Process:
    _address: ProcessAddress
    _program_table: dict[ProgramAddress, Program]
    _instance_context: dict[InstanceAddress, Context]
    _neighbors: list[ProcessAddress]

    def load_program(self, name: str, function: Program) -> Error | None:
        program_signature: Signature = signature(function)
        if str(program_signature) != "(context: DIAL.Context.Context, message: DIAL.Message.Message) -> tuple[DIAL.Context.Context, list[DIAL.Message.Message]]":
            print(str(program_signature))
            err_msg = f"Failed to register program \"{name}\". Invalid function signature."
            return Error(msg=err_msg)
        scope: dict[str, any] = {
            "Status": Status,
            "print": print,
            "NodeAddress": NodeAddress,
            "ProcessAddress": ProcessAddress,
            "ProgramAddress": ProgramAddress,
            "InstanceAddress": InstanceAddress,
            "Color": Color,
            "Message": Message
        }
        program_address = ProgramAddress(node=self._address.node, port=self._address.port, process=self._address.process, program=name)
        self._program_table[program_address] = types.FunctionType(function.__code__, scope, name=name)
        return None

    def receive(self, message: Message) -> list[Message]:

        # If no instance exists, create one
        instance_address: InstanceAddress
        if message.target_address.__class__.__name__ == "InstanceAddress":
            instance_address = message.target_address
        elif message.target_address.__class__.__name__ == "ProgramAddress":
            node = message.target_address.node
            port = message.target_address.port
            process = message.target_address.process
            program = message.target_address.program
            instance = uuid.uuid4()
            instance_address = InstanceAddress(node=node, port=port, process=process, program=program, instance=instance)
        else:
            return []

        # If no local context exists, create one
        if instance_address not in self._instance_context.keys():
            self._instance_context[instance_address] = Context(
                address=instance_address,
                return_address=message.return_address,
                neighbors=self._neighbors
            )

        context = self._instance_context[instance_address]
        function = self._program_table[instance_address.program_address()]
        result_context, result_msg = function(context, message)
        self._instance_context[instance_address] = result_context
        return result_msg

    def __init__(self, address: ProcessAddress, neighbors: list[ProcessAddress]):
        self._address = address
        self._neighbors = neighbors
        self._program_table = {}
        self._instance_context = {}


