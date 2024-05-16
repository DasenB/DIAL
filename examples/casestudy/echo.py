from DIAL import *

def echo_algorithm(state: State, message: Message) -> None:
    if state.color == DefaultColors.WHITE:
        state.data["source"] = message.source_address
        state.color = DefaultColors.RED
        for neighbor in list(set(state.neighbors) - {state.data["source"].node_name}):
            neighbor_address = state.address.copy(node=neighbor)
            send(message.copy(source=state.address, target=neighbor_address))
    state.data["n"] = 1 if "n" not in state.data.keys() else state.data["n"] + 1
    if state.data["n"] == len(state.neighbors):
        echo = message.copy(source=state.address, target=state.data["source"])
        state.color, echo.color = DefaultColors.GREEN, DefaultColors.GREEN
        send(echo)

initial_message = Message(
    source_address="A/echo/instance",
    target_address="A/echo/instance",
    color=DefaultColors.RED
)

simulator = Simulator(
    topology=DefaultTopologies.EXAMPLE_NETWORK_4,
    algorithms={"echo": echo_algorithm},
    initial_messages={1: [initial_message]}
)

if __name__ == "__main__":
    api = API(simulator=simulator, open_browser=False)
