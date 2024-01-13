from DIAL.Message import Message
from DIAL.State import State
from DIAL.Topology import DefaultTopologies
from DIAL.Color import DefaultColors
from DIAL.Address import Address
from DIAL.Simulator import Simulator, send, send_to_self
import numpy.random
from DIAL.API.API import API

def flooding_algorithm(node: State, message: Message, time: int):
    if node.color == DefaultColors.RED.value:
        return
    node.color = DefaultColors.RED.value
    for neighbor in node.neighbors:
        if neighbor == node.address.node_name:
            continue
        m = message.copy()
        m.source_address = node.address
        m.target_address = node.address.copy(node=neighbor)
        send(m)

topology = DefaultTopologies.EXAMPLE_NETWORK_3
message = Message(source_address="A/initial_message/instance", target_address="B/flooding/instance", color=DefaultColors.RED)
initial_message_queue = {
    0: [message]
}
algorithms = {
    "flooding": flooding_algorithm
}
simulator = Simulator(topology=topology, algorithms=algorithms, initial_messages=initial_message_queue)
api = API(simulator=simulator, verbose=True)

exit(0)

def voting_ring(state: State, message: Message, time: int):
    # Initialization
    if state.color == DefaultColors.WHITE:
        state.data["value"] = numpy.random.randint(0, 1000)
        state.data["leader"] = state.address.node
        state.color = DefaultColors.RED
        neighbors_without_predecessor = state.neighbors.copy()
        neighbors_without_predecessor.remove(message.source_address.node)
        state.data["successor"] = neighbors_without_predecessor[0]

    # Node has won the vote and informs others
    if message.data["leader"] == state.address.node:
        flooding_address = Address(node=state.data["successor"], algorithm="flooding", instance="voting_result")
        m = Message(source_address=state.address, target_address=flooding_address, data=state.data)
        send(m)

    # Node has lost the vote and relays messages
    if message.data["value"] > state.data["value"]:
        state.color = DefaultColors.BLUE
        state.data["value"] = message.data["value"]
        state.data["leader"] = message.data["value"]
        relay_address = state.address.copy(node=state.data["successor"])
        m = Message(source_address=state.address, target_address=relay_address, data=state.data)
        send(m)


def flooding(state: State, message: Message, time: int):
    if state.color == DefaultColors.RED:
        self_message = Message(source_address=state.address.copy(), target_address=state.address.copy(algorithm="print_after_delay"))
        self_message.data["t"] = time
        send_to_self(self_message, 5)
        return
    state.color = DefaultColors.RED
    for neighbor in state.neighbors:
        m = message.copy()
        m.source_address = state.address
        m.target_address = state.address.copy(node=neighbor)
        send(m)


def echo(state: State, message: Message, time: int):
    if state.color == DefaultColors.RED:
        return
    state.color = DefaultColors.RED
    for neighbor in state.neighbors:
        if neighbor == message.source_address.node:
            continue
        m = message.copy()
        m.source_address = state.address
        m.target_address = state.address.copy(node=neighbor)
        send(m)


def print_after_delay(state: State, message: Message, time: int):
    print(f'Hi. The current time is {time} ({time - message.data["t"]} after {message.data["t"]}) and you are on {state.address}')
    # print(f'{state.random_number_generator.integers(0, 100)}')


def example_hook(state: State, messages: list[Message], time: int):
    if len(messages) > 0:
        print("Some messages have been generated.")


t = Topology()
t.add_node("A")
t.add_node("B")
t.add_node("C")
t.add_node("D")
t.add_node("E")
t.add_node("F")

reliable_global_fifo = EdgeConfig(
    reliability=1.0,
    direction=EdgeDirection.BIDIRECTIONAL,
    scheduler=DefaultScheduler.GLOBAL_FIFO
)

reliable_local_fifo = EdgeConfig(
    reliability=1.0,
    direction=EdgeDirection.BIDIRECTIONAL,
    scheduler=DefaultScheduler.LOCAL_FIFO
)

unrelieable_random = EdgeConfig(
    reliability=0.5,
    direction=EdgeDirection.BIDIRECTIONAL,
    scheduler=DefaultScheduler.RANDOM
)

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
    "voting_ring": voting_ring,
    "echo": echo,
    "print_after_delay": print_after_delay
}
s = Simulator(topology=t, algorithms=a, initial_messages=[initial_message], condition_hooks=[example_hook], seed=0)


# s.step_forward(verbose=True)
# s.step_forward(verbose=True)
# s.step_backward(verbose=True)
# s.step_backward(verbose=True)
# s.step_forward(verbose=True)
# s.step_forward(verbose=True)
#
#


# api = API(simulator=s)
# api.run()


s.step_forward(verbose=True)
s.step_forward(verbose=True)
s.step_forward(verbose=True)
s.step_forward(verbose=True)
#
#
#
# while True:
#     if not s.step_forward(verbose=True):
#         break
#     s.step_backward(verbose=True)
#     s.step_forward(verbose=True)

while True:
    if not s.step_forward(verbose=True):
        break

