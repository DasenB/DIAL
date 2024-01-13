from DIAL import Message, State, DefaultTopologies, DefaultColors, Simulator, send, API, ReadOnlyDict, send_to_self

def election_ring(state: State, message: Message, time: int, local_states: ReadOnlyDict) -> None:
    # BLUE  => Node stil has hopes to win the election
    # RED   => Node knows it has lost the election
    # GREEN => Node knows it has won the election

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
        finished = Message(source_address=state.address.copy(), target_address=state.address.copy(), color=DefaultColors.PINK)
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


def election_finished_hook(state: State, messages: list[Message], time: int, local_states: ReadOnlyDict) -> None:
    if state.address.algorithm != "election":
        return
    if len(messages) != 1:
        return
    if messages[0].color != DefaultColors.PINK:
        return
    print("Election finished. Initialize exclusion token..")
    m = Message(source_address=state.address.copy(), target_address=state.address.copy(algorithm="exclusion"), color=DefaultColors.ORANGE)
    send_to_self(m, 10)

def token_exclusion(state: State, message: Message, time: int, local_states: ReadOnlyDict) -> None:
    pass

initial_message_1 = Message(
    source_address="A/initiator_algorithm/initiator_instance",
    target_address="B/election/instance"
)

initial_message_2 = Message(
    source_address="M/initiator_algorithm/initiator_instance",
    target_address="N/election/instance"
)

simulator = Simulator(
    topology = DefaultTopologies.RING_UNIDIRECTIONAL,
    algorithms = {
        "election": election_ring,
        "exclusion": token_exclusion
    },
    condition_hooks=[election_finished_hook],
    initial_messages={
        0: [initial_message_1],
        40: [initial_message_2]
    }
)

api = API(simulator=simulator, verbose=True)
