import json
from multiprocessing import Process

import requests

from DIAL.API.API import API
from DIAL.Message import Message
from DIAL.State import State
from DIAL.Topology import Topology, EdgeConfig, EdgeDirection, DefaultScheduler
from DIAL.Color import Colors
from DIAL.Address import Address
from DIAL.Simulator import Simulator, send, send_to_self


def flooding(node: State, message: Message, time: int):
    if node.color == Colors.RED.value:
        return
    node.color = Colors.RED.value
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
s = Simulator(topology=t, algorithms=a, initial_messages={0: [initial_message]}, condition_hooks=[example_hook], seed=0)
# s.step_forward(verbose=False)
# s.step_forward(verbose=False)
# s.step_forward(verbose=False)
# s.step_backward(verbose=False)
# s.step_forward(verbose=False)
# s.step_forward(verbose=False)
#

api = API(simulator=s)
p = Process(target=api.run)
p.start()


def prettyPrint(x):
    print(json.dumps(x, indent=4))
#
#
# # Get topology
# test_topology = requests.get("https://127.0.0.1:10101/topology", verify=False)
# prettyPrint(test_topology.json())
#
# # Get messages
# test_messages = requests.get("https://127.0.0.1:10101/messages", verify=False)
# prettyPrint(test_messages.json())
#
# # Get message
# test_initial_message = requests.get(f'https://127.0.0.1:10101/message/{test_messages.json()["messages"]["0"][0]["id"]}',
#                                     verify=False)
# prettyPrint(test_initial_message.json())
#
# # # Delete message
# # delete_response = requests.delete(f'https://127.0.0.1:10101/message/{test_messages.json()["messages"]["5"][0]["id"]}',
# #                                   verify=False)
# # prettyPrint(delete_response.json())
#
# # Get messages
# test_messages = requests.get("https://127.0.0.1:10101/messages", verify=False)
# prettyPrint(test_messages.json())
#
#
# # PUT message
# full_message = test_messages.json()["messages"]["0"][0]
# put_message: dict[str, any] = {}
# put_message["color"] = full_message["color"]
# put_message["title"] = "ASD asdf"
#
# _messages = requests.put(f'https://127.0.0.1:10101/message/{test_messages.json()["messages"]["0"][0]["id"]}', verify=False, json=put_message)
# prettyPrint(_messages.json())
#
# # Get messages
# test_states = requests.get(f'https://127.0.0.1:10101/states', verify=False)
# prettyPrint(test_states.json())
#
# tet_state = requests.get(f'https://127.0.0.1:10101/state/A/print_after_delay/flooding-example', verify=False)
# prettyPrint(tet_state.json())
#
#
# result = requests.get(f'https://127.0.0.1:10101/reschedule/{test_messages.json()["messages"]["12"][0]["id"]}/20/0', verify=False)
# prettyPrint(result.json())
# result = requests.get(f'https://127.0.0.1:10101/reschedule/{test_messages.json()["messages"]["16"][0]["id"]}/20/0', verify=False)
# prettyPrint(result.json())
# result = requests.get(f'https://127.0.0.1:10101/reschedule/{test_messages.json()["messages"]["17"][0]["id"]}/20/0', verify=False)
# prettyPrint(result.json())
# result = requests.get(f'https://127.0.0.1:10101/reschedule/{test_messages.json()["messages"]["16"][0]["id"]}/20/2', verify=False)
# prettyPrint(result.json())
# result = requests.get(f'https://127.0.0.1:10101/reschedule/{test_messages.json()["messages"]["16"][0]["id"]}/20/0', verify=False)
# prettyPrint(result.json())
# result = requests.get(f'https://127.0.0.1:10101/reschedule/{test_messages.json()["messages"]["16"][0]["id"]}/18/0', verify=False)
# prettyPrint(result.json())
# result = requests.get("https://127.0.0.1:10101/messages", verify=False)
# prettyPrint(result.json())
#
# result = requests.get(f'https://127.0.0.1:10101/step-forward/3', verify=False)
# prettyPrint(result.json())
#
# result = requests.get("https://127.0.0.1:10101/messages", verify=False)
# prettyPrint(result.json())
