import copy
import json
import uuid
from copy import deepcopy
from uuid import UUID
import textwrap
from DIAL.Color import Color, DefaultColors
from DIAL.Address import Address
from DIAL.Error import Error

class Message:
    title: str
    color: Color
    target_address: Address
    source_address: Address
    data: dict[str, any]

    _id: UUID
    _parent_message: UUID | None
    _child_messages: list[UUID]
    _is_lost: bool
    _is_self_message: bool
    _self_message_delay: int
    _arrival_time: int
    _arrival_theta: int
    _creation_time: int
    _creation_theta: int

    def __init__(self, target_address: Address | str, source_address: Address | str, title: str = None, color: Color | DefaultColors | None = None, data: dict[str, any] = None):
        self._id = uuid.uuid4()

        if title is None:
            self.title = self._id.__str__()
        else:
            self.title = title

        if color is None:
            self.color = Color()
        elif type(color) == DefaultColors:
            self.color = color.value
        else:
            self.color = color

        if data is None:
            self.data = {}
        else:
            self.data = copy.deepcopy(data)

        if type(source_address) == str:
            self.source_address = Address.from_string(source_address)
        else:
            self.source_address = source_address

        if type(target_address) == str:
            self.target_address = Address.from_string(target_address)
        else:
            self.target_address = target_address

        self._child_messages = []
        self._parent_message = None
        self._is_lost = False
        self._is_self_message = False
        self._self_message_delay = 0
        self._arrival_time = 1
        self._arrival_theta = 0
        self._creation_time = 0
        self._creation_theta = 0


    def copy(self):
        new_message: Message = Message(
            target_address=deepcopy(self.target_address),
            source_address=deepcopy(self.source_address)
        )
        new_message.title = self.title
        new_message.color = deepcopy(self.color)
        new_message.data = deepcopy(self.data)
        return new_message

    def summary(self):
        color = self.color
        if isinstance(color, DefaultColors):
            color = color.value
        summary: dict[str, str] = {
            "source": str(self.source_address),
            "target": str(self.target_address),
            "color": str(color.__repr__()),
            "title": self.title,
            "id": str(self._id),
            "parent": str(self._parent_message),
            "children": [str(child) for child in self._child_messages],
            "arrival_time": int(self._arrival_time),
            "arrival_theta": int(self._arrival_theta),
            "creation_time": int(self._creation_time),
            "creation_theta": int(self._creation_theta),
            "is_lost": str(self._is_lost),
            "self_message": str(self._is_self_message),
            "self_message_delay": int(self._self_message_delay)
        }
        return summary

    def to_json(self):
        json_representation = self.summary()
        json_representation["data"] = self.data

        try:
            json.dumps(self.data)
        except TypeError as error:
            warning_message = f"""
            > Warning: '{error}'
            >
            > The data attribute of the message with ID='{self._id}' might not look as expected.
            > If you want to send messages containing data formats that are not serializable to
            > JSON you must encode and decode it to some JSON serializable datatype yourself.
            > https://stackoverflow.com/questions/3768895/how-to-make-a-class-json-serializable
            """
            warning_message = textwrap.dedent(warning_message)
            # json_representation["data"] = (warning_message
            #                                .replace("'\n", "'!\n")
            #                                .replace("\n>", "")
            #                                .replace("\n", "")
            #                                .replace("\"", "'"))[1:]
            print('\033[96m' + warning_message + '\033[0m')
        return json_representation


class MessageParser:

    generate_missing_id: bool
    simulator: any

    def __init__(self, simulator: any, generate_missing_id: bool = False):
        self.generate_missing_id = generate_missing_id
        self.simulator = simulator

    def parse_message(self, json: dict[str, any]) -> Message | Error:

        parse_function_mapping: dict[str, any] = {
            "id": self.parse_id,
            "target": self.parse_address,
            "source": self.parse_address,
            "parent": self.parse_id,
            "color": self.parse_color,
            "arrival_time": self.parse_int,
            "arrival_theta": self.parse_int,
            "creation_time": self.parse_int,
            "creation_theta": self.parse_int,
            "self_message_delay": self.parse_int,
            "self_message": self.parse_bool,
            "is_lost": self.parse_bool,
            "title": self.parse_str,
            "children": self.parse_children,
            "data": self.parse_data
        }

        parsed_values: dict[str, any] = {}

        for key in parse_function_mapping.keys():
            function = parse_function_mapping[key]
            result = function(json, key)
            if type(result) is Error:
                return result
            parsed_values[key] = result

        msg = Message(source_address=parsed_values["source"], target_address=parsed_values["target"])
        msg._id = parsed_values["id"]
        msg.color = parsed_values["color"]
        msg.title = parsed_values["title"]
        msg._parent_message = parsed_values["parent"]
        msg._child_messages = parsed_values["children"]
        msg._arrival_time = parsed_values["arrival_time"]
        msg._arrival_theta = parsed_values["arrival_theta"]
        msg._creation_time = parsed_values["creation_time"]
        msg._creation_theta = parsed_values["creation_theta"]
        msg._is_lost = parsed_values["is_lost"]
        msg._is_self_message = parsed_values["self_message"]
        msg._self_message_delay = parsed_values["self_message_delay"]
        msg.data = parsed_values["data"]

        validation_error = self.validate_message(msg)
        if validation_error is not None:
            return validation_error
        return msg

    def validate_message(self, message: Message) -> Error | None:
        if message._creation_time < 0:
            return Error("Violated constraint: message.creation_time >= 0")
        if message._creation_theta < 0:
            return Error("Violated constraint: message.creation_theta >= 0")
        if message._arrival_time < 0:
            return Error("Violated constraint: message.arrival_time >= 0")
        if message._arrival_theta < 0:
            return Error("Violated constraint: message.arrival_theta >= 0")
        if message._self_message_delay < 0:
            return Error("Violated constraint: message.self_message_delay >= 0")
        if message._is_self_message and message.source_address.node_name != message.target_address.node_name:
            return Error("Violated constraint: target node must be equal to source node for self-messages")

        if message._creation_time >= message._arrival_time:
            return Error("Violated constraint: message.creation_time < message.arrival_time")
        if message._parent_message is not None:
            parent = self.simulator.get_message(str(message._parent_message))
            if parent is not None:
                if parent._arrival_time != message._creation_time or parent._arrival_theta != message._creation_theta:
                    return Error("Violated constraint: Message creation must be equal to parent arrival.")

        max_allowed_arrival_theta = 0
        if message._arrival_time in self.simulator.messages.keys():
            max_allowed_arrival_theta = len(self.simulator.messages[message._arrival_time]) + 1
        original_message = self.simulator.get_message(str(message._id))
        if original_message is not None:
            if original_message._arrival_time == message._arrival_time:
                max_allowed_arrival_theta -= 1
        if message._arrival_theta > max_allowed_arrival_theta:
            return Error(f"Violated constraint: theta={message._arrival_theta} is invalid for time {message._arrival_time}")

        if self.simulator.time is not None and self.simulator.theta is not None:
            if message._arrival_time < self.simulator.time or (message._arrival_time == self.simulator.time and message._arrival_theta <= self.simulator.theta):
                return Error(f"Violated constraint: Modifying messages received in the past is not allowed")


    def parse_color(self, json: dict[str, any], key: str) -> Color | Error:
        if key not in json.keys():
            return Error(f"Missing attribute message.{key}")
        if not isinstance(json[key], str):
            return Error(f"message.{key} is not a string")
        color = Color.from_string(json[key])
        if color is None:
            return Error(f"Invalid attribute message.{key}")
        return color

    def parse_str(self, json: dict[str, any], key: str) -> str | Error:
        if key not in json.keys():
            return Error(f"Missing attribute message.{key}")
        if not isinstance(json[key], str):
            return Error(f"message.{key} is not a string")
        return json[key]

    def parse_id(self, json: dict[str, any], key: str) -> uuid.UUID | None | Error:
        if key == "id" and "id" not in json.keys() and self.generate_missing_id:
            return uuid.uuid4()
        if key not in json.keys():
            return Error("Missing attribute message.id")
        if not isinstance(json[key], str):
            return Error(f"message.{key} is not a string")
        id_str = json[key]
        if id_str == "None" and key == "parent":
            return None
        try:
            return uuid.UUID(id_str)
        except:
            return Error(f"message.{key} contains a badly formed hexadecimal UUID string")

    def parse_address(self, json: dict[str, any], key: str) -> Address | Error:
        if key not in json.keys():
            return Error(f"Missing attribute message.{key}")
        if not isinstance(json[key], str):
            return Error(f"message.{key} is not a string")
        address = Address.from_string(json[key])
        if address is None:
            return Error(f"Invalid attribute message.{key}")
        if not self.simulator.topology.has_node(address.node_name):
            return Error(f"Node of attribute message.{key} is not in topology")
        if address.algorithm not in self.simulator.algorithms.keys():
            return Error(f"Algorithm of attribute message.{key} does not exist")
        return address

    def parse_int(self, json: dict[str, any], key: str) -> int | Error:
        if key not in json.keys():
            return Error(f"Missing attribute message.{key}")
        try:
            value = int(json[key])
            return value
        except:
            return Error(f'Invalid value for message.{key}')

    def parse_bool(self, json: dict[str, any], key: str) -> bool | Error:
        if key not in json.keys():
            return Error(f"Missing attribute message.{key}")
        if not isinstance(json[key], str):
            return Error(f"message.{key} is not a string")
        value = json[key]
        if value == "True":
            return True
        if value == "False":
            return False
        return Error(f'message.{key} bust be "True" or "False"')

    def parse_children(self, json: dict[str, any], key: str) -> list[uuid.UUID] | Error:
        if key not in json.keys():
            return Error(f"Missing attribute message.{key}")
        if not isinstance(json[key], list):
            return Error(f"message.{key} must be a list")
        message_id = self.parse_id(json, "id")
        if isinstance(message_id, Error):
            return message_id
        if message_id is None:
            return Error(f"message.id should not be None")
        message = self.simulator.get_message(str(message_id))
        value = json[key]
        if message is None:
            if len(value) != 0:
                return Error("A newly created message can not have children")
            else:
                return []
        if set(value) != set(message._child_messages):
            return Error(f'Modifying message.{key} is not allowed.')
        return message._child_messages

    def parse_data(self, json: dict[str, any], key: str) -> dict[str, any] | Error:
        if key not in json.keys():
            return Error(f"Missing attribute message.{key}")
        type_matches = isinstance(json[key], dict) and all(isinstance(x, str) for x in json[key].keys())
        if not type_matches:
            return Error(f"message.{key} must be of type dict[str, any]")
        return json[key]