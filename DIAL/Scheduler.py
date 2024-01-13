from enum import Enum
from typing import Tuple, Callable
from DIAL.Message import Message
import numpy



Scheduler = Callable[
    [any, int, int, dict[int, list[Message]], Message, numpy.random.Generator],
    int
] # (Topology, time, theta, messageQueue, message, RNG) -> (time)


def local_fifo_scheduler(
        topology: any,
        time: int,
        theta: int,
        message_queue: dict[int, list[Message]],
        message: Message,
        random_number_generator: numpy.random.Generator
) -> int:
    if topology.__class__.__name__ != "Topology":
        print("Argument of topology must be of type 'Topology'")
        exit(1)
    min_valid_time: int = 0
    if time is not None:
        min_valid_time = time + 1
    else:
        return 0
    for time_index in message_queue.keys():
        if time_index < time:
            continue
        for theta_index in range(0, len(message_queue[time_index])):
            if time_index == time and theta_index <= theta:
                continue
            selected_message = message_queue[time_index][theta_index]
            if selected_message.source_address.node_name == message.source_address.node_name and selected_message.target_address.node_name == message.target_address.node_name:
                min_valid_time = time_index + 1
    insert_time = random_number_generator.integers(min_valid_time, min_valid_time + 10)
    return insert_time

def global_fifo_scheduler(
        topology: any,
        time: int,
        theta: int,
        message_queue: dict[int, list[Message]],
        message: Message,
        random_number_generator: numpy.random.Generator
) -> int:
    if topology.__class__.__name__ != "Topology":
        print("Argument of topology must be of type 'Topology'")
        exit(1)
    return max(message_queue.keys()) + 1

def random_scheduler(
        topology: any,
        time: int,
        theta: int,
        message_queue: dict[int, list[Message]],
        message: Message,
        random_number_generator: numpy.random.Generator
) -> int:
    if topology.__class__.__name__ != "Topology":
        print("Argument of topology must be of type 'Topology'")
        exit(1)
    insert_time = random_number_generator.integers(low=time + 1, high=time + 11)
    return insert_time

class DefaultScheduler(Enum):
    LOCAL_FIFO = local_fifo_scheduler
    RANDOM = random_scheduler
    GLOBAL_FIFO = global_fifo_scheduler

