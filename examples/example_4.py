from DIAL import State, Message, ReadOnlyDict, Address, send, DefaultColors, Color, Simulator, DefaultTopologies, API, send_to_self
from example_2 import ring_election_algorithm
from example_3 import token_exclusion_algorithm, modify_election_hook

# Goal: Understand use of local_states argument

def benchmark_algorithm(state: State, message: Message, time: int, local_states: ReadOnlyDict[Address, any]) -> None:
    def next_neighbor() -> str:
        neighbors = state.neighbors.copy()
        if state.address.node_name in neighbors:
            neighbors.remove(state.address.node_name)
        if message.source_address.node_name in neighbors:
            neighbors.remove(message.source_address.node_name)
        return neighbors[0]

    # Relay messages with a hop_count
    if "hop_count" in message.data.keys():
        if message.data["hop_count"] > 0:
            m = message.copy()
            m.data["hop_count"] -= 1
            m.target_address = Address(node_name=next_neighbor(), algorithm="benchmark", instance="instance")
            m.source_address.node_name = state.address.node_name
            send(m)

    # Generate new messages if node has the token
    exclusion_instance_address = state.address.copy(algorithm="exclusion")
    if not exclusion_instance_address in local_states.keys():
        return
    if local_states[exclusion_instance_address].data["has_token"] and state.color == DefaultColors.WHITE:
        state.color = DefaultColors.RED
        for i in range(0, 2):
            random_value = state.random_number_generator.integers(0, 255)
            m1 = Message(
                source_address=state.address.copy(),
                target_address=state.address.copy(node=next_neighbor()),
                color=Color(r=34, g=0, b=random_value)
            )
            m2 = Message(
                source_address=state.address.copy(),
                target_address=state.address.copy(node=message.source_address.node_name),
                color=Color(r=34, g=random_value, b=0)
            )
            m1.data = {"hop_count": i + 26}
            m2.data = {"hop_count": i + 26}
            send(m1)
            send(m2)
    if not local_states[exclusion_instance_address].data["has_token"]:
        state.color = DefaultColors.WHITE

def start_benchmark_hook(state: State, messages: list[Message], time: int, local_states: ReadOnlyDict[Address, any]) -> None:
    if state.address.algorithm != "election":
        return
    for message in messages:
        if message.target_address.algorithm == "flooding":
            m = Message(target_address=state.address.copy(algorithm="benchmark"), source_address=state.address, color=DefaultColors.GRAY)
            send_to_self(message=m, delay=7)


initial_message_1 = Message(
    source_address="A/initiator_algorithm/initiator_instance",
    target_address="B/election/instance"
)


simulator = Simulator(
    topology = DefaultTopologies.RING_BIDIRECTIONAL,
    algorithms = {
        "election": ring_election_algorithm,
        "exclusion": token_exclusion_algorithm,
        "benchmark": benchmark_algorithm
    },
    condition_hooks=[start_benchmark_hook, modify_election_hook],
    initial_messages={
        0: [initial_message_1],
    }
)

if __name__ == "__main__":
    api = API(simulator=simulator)
