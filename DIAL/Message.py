from __future__ import annotations

import json
from uuid import UUID, uuid4

from DIAL.Address import ProgramAddress, InstanceAddress
from DIAL.Color import Color


class Message:
    uuid: UUID
    source_address: ProgramAddress | InstanceAddress
    target_address: ProgramAddress | InstanceAddress
    return_address: ProgramAddress | InstanceAddress | None
    data: dict[str, any]
    color: Color

    def __init__(self, source: ProgramAddress, target: ProgramAddress, return_address: ProgramAddress | None = None,
                 color=Color()):
        self.source_address = source
        self.target_address = target
        self.return_address = return_address
        self.data = {}
        self.color = color
        self.uuid = uuid4()

    def __repr__(self):
        return json.dumps(self.summary(), indent=4)

    def summary(self):
        str_dict: dict[str, str] = {
            "uuid": self.uuid.__str__(),
            "source": str(self.source_address),
            "target": str(self.target_address),
            "return": str(self.return_address),
            "color": str(self.color)
        }
        return str_dict


