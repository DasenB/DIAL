from DIAL import *
from echo import echo_algorithm, initial_message

def extend_echo_hook(state: State, message: Message, messages: list[Message]) -> None:
    if "children" not in state.data.keys():
        state.data["children"] = []
    source_node = message.source_address.node_name
    msg_from_self = source_node == state.address.node_name
    if message.color == DefaultColors.GREEN and not msg_from_self:
        state.data["children"].append(source_node)
    if len(messages) == 1 and messages[0].color == DefaultColors.GREEN:
        state.data["parent"] = messages[0].target_address.node_name

simulator = Simulator(
    topology=DefaultTopologies.EXAMPLE_NETWORK_4,
    algorithms={"echo": echo_algorithm},
    condition_hooks=[extend_echo_hook],
    initial_messages={1: [initial_message]}
)

if __name__ == "__main__":
    api = API(simulator=simulator, open_browser=False)
