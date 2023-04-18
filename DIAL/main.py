import time

from DIAL.Address import ProcessAddress, ProgramAddress, InstanceAddress
from DIAL.Context import Context, Status
from DIAL.Message import Message
from DIAL.Process import Process
from DIAL.Error import guard

import uuid
import networkx as nx


def flooding_program(context: Context, message: Message) -> tuple[Context, list[Message]]:
    response_messages: list[Message] = []

    if context.status == Status.ACTIVE:
        print(message.data["test"])
        for n in context.neighbors:
            target_program_addr = n.extend(program=context.address.program)
            target_instance_addr = target_program_addr.extend(instance=context.address.instance)
            m = Message(source=context.address, target=target_instance_addr)
            m.data = message.data
            response_messages.append(m)
        context.status = Status.PASSIVE
    return context, response_messages


def example_topology() -> nx.Graph:
    topology: nx.Graph = nx.Graph()

    topology.add_node("A", address=ProcessAddress(node="127.0.0.1", port=10101, process="A"))
    topology.add_node("B", address=ProcessAddress(node="127.0.0.1", port=10101, process="B"))
    topology.add_node("C", address=ProcessAddress(node="127.0.0.1", port=10101, process="C"))
    topology.add_node("D", address=ProcessAddress(node="127.0.0.1", port=10101, process="D"))
    topology.add_node("E", address=ProcessAddress(node="127.0.0.1", port=10101, process="E"))
    topology.add_node("F", address=ProcessAddress(node="127.0.0.1", port=10101, process="F"))
    topology.add_node("G", address=ProcessAddress(node="127.0.0.1", port=10101, process="G"))
    topology.add_node("H", address=ProcessAddress(node="127.0.0.1", port=10101, process="H"))
    topology.add_node("I", address=ProcessAddress(node="127.0.0.1", port=10101, process="I"))

    topology.add_edge("A", "B")
    topology.add_edge("B", "C")
    topology.add_edge("C", "D")
    topology.add_edge("D", "E")
    topology.add_edge("E", "F")
    topology.add_edge("F", "G")
    topology.add_edge("G", "H")
    topology.add_edge("H", "I")
    topology.add_edge("I", "A")

    return topology


if __name__ == "__main__":

    # node_a = NodeAddress(node="127.0.0.1", port=10101)
    # process_a = ProcessAddress(node="127.0.0.1", port=10101, process="test")
    # process_b = ProcessAddress(node="127.0.0.1", port=10101, process="test")
    # process_c = ProcessAddress(node="127.0.0.1", port=10101, process="test1")

    G = example_topology()
    processes: dict[ProcessAddress, Process] = {}
    message_buffer: list[Message] = []

    # Build topology and processes
    for node in G.nodes:
        address = G.nodes[node]["address"]
        neighbors = nx.all_neighbors(G, node=node)
        neighbor_addresses: list[ProcessAddress] = [G.nodes[neighbor]["address"] for neighbor in neighbors]
        processes[address] = Process(address=address, neighbors=neighbor_addresses)
        err = processes[address].load_program(name="flooding", function=flooding_program)
        guard(err)

    # Create initial message
    source = InstanceAddress(node="127.0.0.1", port=10101, process="X", program="sensor", instance=uuid.uuid4())
    target = ProgramAddress(node="127.0.0.1", port=10101, process="A", program="flooding")
    initial_message = Message(source=source, target=target, return_address=source)
    initial_message.data = {"test": "hello_world"}

    # Run algorithm
    message_buffer.append(initial_message)
    while len(message_buffer) != 0:
        msg = message_buffer.pop()
        print(msg)
        process = processes[msg.target_address.process_address()]
        new_messages = process.receive(message=msg)
        message_buffer.extend(new_messages)
        print(len(message_buffer))
        print("==============================")
