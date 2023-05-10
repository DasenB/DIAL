from __future__ import annotations
from ipaddr import IPAddress
from uuid import UUID

class ProcessAddress:
    process: str

    def extend(self, program: str) -> ProgramAddress:
        return ProgramAddress(process=self.process, program=program)

    def __init__(self, process: str):
        self.process = process

    def __repr__(self):
        return f"{self.process}"

    def __eq__(self, other: ProcessAddress):
        if other.__class__.__name__ != "ProcessAddress":
            return False
        if self.process != other.process:
            return False
        return True

    def __hash__(self):
        return hash(str(self))


class ProgramAddress(ProcessAddress):
    program: str

    def extend(self, instance: UUID) -> InstanceAddress:
        return InstanceAddress(process=self.process, program=self.program, instance=instance)

    def process_address(self) -> ProcessAddress:
        return ProcessAddress(process=self.process)

    def __init__(self, process: str, program: str):
        super().__init__(process=process)
        self.program = program

    def __repr__(self):
        return f"{str(super().__repr__())}/{self.program}"

    def __eq__(self, other: ProgramAddress):
        if other.__class__.__name__ != "ProgramAddress":
            return False
        if not super().__eq__(other.process_address()):
            return False
        if self.program != other.program:
            return False
        return True

    def __hash__(self):
        return hash(str(self))


class InstanceAddress(ProgramAddress):
    instance: UUID

    def program_address(self) -> ProgramAddress:
        return ProgramAddress(process=self.process, program=self.program)

    def __init__(self, process: str, program: str, instance: UUID):
        super().__init__(process=process, program=program)
        self.instance = instance

    def __repr__(self):
        return f"{str(super().__repr__())}/{str(self.instance)}"

    def __eq__(self, other: InstanceAddress):
        if other.__class__.__name__ != "InstanceAddress":
            return False
        if not super().__eq__(other.program_address()):
            return False
        if self.instance != other.instance:
            return False
        return True

    def __hash__(self):
        return hash(str(self))
