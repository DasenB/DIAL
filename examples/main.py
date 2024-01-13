import json
from multiprocessing import Process

import requests

from DIAL.API.API import API
from DIAL.Message import Message
from DIAL.State import State
from DIAL.Topology import Topology, EdgeConfig, EdgeDirection
from DIAL.Scheduler import DefaultSchedulers
from DIAL.Color import DefaultColors
from DIAL.Address import Address
from DIAL.Simulator import Simulator, send, send_to_self


def flooding(node: State, message: Message, time: int):
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


def print_after_delay(node: State, message: Message, time: int):
    node.color = DefaultColors.BLUE.value
    print(
        f'Hi. The current time is {time} ({time - message.data["t"]} after {message.data["t"]}) '
        f'and you are on {node.address}')


def example_hook(node: State, messages: list[Message], time: int):
    if len(messages) > 0:
        self_message = Message(source_address=node.address.copy(),
                               target_address=node.address.copy(algorithm="print_after_delay"))
        self_message.data["t"] = int(time)
        self_message.color = DefaultColors.BLUE.value
        send_to_self(self_message, 5)


reliable_local_fifo = EdgeConfig(
    reliability=1.0,
    direction=EdgeDirection.BIDIRECTIONAL,
    scheduler=DefaultSchedulers.LOCAL_FIFO
)

t = Topology(all_nodes_have_loops=True)
t.add_node("A")
t.add_node("B")
t.add_node("CCC")
t.add_node("D")
t.add_node("E")
t.add_node("F")

t.add_edge("A", "E", reliable_local_fifo)
t.add_edge("E", "A", reliable_local_fifo)
t.add_edge("E", "E", reliable_local_fifo)
t.add_edge("CCC", "E", reliable_local_fifo)
t.add_edge("D", "F", reliable_local_fifo)
t.add_edge("B", "D", reliable_local_fifo)
t.add_edge("F", "E", reliable_local_fifo)
t.add_edge("B", "CCC", reliable_local_fifo)

initial_address = Address(node_name="A", algorithm="flooding", instance="flooding-example")
initial_message = Message(
    target_address=initial_address,
    source_address=initial_address,
    title="Initial Message"
)
initial_message.color = DefaultColors.RED
initial_message._creation_time = -1
lost_message = Message(
    target_address=Address(node_name="F", algorithm="flooding", instance="flooding-example"),
    source_address=Address(node_name="E", algorithm="flooding", instance="flooding-example"),
    title="Example for a lost message"
)
lost_message._is_lost = True
lost_message.color = DefaultColors.PINK.value
a = {
    "flooding": flooding,
    "print_after_delay": print_after_delay
}
s = Simulator(topology=t, algorithms=a, initial_messages={1: [initial_message], 8: [lost_message] }, condition_hooks=[example_hook], seed=0)
# s.step_forward(verbose=False)
# s.step_forward(verbose=False)
# s.step_forward(verbose=False)
# s.step_backward(verbose=False)
# s.step_forward(verbose=False)
# s.step_forward(verbose=False)
#

api = API(simulator=s, verbose=True)


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
