from __future__ import annotations

from enum import Enum

from DIAL.Address import InstanceAddress, ProgramAddress, ProcessAddress
from DIAL.Color import Color


class Status(Enum):
    ACTIVE = 1
    PASSIVE = 2
    TERMINATED = 3


class Context:
    address: InstanceAddress
    status: Status
    state: dict[str, any]
    color: Color
    return_address: ProgramAddress
    neighbors: list[ProcessAddress]

    def __init__(self, address: InstanceAddress, return_address: ProgramAddress,
                 neighbors: list[ProcessAddress] | None = None, ):
        self.address = address
        self.status = Status.ACTIVE
        if neighbors is None:
            neighbors = []
        self.state = {}
        self.color = Color()
        self.neighbors = neighbors
        self.return_address = return_address
