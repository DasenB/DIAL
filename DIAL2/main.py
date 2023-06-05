import uuid
from typing import Callable
from uuid import UUID

from API import API
from Message import Message
from State import State
from Topology import Topology
from Color import Color, Colors
from copy import deepcopy
from Address import Address
from Simulator import Simulator



def flooding(state: State, message: Message) -> (State, list[Message]):
    if state.color != Color():
        return state, []
    forward_messages: list[Message] = []
    for neighbor in state.neighbors:
        if neighbor == message.source_address.node:
            continue
        neighbor_address = Address(node=neighbor, algorithm=state.address.algorithm, instance=state.address.instance)
        forward_message = message.copy()
        forward_message.target_address = neighbor_address
        forward_message.source_address = state.address
        forward_message.title = f'{forward_message.source_address.node} -> {forward_message.target_address.node}'
        forward_messages.append(forward_message)
    state.update_color(Colors.RED.value)
    return state, forward_messages


t = Topology()
t.add_node("A")
t.add_node("B")
t.add_node("C")
t.add_node("D")
t.add_node("E")
t.add_node("F")

t.add_edge("A", "E")
t.add_edge("C", "E")
t.add_edge("D", "F")
t.add_edge("B", "D")
t.add_edge("F", "E")
t.add_edge("B", "C")

i = Address(node="A", algorithm="flooding", instance="flooding-example")
m = Message(target_address=i, source_address=i)
m.title = "Initial Message"

a = {
    "flooding": flooding
}
s = Simulator(topology=t, algorithms=a, initial_messages=[m])

api = API(simulator=s)
api.run()

