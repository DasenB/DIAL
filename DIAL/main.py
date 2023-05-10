import inspect
import sys

from DIAL.Simulator import Simulator
from DIAL.Address import ProcessAddress, ProgramAddress, InstanceAddress
from DIAL.Context import Context, Status
from DIAL.Message import Message
from DIAL.Process import Process, Program
from DIAL.Error import guard
from DIAL.API import SimulatorWebserver
import uuid
import networkx as nx




def flooding_program(context: Context, message: Message) -> tuple[Context, list[Message]]:
    response_messages: list[Message] = []
    if context.status == Status.ACTIVE:
        context.state['test'] = message.data['test']
        print(f"Process: {context.address.process_address()}: { message.data['test'] }")
        for n in context.neighbors:
            if message.source_address.process_address() == n:
                continue
            target_program_addr = n.extend(program=context.address.program)
            target_instance_addr = target_program_addr.extend(instance=context.address.instance)
            m = Message(source=context.address, target=target_instance_addr)
            m.data = message.data
            response_messages.append(m)
        context.status = Status.PASSIVE
    return context, response_messages

# def lift(message: Message) -> tuple[Context, list[Message]]:
#     # your code ...
#     send("x" node4)
#     contex.state = 4
#     return context

def example_topology() -> nx.Graph:
    topology: nx.Graph = nx.Graph()

    topology.add_node("A", address=ProcessAddress(process="A"))
    topology.add_node("B", address=ProcessAddress(process="B"))
    topology.add_node("C", address=ProcessAddress(process="C"))
    topology.add_node("D", address=ProcessAddress(process="D"))
    topology.add_node("E", address=ProcessAddress(process="E"))
    topology.add_node("F", address=ProcessAddress(process="F"))
    topology.add_node("G", address=ProcessAddress(process="G"))
    topology.add_node("H", address=ProcessAddress(process="H"))
    topology.add_node("I", address=ProcessAddress(process="I"))
    topology.add_node("J", address=ProcessAddress(process="J"))
    topology.add_node("K", address=ProcessAddress(process="K"))
    topology.add_node("L", address=ProcessAddress(process="L"))
    topology.add_node("M", address=ProcessAddress(process="M"))

    topology.add_edge("A", "B")
    topology.add_edge("B", "C")
    topology.add_edge("C", "D")
    topology.add_edge("D", "E")
    topology.add_edge("E", "F")
    topology.add_edge("F", "G")
    topology.add_edge("G", "H")
    topology.add_edge("H", "I")
    topology.add_edge("I", "A")
    topology.add_edge("I", "J")
    topology.add_edge("I", "K")
    topology.add_edge("I", "L")
    topology.add_edge("I", "M")

    return topology


def get_size(obj, seen=None):
    """Recursively finds size of objects"""

    size = sys.getsizeof(obj)
    if seen is None:
        seen = set()

    obj_id = id(obj)
    if obj_id in seen:
        return 0

    # Important mark as seen *before* entering recursion to gracefully handle
    # self-referential objects
    seen.add(obj_id)

    if isinstance(obj, dict):
        size += sum([get_size(v, seen) for v in obj.values()])
        size += sum([get_size(k, seen) for k in obj.keys()])
    elif hasattr(obj, '__dict__'):
        size += get_size(obj.__dict__, seen)
    elif hasattr(obj, '__iter__') and not isinstance(obj, (str, bytes, bytearray)):
        size += sum([get_size(i, seen) for i in obj])

    return size


if __name__ == "__main__":

    # Create initial message
    source = InstanceAddress(process="A", program="initiator", instance=uuid.uuid4())
    target = ProgramAddress(process="A", program="flooding")
    initial_message = Message(source=source, target=target, return_address=source)
    initial_message.data = {"test": "hello_world"}

    # Create Topology and program list
    G = example_topology()
    P: dict[str, Program] = {
        "flooding": flooding_program
    }

    # Setup simulator
    api = SimulatorWebserver(host="localhost", port=10101, topology=G, programs=P)
    api.simulator.add_message(initial_message)
    api.run()

