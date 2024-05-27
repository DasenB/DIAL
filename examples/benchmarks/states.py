from DIAL import *

def infinite_states(state: State, message: Message) -> None:
    state.color = DefaultColors.PINK
    msg = message.copy()
    instance_addr = int(msg.target_address.instance)
    msg.target_address.instance = str(instance_addr + 1)
    send_to_self(msg, 1)


initial_message = Message(
    source_address="A/infinite_states/instance",
    target_address="A/infinite_states/0",
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
        "infinite_states": infinite_states
    },
    initial_messages={
        0: [initial_message]
    }
)
if __name__ == "__main__":
    api = API(simulator=simulator, open_browser=False)
