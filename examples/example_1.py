from DIAL import *

# Goal:
# Understand how to create a distributed algorithm and run it on a network of nodes


# Step 1: Implementing an algorithm
# Create a function with the following signature: (state: State, message: Message) -> None:
def flooding_algorithm(state: State, message: Message) -> None:
    if state.color == message.color:
        return
    state.color = message.color
    for neighbor in state.neighbors:
        if neighbor == state.address.node_name:
            continue
        m = message.copy()
        m.source_address = state.address
        m.target_address = state.address.copy(node=neighbor)
        send(m)


# Step 2: Create one or more initial messages
initial_message_1 = Message(
    source_address="E/any_other_algorithm/initiator_instance",
    target_address="B/flooding/red_flooding_instance",
    color=DefaultColors.RED,
    title="First Flooding Instance"
)
initial_message_2 = Message(
    source_address="G/yet_another_algorithm/some_instance",
    target_address="F/flooding/blue_flooding_instance",
    color=DefaultColors.BLUE,
    title="Second Flooding Instance"
)
conflicting_message = Message(
    source_address="A/flooding/red_flooding_instance",
    target_address="C/flooding/red_flooding_instance",
    color=DefaultColors.PINK,
    title="Conflicting Message"
)
conflicting_message._is_lost = True

# Step 3: Define a topology
edge_config = EdgeConfig(DefaultSchedulers.LOCAL_FIFO, EdgeDirection.BIDIRECTIONAL, reliability=1.0)
nodes = ["A", "B", "C", "D", "E", "F", "G", "H"]
edges = [
    ("A", "C", edge_config),
    ("B", "C", edge_config),
    ("D", "B", edge_config),
    ("E", "B", edge_config),
    ("F", "G", edge_config),
    ("G", "H", edge_config),
    ("A", "G", edge_config)
]
topology = Topology(nodes, edges, all_nodes_have_loops=True)

# Step 4: Create the simulator with the previously defined parameters
simulator = Simulator(
    topology=topology,
    algorithms={
        "flooding": flooding_algorithm
    },
    initial_messages={
        2: [initial_message_1],
        20: [initial_message_2],
        9: [conflicting_message]
    }
)

# Step 5: Run the webinterface
if __name__ == "__main__":
    api = API(simulator=simulator)
