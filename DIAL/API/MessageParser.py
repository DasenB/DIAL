import uuid

from DIAL.Message import Message
from DIAL.Address import Address
from DIAL.Simulator import Simulator
from DIAL.Color import Color, Colors

class ParseError:
    error_message: str
    def __init__(self, error: str):
        self.error_message = error

class MessageParser:

    generate_missing_id: bool
    simulator: Simulator

    def __init__(self, simulator: Simulator, generate_missing_id: bool = False):
        self.generate_missing_id = generate_missing_id
        self.simulator = simulator

    def parse_message(self, json: dict[str, any]) -> Message | ParseError:

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
            if type(result) is ParseError:
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
        msg._is_self_message = parsed_values["self_message"]
        msg._self_message_delay = parsed_values["self_message_delay"]
        msg.data = parsed_values["data"]

        validation_error = self.validate_message(msg)
        if validation_error is not None:
            return validation_error
        return msg

    def validate_message(self, message: Message) -> ParseError | None:
        if message._creation_time < 0:
            return ParseError("Violated constraint: message.creation_time >= 0")
        if message._creation_theta < 0:
            return ParseError("Violated constraint: message.creation_theta >= 0")
        if message._arrival_time < 0:
            return ParseError("Violated constraint: message.arrival_time >= 0")
        if message._arrival_theta < 0:
            return ParseError("Violated constraint: message.arrival_theta >= 0")
        if message._self_message_delay < 0:
            return ParseError("Violated constraint: message.self_message_delay >= 0")

        if message._creation_time >= message._arrival_time:
            return ParseError("Violated constraint: message.creation_time < message.arrival_time")
        if message._parent_message is not None:
            parent = self.simulator.get_message(str(message._parent_message))
            if parent is not  None:
                if parent._arrival_time != message._creation_time or parent._arrival_theta != message._creation_theta:
                    return ParseError("Violated constraint: Message creation must be equal to parent arrival.")

        max_allowed_arrival_theta = 0
        if message._arrival_time in self.simulator.messages.keys():
            max_allowed_arrival_theta = len(self.simulator.messages[message._arrival_time]) + 1
        original_message = self.simulator.get_message(str(message._id))
        if original_message is not None:
            if original_message._arrival_time == message._arrival_time:
                max_allowed_arrival_theta -= 1
        if message._arrival_theta > max_allowed_arrival_theta:
            return ParseError(f"Violated constraint: theta={message._arrival_theta} is invalid for time {message._arrival_time}")

        if self.simulator.time is not None and self.simulator.theta is not None:
            if message._arrival_time < self.simulator.time or (message._arrival_time == self.simulator.time and message._arrival_theta <= self.simulator.theta):
                return ParseError(f"Violated constraint: Modifying messages received in the past is not allowed")


    def parse_color(self, json: dict[str, any], key: str) -> Color | ParseError:
        if key not in json.keys():
            return ParseError(f"Missing attribute message.{key}")
        if not isinstance(json[key], str):
            return ParseError(f"message.{key} is not a string")
        color = Color.from_string(json[key])
        if color is None:
            return ParseError(f"Invalid attribute message.{key}")
        return color

    def parse_str(self, json: dict[str, any], key: str) -> str | ParseError:
        if key not in json.keys():
            return ParseError(f"Missing attribute message.{key}")
        if not isinstance(json[key], str):
            return ParseError(f"message.{key} is not a string")
        return json[key]

    def parse_id(self, json: dict[str, any], key: str) -> uuid.UUID | None | ParseError:
        if "id" not in json.keys() and self.generate_missing_id:
            return uuid.uuid4()
        if "id" not in json.keys() and not self.generate_missing_id:
            return ParseError("Missing attribute message.id")
        if not isinstance(json[key], str):
            return ParseError(f"message.{key} is not a string")
        id_str = json["id"]
        if id_str == "None" and key == "parent":
            return None
        return uuid.UUID(id_str)

    def parse_address(self, json: dict[str, any], key: str) -> Address | ParseError:
        if key not in json.keys():
            return ParseError(f"Missing attribute message.{key}")
        if not isinstance(json[key], str):
            return ParseError(f"message.{key} is not a string")
        address = Address.from_string(json[key])
        if address is None:
            return ParseError(f"Invalid attribute message.{key}")
        if not self.simulator.topology.has_node(address.node_name):
            return ParseError(f"Node of attribute message.{key} is not in topology")
        if address.algorithm not in self.simulator.algorithms.keys():
            return ParseError(f"Algorithm of attribute message.{key} does not exist")
        return address

    def parse_int(self, json: dict[str, any], key: str) -> int | ParseError:
        if key not in json.keys():
            return ParseError(f"Missing attribute message.{key}")
        try:
            value = int(json[key])
            return value
        except:
            return ParseError(f'Invalid value for message.{key}')

    def parse_bool(self, json: dict[str, any], key: str) -> bool | ParseError:
        if key not in json.keys():
            return ParseError(f"Missing attribute message.{key}")
        if not isinstance(json[key], str):
            return ParseError(f"message.{key} is not a string")
        value = json[key]
        print(type(value))
        if value == "True":
            return True
        if value == "False":
            return False
        return ParseError(f'message.{key} bust be "True" or "False"')

    def parse_children(self, json: dict[str, any], key: str) -> list[uuid.UUID] | ParseError:
        if key not in json.keys():
            return ParseError(f"Missing attribute message.{key}")
        if not isinstance(json[key], list):
            return ParseError(f"message.{key} must be a list")
        message_id = self.parse_id(json, "id")
        if isinstance(message_id, ParseError):
            return message_id
        if message_id is None:
            return ParseError(f"message.id should not be None")
        message = self.simulator.get_message(str(message_id))
        value = json[key]
        if message is None:
            if len(value) != 0:
                return ParseError("A newly created message can not have children")
            else:
                return []
        if set(value) != set(message._child_messages):
            return ParseError(f'Modifying message.{key} is not allowed.')
        return message._child_messages

    def parse_data(self, json: dict[str, any], key: str) -> dict[str, any] | ParseError:
        if key not in json.keys():
            return ParseError(f"Missing attribute message.{key}")
        type_matches = isinstance(json[key], dict) and all(isinstance(x, str) for x in json[key].keys())
        if not type_matches:
            return ParseError(f"message.{key} must be of type dict[str, any]")
        return json[key]