from DIAL import *
from echo import echo_algorithm, initial_message
from spanning_tree import modify_election_hook

def election_algorithm(state: State, message: Message) -> None:
    echo_address = state.address.copy(algorithm="echo", instance="instance")
    echo_state = get_local_states()[echo_address]
    parent, children = echo_state.data["parent"], echo_state.data["children"]
    neighbors = ({parent} | set(children)) - {state.address.node_name}
    other_neighbors = list(neighbors - {message.source_address.node_name})
    dc = DefaultColors


    def expand():
        state.color = DefaultColors.ORANGE
        expand_msg = message.copy(source=state.address, color=dc.ORANGE)
        is_root_node = parent == state.address.node_name
        is_child_node = len(children) == 0
        if len(set(children) - {message.source_address.node_name}) > 0:
            for n in other_neighbors:
                neighbor_address = state.address.copy(node=n)
                send(expand_msg.copy(target=neighbor_address))
        elif not is_root_node or is_child_node:
            contract()

    def contract():
        state.color = DefaultColors.DARK_GREEN
        contraction_msg = message.copy(source=state.address, color=dc.DARK_GREEN)
        contraction_msg.target_address = state.address.copy(node=parent)
        if "candidates" not in state.data.keys():
            state.data["candidates"] = []
        if message.color == DefaultColors.DARK_GREEN:
            state.data["candidates"].append(message.data["id"])
        if len(state.data["candidates"]) != len(children):
            return

        is_root_node = parent == state.address.node_name
        best_id = max(state.data["candidates"] + [state.address.node_name])
        if not is_root_node:
            contraction_msg.data["id"] = best_id
            send(contraction_msg)
        else:
            state.data["winner"] = best_id
            inform()

    def inform():
        is_root_node = parent == state.address.node_name
        if not is_root_node:
            state.data["winner"] = message.data["winner"]
        is_winner = state.data["winner"] == state.address.node_name
        state.color = DefaultColors.PINK if is_winner else DefaultColors.BLUE
        info_msg = message.copy(source=state.address, color=dc.BLUE)
        info_msg.data["winner"] = state.data["winner"]
        for n in children:
            send(info_msg.copy(target=state.address.copy(node=n)))

    sc = state.color
    if message.color == dc.ORANGE and state.color == dc.WHITE:
        expand()
    if message.color == dc.DARK_GREEN and (sc == dc.ORANGE or sc == dc.DARK_GREEN):
        contract()
    if message.color == dc.BLUE and state.color == dc.DARK_GREEN:
        inform()


election_initial_message = Message(
    source_address="B/election/instance",
    target_address="B/election/instance",
    color=DefaultColors.ORANGE
)

simulator = Simulator(
    topology=DefaultTopologies.EXAMPLE_NETWORK_4,
    algorithms={
        "echo": echo_algorithm,
        "election": election_algorithm
    },
    condition_hooks=[modify_election_hook],
    initial_messages={
        1: [initial_message],
        50: [election_initial_message]
    }
)

if __name__ == "__main__":
    api = API(simulator=simulator, open_browser=False)
