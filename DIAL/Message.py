import json
import uuid
from copy import deepcopy
from uuid import UUID
import textwrap
from DIAL.Color import Color, Colors
from DIAL.Address import Address


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

    def __init__(self, target_address: Address, source_address: Address, title: str = None, color: Color = None, data: dict[str, any] = None):
        self._id = uuid.uuid4()

        if title is None:
            self.title = self._id.__str__()
        else:
            self.title = title

        if color is None:
            self.color = Color()
        else:
            self.color = color

        if data is None:
            self.data = {}
        else:
            self.data = data

        self._child_messages = []
        self._parent_message = None
        self._is_lost = False
        self._is_self_message = False
        self._self_message_delay = 0
        self._arrival_time = 1
        self._arrival_theta = 0
        self._creation_time = 0
        self._creation_theta = 0
        self.target_address = target_address
        self.source_address = source_address

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
        if isinstance(color, Colors):
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
        try:
            json_representation["data"] = json.dumps(self.data)
        except TypeError as error:
            warning_message = f"""
            > Encoding Error:
            > '{error}'
            >
            > If you want to send messages containing data formats that are not serializable to
            > JSON you must encode and decode it to some JSON serializable datatype yourself.
            > https://stackoverflow.com/questions/3768895/how-to-make-a-class-json-serializable
            """
            warning_message = textwrap.dedent(warning_message)
            json_representation["data"] = (warning_message
                                           .replace("'\n", "'!\n")
                                           .replace("\n>", "")
                                           .replace("\n", "")
                                           .replace("\"", "'"))[1:]
            print('\033[93m' + warning_message + '\033[0m')
        return json_representation

