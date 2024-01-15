from DIAL import Message, State, DefaultTopologies, DefaultColors, Simulator, send, API, ReadOnlyDict, send_to_self

# Goal: Understand composition, self_messages
def ring_election_algorithm(state: State, message: Message, time: int, local_states: ReadOnlyDict) -> None:
    # BLUE  => Node stil has hopes to win the election
    # RED   => Node knows it has lost the election
    # GREEN => Node knows it has won the election
    if "value" in state.data.keys() and "value" in message.data.keys():
        if state.color == DefaultColors.BLUE and message.data["value"] < state.data["value"]:
            return

    if state.color == DefaultColors.WHITE:
        neighbors = state.neighbors.copy()
        if message.source_address.node_name in neighbors:
            neighbors.remove(message.source_address.node_name)
        if state.address.node_name in neighbors:
            neighbors.remove(state.address.node_name)
        state.data["successor"] = neighbors[0]

        random_value = int(state.random_number_generator.integers(low=0, high=10000))
        state.data["value"] = random_value
        state.data["leader"] = state.address.node_name
        state.color = DefaultColors.BLUE

    if state.color == DefaultColors.DARK_GREEN:
        return

    if message.color == DefaultColors.YELLOW and state.color == DefaultColors.GREEN:
        state.color = DefaultColors.DARK_GREEN
        finished = Message(
            source_address=state.address.copy(),
            target_address=state.address.copy(algorithm="exclusion"),
            color=DefaultColors.ORANGE
        )
        send_to_self(finished, 5)
        return

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

def token_exclusion_algorithm(state: State, message: Message, time: int, local_states: ReadOnlyDict) -> None:
    # PURPLE => Node has exclusive access to a resource
    # WHITE => Node has no access to the exclusive resource
    m = message.copy()
    m.color = DefaultColors.PURPLE
    m.source_address = state.address.copy()

    if state.color == DefaultColors.WHITE:
        state.color = DefaultColors.PURPLE
        state.data["has_token"] = True
        state.data["received_token_from"] = message.source_address.node_name
        m.target_address = state.address.copy()
        send_to_self(m, 5)
        return
    if state.color == DefaultColors.PURPLE:
        state.color = DefaultColors.WHITE
        state.data["has_token"] = False
        neighbors = state.neighbors.copy()
        if state.data["received_token_from"] in neighbors:
            neighbors.remove(state.data["received_token_from"])
        if state.address.node_name in neighbors:
            neighbors.remove(state.address.node_name)
        successor = neighbors[0]
        m.target_address = state.address.copy(node=successor)
        send(m)
        return

initial_message_1 = Message(
    source_address="A/initiator_algorithm/initiator_instance",
    target_address="B/election/instance"
)

initial_message_2 = Message(
    source_address="M/initiator_algorithm/initiator_instance",
    target_address="N/election/instance"
)

simulator = Simulator(
    topology = DefaultTopologies.RING_BIDIRECTIONAL,
    algorithms = {
        "election": ring_election_algorithm,
        "exclusion": token_exclusion_algorithm
    },
    initial_messages={
        0: [initial_message_1],
        40: [initial_message_2]
    }
)

api = API(simulator=simulator)
