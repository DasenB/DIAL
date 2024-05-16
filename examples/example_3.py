from DIAL import Message, State, DefaultTopologies, DefaultColors, Simulator, send, API, ReadOnlyDict, send_to_self, \
    Address
from example_2 import ring_election_algorithm


# Goal: Understand use of hooks to modify existing algorithms

def token_exclusion_algorithm(state: State, message: Message) -> None:
    # PURPLE => Node has exclusive access to a resource
    # WHITE => Node has no access to the exclusive resource
    def next_neighbor() -> str:
        neighbors = state.neighbors.copy()
        if state.address.node_name in neighbors:
            neighbors.remove(state.address.node_name)
        if state.data["received_token_from"] in neighbors:
            neighbors.remove(state.data["received_token_from"])
        return neighbors[0]

    m = message.copy()
    m.color = DefaultColors.PURPLE
    m.source_address = state.address.copy()

    if state.color == DefaultColors.WHITE:
        state.color = DefaultColors.PURPLE
        state.data["has_token"] = True
        state.data["received_token_from"] = message.source_address.node_name
        m.target_address = state.address.copy()
        send_to_self(m, 6)
        return
    if state.color == DefaultColors.PURPLE:
        state.color = DefaultColors.WHITE
        state.data["has_token"] = False
        m.target_address = state.address.copy(node=next_neighbor())
        send(m)
        return


def modify_election_hook(state: State, message: Message, messages: list[Message]) -> None:
    if state.address.algorithm != "election":
        return
    for message in messages:
        if message.target_address.algorithm == "flooding":
            message.target_address.algorithm = "exclusion"


initial_message_1 = Message(
    source_address="A/initiator_algorithm/initiator_instance",
    target_address="B/election/instance"
)

simulator = Simulator(
    topology=DefaultTopologies.RING_BIDIRECTIONAL,
    algorithms={
        "election": ring_election_algorithm,
        "exclusion": token_exclusion_algorithm
    },
    condition_hooks=[modify_election_hook],
    initial_messages={
        0: [initial_message_1],
    }
)

if __name__ == "__main__":
    api = API(simulator=simulator)
