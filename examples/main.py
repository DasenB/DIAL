from DIAL.API import API
from DIAL.Message import Message
from DIAL.State import State
from DIAL.Topology import Topology, EdgeConfig, EdgeDirection, DefaultScheduler
from DIAL.Color import Color, Colors
from copy import deepcopy
from DIAL.Address import Address
from DIAL.Simulator import Simulator, send, send_to_self
import numpy.random


def flooding(state: State, message: Message, time: int):
    if state.color == Colors.RED:
        self_message = Message(source_address=state.address.copy(),
                               target_address=state.address.copy(algorithm="print_after_delay"))
        self_message.data["t"] = time
        send_to_self(self_message, 5)
        return
    state.color = Colors.RED
    for neighbor in state.neighbors:
        m = message.copy()
        m.source_address = state.address
        m.target_address = state.address.copy(node=neighbor)
        send(m)


def echo(state: State, message: Message, time: int):
    if state.color == Colors.RED:
        return
    state.color = Colors.RED
    for neighbor in state.neighbors:
        if neighbor == message.source_address.node:
            continue
        m = message.copy()
        m.source_address = state.address
        m.target_address = state.address.copy(node=neighbor)
        send(m)


def print_after_delay(state: State, message: Message, time: int):
    print(
        f'Hi. The current time is {time} ({time - message.data["t"]} after {message.data["t"]}) and you are on {state.address}')
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

reliable_local_fifo = EdgeConfig(
    reliability=1.0,
    direction=EdgeDirection.BIDIRECTIONAL,
    scheduler=DefaultScheduler.LOCAL_FIFO
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
while True:
    if not s.step_forward(verbose=True):
        break
    s.step_backward(verbose=True)
    s.step_forward(verbose=True)

# api = API(simulator=s)
# api.run()
