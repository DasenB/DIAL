from DIAL import *

def burst_messages(state: State, message: Message) -> None:
    if message.color == DefaultColors.YELLOW:
        state.color = DefaultColors.YELLOW
        return

    count = 100
    send_to_self(message.copy(), count)
    state.color = DefaultColors.PINK
    msg = message.copy()
    msg.color = DefaultColors.YELLOW
    for i in range(count):
        send_to_self(msg.copy(), i)


initial_message = Message(
    source_address="A/burst_messages/instance",
    target_address="A/burst_messages/instance",
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
        "burst_messages": burst_messages
    },
    initial_messages={
        0: [initial_message]
    }
)
if __name__ == "__main__":
    api = API(simulator=simulator)
