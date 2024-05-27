from DIAL import *

def actions(state: State, message: Message) -> None:
    if state.color == DefaultColors.PINK:
        state.color = DefaultColors.YELLOW
    else:
        state.color = DefaultColors.PINK
    cnt = 0
    for x in range(1_000_000):
        cnt += 1
    send_to_self(message, 1)


initial_message = Message(
    source_address="A/actions/instance",
    target_address="A/actions/instance",
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
        "actions": actions
    },
    initial_messages={
        0: [initial_message]
    }
)
if __name__ == "__main__":
    api = API(simulator=simulator, open_browser=False)
