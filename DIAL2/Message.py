import uuid
from copy import deepcopy
from uuid import UUID

from Color import Color
from Address import Address


class Message:
    title: str
    color: Color
    target_address: Address
    source_address: Address
    data: dict[str, any]

    _id: UUID
    _parent_message: UUID
    _child_messages: list[UUID]
    _is_lost: bool
    _arrival_time: dict[int, int]

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
        self._arrival_time = {}
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
        summary: dict[str, str] = {
            "source": str(self.source_address),
            "target": str(self.target_address),
            "color": str(self.color),
            "title": self.title,
            "id": str(self._id),
            "children": [str(child) for child in self._child_messages]
        }
        return summary

