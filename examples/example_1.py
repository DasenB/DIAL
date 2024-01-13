from DIAL import Message, State, DefaultTopologies, DefaultColors, Simulator, send, API, ReadOnlyDict


# Step 1: Implementing an algorithm
# Create a function with the following signature: (state: State, message: Message, time: int, local_states: ReadOnlyDict) -> None:
def flooding_algorithm(state: State, message: Message, time: int, local_states: ReadOnlyDict) -> None:
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
