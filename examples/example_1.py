from DIAL import Message, State, DefaultTopologies, DefaultColors, Simulator, send, API


# Step 1: Implementing an algorithm
# Create a function with the following signature: (node: State, message: Message, time: int) -> None
def flooding_algorithm(node: State, message: Message, time: int) -> None:
    if node.color == message.color:
        return
    node.color = message.color
    for neighbor in node.neighbors:
        if neighbor == node.address.node_name:
            continue
        m = message.copy()
        m.source_address = node.address
        m.target_address = node.address.copy(node=neighbor)
        send(m)


# Step 2: Create one or more initial messages
initial_message_1 = Message(
    source_address="A/initiator_algorithm/initiator_instance",
    target_address="B/flooding/instance1",
    color=DefaultColors.RED
)
initial_message_2 = Message(
    source_address="A/initiator_algorithm/initiator_instance",
    target_address="B/flooding/instance2",
    color=DefaultColors.BLUE
)


# Step 3: Create the simulator
simulator = Simulator(
    topology = DefaultTopologies.EXAMPLE_NETWORK_3,
    algorithms = {
        "flooding": flooding_algorithm
    },
    initial_messages={
        0: [initial_message_1],
        20: [initial_message_2]
    }
)

# Step 4: Run the webinterface
api = API(simulator=simulator, verbose=True)
