from DIAL import *

def slow_messages(state: State, message: Message) -> None:
    if state.color == DefaultColors.YELLOW:
        state.color = DefaultColors.PINK
    else:
        state.color = DefaultColors.YELLOW

    send_to_self(message.copy(), 1)

    msg = message.copy()
    msg.color = DefaultColors.BLUE
    send_to_self(msg, 50000)

initial_message = Message(
    source_address="A/slow_messages/instance",
    target_address="A/slow_messages/instance",
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
        "slow_messages": slow_messages
    },
    initial_messages={
        0: [initial_message]
    }
)
if __name__ == "__main__":
    api = API(simulator=simulator)
