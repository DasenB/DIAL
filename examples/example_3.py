from DIAL import Message, State, DefaultTopologies, DefaultColors, Simulator, send, API, ReadOnlyDict, send_to_self
from example_2 import token_exclusion_algorithm, ring_election_algorithm

# Goal: Understand hooks and local states

def ping_pong_algorithm(state: State, message: Message, time: int, local_states: ReadOnlyDict) -> None:
    m1 = message.copy()
    m1.source_address = state.address.copy()
    m1.target_address = state.address.copy()

    m2 = message.copy()
    m2.source_address = state.address.copy()



def snapshot_algorithm(state: State, message: Message, time: int, local_states: ReadOnlyDict) -> None:
    # Make snapshot of "ping_pong_algorithm"
    pass


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
        "election": ring_election_algorithm,
        "exclusion": token_exclusion_algorithm,
        "ping_pong": ping_pong_algorithm,
        "snapshot": snapshot_algorithm
    },
    condition_hooks=[election_finished_hook],
    initial_messages={
        0: [initial_message_1],
        40: [initial_message_2]
    }
)

api = API(simulator=simulator)
