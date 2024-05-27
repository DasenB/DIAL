from DIAL import *

def infinite_messages(state: State, message: Message) -> None:
    if state.color == DefaultColors.PINK:
        state.color = DefaultColors.YELLOW
    else:
        state.color = DefaultColors.PINK
    send_to_self(message.copy(), 1)


initial_message = Message(
    source_address="A/infinite_messages/instance",
    target_address="A/infinite_messages/instance",
    color=DefaultColors.PINK,
    title="A Message"
)
edge_config = EdgeConfig(DefaultSchedulers.LOCAL_FIFO, EdgeDirection.BIDIRECTIONAL, reliability=1.0)
nodes = ["A"]
edges = [
    ("A", "A", edge_config)
]
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
