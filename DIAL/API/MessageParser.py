import uuid

from DIAL.Message import Message
from DIAL.Address import Address
from DIAL.Simulator import Simulator

class ParseError:
    message: str
    def __init__(self, error: str):
        self.message = error

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
            "source": self.parse_address
        }

        parsed_values: dict[str, any] = {}

        for key in parse_function_mapping.keys():
            function = parse_function_mapping[key]
            result = function(json, key)
            if type(result) is ParseError:
                return result
            parsed_values[key] = result

        msg = Message()
        msg._id = parsed_values["id"]
        msg.source_address = parsed_values["source"]
        msg.target_address = parsed_values["target"]

    def parse_id(self, json: dict[str, any], key: str) -> uuid.UUID | ParseError:
        if "id" not in json.keys() and self.generate_missing_id:
            return uuid.uuid4()
        if "id" not in json.keys() and not self.generate_missing_id:
            return ParseError("Missing attribute message.id")
        id_str = json["id"]
        return uuid.UUID(id_str)

    def parse_address(self, json: dict[str, any], key: str) -> Address | ParseError:
        if key not in json.keys():
            return ParseError(f"Missing attribute message.{key}")
        address = Address.from_string(json[key])
        if address is None:
            return ParseError(f"Invalid attribute message.{key}")
        if not self.simulator.topology.has_node(address.node_name):
            return ParseError(f"Node of attribute message.{key} is not in topology")
        if address.algorithm not in self.simulator.algorithms.keys():
            return ParseError(f"Algorithm of attribute message.{key} does not exist")
        return address
