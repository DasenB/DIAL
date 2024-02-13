from DIAL import Message, State, DefaultTopologies, DefaultColors, Simulator, send, API, send_to_self
from example_1 import flooding_algorithm


# Goal: Understand composition, access to random values, self_messages
def ring_election_algorithm(state: State, message: Message) -> None:
    # BLUE  => Node stil has hopes to win the election
    # RED   => Node knows it has lost the election
    # GREEN => Node knows it has won the election

    def next_neighbor() -> str:
        neighbors = state.neighbors.copy()
        if state.address.node_name in neighbors:
            neighbors.remove(state.address.node_name)
        if message.source_address.node_name in neighbors:
            neighbors.remove(message.source_address.node_name)
        return neighbors[0]

    if "value" in state.data.keys() and "value" in message.data.keys():
        if state.color == DefaultColors.BLUE and message.data["value"] < state.data["value"]:
            return

    if state.color == DefaultColors.WHITE:
        state.data["successor"] = next_neighbor()
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
            target_address=state.address.copy(algorithm="flooding"),
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


initial_message_1 = Message(
    source_address="A/initiator_algorithm/initiator_instance",
    target_address="B/election/instance"
)

initial_message_2 = Message(
    source_address="M/initiator_algorithm/initiator_instance",
    target_address="N/election/instance"
)

simulator = Simulator(
    topology=DefaultTopologies.RING_BIDIRECTIONAL,
    algorithms={
        "election": ring_election_algorithm,
        "flooding": flooding_algorithm
    },
    initial_messages={
        0: [initial_message_1],
        40: [initial_message_2]
    }
)

if __name__ == "__main__":
    api = API(simulator=simulator)
