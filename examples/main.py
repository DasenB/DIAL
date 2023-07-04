import time
from DIAL.API import API
from DIAL.Message import Message
from DIAL.State import State
from DIAL.Topology import Topology, EdgeConfig, EdgeDirection, DefaultScheduler
from DIAL.Color import Color, Colors
from DIAL.Address import Address
from DIAL.Simulator import Simulator, send, send_to_self
import numpy.random


def flooding(node: State, message: Message, time: int):
    if node.color == Colors.RED:
        return
    node.color = Colors.RED
    for neighbor in node.neighbors:
        m = message.copy()
        m.source_address = node.address
        m.target_address = node.address.copy(node=neighbor)
        send(m)


def print_after_delay(node: State, message: Message, time: int):
    print(
        f'Hi. The current time is {time} ({time - message.data["t"]} after {message.data["t"]}) '
        f'and you are on {node.address}')


def example_hook(node: State, messages: list[Message], time: int):
    if len(messages) > 0:
        self_message = Message(source_address=node.address.copy(),
                               target_address=node.address.copy(algorithm="print_after_delay"))
        self_message.data["t"] = time
        send_to_self(self_message, 5)


reliable_local_fifo = EdgeConfig(
    reliability=1.0,
    direction=EdgeDirection.BIDIRECTIONAL,
    scheduler=DefaultScheduler.LOCAL_FIFO
)

t = Topology()
t.add_node("A")
t.add_node("B")
t.add_node("C")
t.add_node("D")
t.add_node("E")
t.add_node("F")

t.add_edge("A", "E", reliable_local_fifo)
t.add_edge("C", "E", reliable_local_fifo)
t.add_edge("D", "F", reliable_local_fifo)
t.add_edge("B", "D", reliable_local_fifo)
t.add_edge("F", "E", reliable_local_fifo)
t.add_edge("B", "C", reliable_local_fifo)

initial_address = Address(node_name="A", algorithm="flooding", instance="flooding-example")
initial_message = Message(
    target_address=initial_address,
    source_address=initial_address,
    title="Initial Message"
)
a = {
    "flooding": flooding,
    "print_after_delay": print_after_delay
}
s = Simulator(topology=t, algorithms=a, initial_messages=[initial_message], condition_hooks=[example_hook], seed=0)

api = API(simulator=s)
api.run()
