
from API import API
from Message import Message
from State import State
from Topology import Topology, EdgeConfig, EdgeDirection, EdgeMessageOrder
from Color import Color, Colors
from copy import deepcopy
from Address import Address
from Simulator import Simulator
import random


def voting_ring(state: State, message: Message) -> (State, list[Message]):
    # Initialization
    if state.color == Colors.WHITE:
        state.data["value"] = random.randint(0, 1000)
        state.data["leader"] = state.address.node
        state.color = Colors.RED
        neighbors_without_predecessor = state.neighbors.copy()
        neighbors_without_predecessor.remove(message.source_address.node)
        state.data["successor"] = neighbors_without_predecessor[0]

    # Node has won the vote and informs others
    if message.data["leader"] == state.address.node:
        flooding_address = Address(node=state.data["successor"], algorithm="flooding", instance="voting_result")
        m = Message(source_address=state.address, target_address=flooding_address, data=state.data)
        return state, [m]

    # Node has lost the vote and relays messages
    if message.data["value"] > state.data["value"]:
        state.color = Colors.BLUE
        state.data["value"] = message.data["value"]
        state.data["leader"] = message.data["value"]
        relay_address = state.address.copy(node=state.data["successor"])
        m = Message(source_address=state.address, target_address=relay_address, data=state.data)
        return state, [m]

def flooding(state: State, message: Message) -> (State, list[Message]):
    if state.color == Colors.RED:
        return state, []
    state.color = Colors.RED
    new_messages: list[Message] = []
    for neighbor in state.neighbors:
        m = message.copy()
        m.source_address = state.address
        m.target_address = state.address.copy(node=neighbor)
        new_messages.append(m)
    return state, new_messages

def echo(state: State, message: Message) -> (State, list[Message]):
    if state.color == Colors.RED:
        return state, []
    state.color = Colors.RED
    new_messages: list[Message] = []
    for neighbor in state.neighbors:
        if neighbor == message.source_address.node:
            continue
        m = message.copy()
        m.source_address = state.address
        m.target_address = state.address.copy(node=neighbor)
        new_messages.append(m)
    return state, new_messages


t = Topology()
t.add_node("A")
t.add_node("B")
t.add_node("C")
t.add_node("D")
t.add_node("E")
t.add_node("F")

reliable_fifo = EdgeConfig(reliability=1.0, direction=EdgeDirection.BIDIRECTIONAL, message_order=EdgeMessageOrder.FIFO)
unrelieable_random = EdgeConfig(reliability=0.5, direction=EdgeDirection.BIDIRECTIONAL, message_order=EdgeMessageOrder.RANDOM)


t.add_edge("A", "E", reliable_fifo)
t.add_edge("C", "E", reliable_fifo)
t.add_edge("D", "F", reliable_fifo)
t.add_edge("B", "D", reliable_fifo)
t.add_edge("F", "E", reliable_fifo)
t.add_edge("B", "C", unrelieable_random)

initial_address = Address(node="A", algorithm="flooding", instance="flooding-example")
initial_message = Message(
    target_address=initial_address,
    source_address=initial_address,
    title="Initial Message"
)
a = {
    "flooding": flooding,
    "voting_ring": voting_ring,
    "echo": echo
}
s = Simulator(topology=t, algorithms=a, initial_messages=[initial_message])

for n in range(0, 100):
    s.step_forward(verbose=True)

#api = API(simulator=s)
#api.run()

