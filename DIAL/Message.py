from __future__ import annotations

import json
from DIAL.Address import ProgramAddress
from DIAL.Color import Color

class Message:
    source_address: ProgramAddress
    target_address: ProgramAddress
    return_address: ProgramAddress | None
    data: dict[str, any]
    color: Color

    def __init__(self, source: ProgramAddress, target: ProgramAddress, return_address: ProgramAddress | None = None, color=Color()):
        self.source_address = source
        self.target_address = target
        self.return_address = return_address
        self.data = {}
        self.color = color

    def __repr__(self):
        str_dict: dict[str, str] = {
            "source": str(self.source_address),
            "target": str(self.target_address),
            "return": str(self.return_address),
            "color": str(self.color)
        }
        return json.dumps(str_dict, indent=4)
