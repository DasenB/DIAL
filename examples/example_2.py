from DIAL import Message, State, DefaultTopologies, DefaultColors, Simulator, send, API

def election_ring(state: State, message: Message, time: int):
    # BLUE  => Node stil has hopes to win the election
    # RED   => Node knows it has lost the election
    # GREEN => Node knows it has won the election

    if state.color == DefaultColors.WHITE:
        state.data["successor"] = state.neighbors[0]
        if message.source_address.node_name in state.neighbors:
            neighbors_without_predecessor = state.neighbors.copy()
            neighbors_without_predecessor.remove(message.source_address.node_name)
            state.data["successor"] = neighbors_without_predecessor[0]

        random_value = int(state.random_number_generator.integers(low=0, high=10000))
        state.data["value"] = random_value
        state.data["leader"] = state.address.node_name
        state.color = DefaultColors.BLUE

    m = Message(source_address=state.address, target_address=state.address.copy(node=state.data["successor"]))

    if "value" in message.data.keys() and "leader" in message.data.keys():
        if message.data["leader"] == state.address.node_name:
            state.color = DefaultColors.GREEN
            m.color = DefaultColors.YELLOW
            if message.color == DefaultColors.YELLOW:
                return
        elif message.data["value"] >= state.data["value"]:
            state.color = DefaultColors.RED
            state.data["value"] = message.data["value"]
            state.data["leader"] = message.data["leader"]

    if message.color == DefaultColors.YELLOW and state.color != DefaultColors.GREEN:
        state.color = DefaultColors.YELLOW
        m.color = DefaultColors.YELLOW

    m.data["leader"] = state.data["leader"]
    m.data["value"] = state.data["value"]
    send(m)


initial_message = Message(
    source_address="A/initiator_algorithm/initiator_instance",
    target_address="B/election/instance1"
)

simulator = Simulator(
    topology = DefaultTopologies.RING_UNIDIRECTIONAL,
    algorithms = {
        "election": election_ring
    },
    initial_messages={
        0: [initial_message]
    }
)

api = API(simulator=simulator, verbose=True)
