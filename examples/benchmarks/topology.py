from DIAL import *

def infinite_messages(state: State, message: Message) -> None:
    if state.color == DefaultColors.PINK:
        state.color = DefaultColors.YELLOW
    else:
        state.color = DefaultColors.PINK
    send_to_self(message.copy(), 1)


initial_message = Message(
    source_address="0/infinite_messages/instance",
    target_address="0/infinite_messages/instance",
    color=DefaultColors.PINK,
    title="A Message"
)
edge_config = EdgeConfig(DefaultSchedulers.LOCAL_FIFO, EdgeDirection.BIDIRECTIONAL, reliability=1.0)
nodes = []
edges = []
previous_node = None
for n in range(100):
    node_name = f"{n}"
    nodes.append(node_name)
    edges.append((node_name, node_name, edge_config))
    if previous_node is not None:
        edges.append((node_name, previous_node, edge_config))
    previous_node = node_name
topology = Topology(nodes, edges)
simulator = Simulator(
    topology=topology,
    algorithms={
        "infinite_messages": infinite_messages
    },
    initial_messages={
        0: [initial_message]
    }
)
if __name__ == "__main__":
    api = API(simulator=simulator, open_browser=False)
