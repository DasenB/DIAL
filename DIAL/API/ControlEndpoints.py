import copy
import sys
from DIAL.Message import Message


class ControlEndpoints:
    api: any

    def __init__(self, api: any):
        self.api = api

    def get_reset(self):
        self.api.simulator = copy.deepcopy(self.api.initial_simulator)
        return self.api.response(status=200, response="OK")

    def get_reschedule(self, message_id: str, time_str: str, theta_str: str):
        message: Message = self.api.simulator.get_message(message_id)
        if message is None:
            return self.api.response(status=404, response=f'No message with ID "{message_id}"')
        original_time: int = message._arrival_time
        original_theta: int = message._arrival_theta
        time: int = None
        theta: int = None
        try:
            if time_str == "_":
                time = int(original_time)
            else:
                time = int(time_str)
        except ValueError:
            return self.api.response(status=300, response="Failed to parse time")
        try:
            if theta_str == "_":
                theta = int(original_theta)
            else:
                theta = int(theta_str)
        except ValueError:
            return self.api.response(status=300, response="Failed to parse theta")

        if self.api.simulator.time is not None or self.api.simulator.theta is not None:
            # Only messages that have not been received can be changed
            if original_time < self.api.simulator.time or (
                    original_time == self.api.simulator.time and original_theta < self.api.simulator.theta):
                return self.api.response(status=300,
                                         response="Can not reschedule messages that already have been received.")
            # Can not move a message into the past
            if time < self.api.simulator.time or (
                    time == self.api.simulator.time and theta <= self.api.simulator.theta):
                return self.api.response(status=300, response="Can not reschedule a message into the past")
        # Cannot move a message to a time before it was created
        if time < message._creation_time or (time == message._creation_time and theta <= message._creation_theta):
            return self.api.response(status=300,
                                     response="Can not reschedule a message to a time before it was created.")
        # A message can not be rescheduled to a time before it was created
        parent_arrival_time: int = -sys.maxsize
        parent_arrival_theta: int = -sys.maxsize
        if message._parent_message is not None:
            parent = self.api.simulator.get_message(message._parent_message)
            if parent is not None:
                parent_arrival_time = parent._arrival_time
                parent_arrival_theta = parent._arrival_theta
        if time < parent_arrival_time or (time == parent_arrival_time and theta <= parent_arrival_theta):
            return self.api.response(status=300,
                                     response="Can not reschedule messages to a time before its parent message has been received.")
        # A message can not be inserted with a theta greater than the length of the list at the given time
        if time not in self.api.simulator.messages.keys() and theta != 0:
            return self.api.response(status=300, response=f'Theta is out of range for time={time}')
        if time in self.api.simulator.messages.keys() and theta > len(self.api.simulator.messages[time]):
            return self.api.response(status=300, response=f'Theta is out of range for time={time}')
        # Remove the message from its old place
        for index in range(original_theta + 1, len(self.api.simulator.messages[original_time])):
            self.api.simulator.messages[original_time][index]._arrival_theta -= 1
        self.api.simulator.messages[original_time].remove(message)
        if len(self.api.simulator.messages[original_time]) == 0:
            del self.api.simulator.messages[original_time]
        # Insert the message into its new place
        if time not in self.api.simulator.messages.keys():
            self.api.simulator.messages[time] = []
        self.api.simulator.messages[time].insert(theta, message)
        message._arrival_time = time
        message._arrival_theta = theta
        for index in range(theta + 1, len(self.api.simulator.messages[time])):
            self.api.simulator.messages[time][index]._arrival_theta += 1
        return self.api.response(status=200, response=f'OK')

    def get_step_forward(self, steps_str: str):
        steps: int = None
        try:
            steps = int(steps_str)
        except ValueError:
            return self.api.response(status=300, response="Failed to parse steps")

        result: dict[str, any] = {
            "time": self.api.simulator.time,
            "theta": self.api.simulator.theta,
            "steps": int(0),
            "actions": [],
        }

        for i in range(0, steps):
            action = self.api.simulator.step_forward(verbose=False)
            if action is None:
                return self.api.response(status=200, response=result)
            else:
                result["time"] = int(self.api.simulator.time)
                result["theta"] = int(self.api.simulator.theta)
                result["steps"] = int(result["steps"] + 1)
                result["actions"].append(action)
        return self.api.response(status=200, response=result)

    def get_step_backward(self, steps_str: str):
        steps: int = None
        try:
            steps = int(steps_str)
        except ValueError:
            return self.api.response(status=300, response="Failed to parse steps")

        result: dict[str, any] = {
            "time": str(self.api.simulator.time),
            "theta": str(self.api.simulator.theta),
            "steps": int(0),
            "actions": [],
        }

        for i in range(0, steps):
            action = self.api.simulator.step_backward(verbose=False)
            if action is None:
                return self.api.response(status=200, response=result)
            else:
                result["time"] = str(self.api.simulator.time)
                result["theta"] = str(self.api.simulator.theta)
                result["steps"] = int(result["steps"] + 1)
                result["actions"].append(action)
        return self.api.response(status=200, response=result)

    def get_time_forward(self, time_str: str):
        time: int = None
        try:
            time = int(time_str)
        except ValueError:
            return self.api.response(status=300, response="Failed to parse steps")

        result: dict[str, any] = {
            "time": self.api.simulator.time,
            "theta": self.api.simulator.theta,
            "steps": int(0),
            "actions": [],
        }

        if self.api.simulator.time is None:
            action = self.api.simulator.step_forward(verbose=False)
            if action is None:
                return self.api.response(status=200, response=result)
            else:
                result["time"] = int(self.api.simulator.time)
                result["theta"] = int(self.api.simulator.theta)
                result["steps"] = int(result["steps"] + 1)
                result["actions"].append(action)

        minimum_target_time = self.api.simulator.time + time

        while self.api.simulator.time < minimum_target_time:
            action = self.api.simulator.step_forward(verbose=False)
            if action is None:
                return self.api.response(status=200, response=result)
            else:
                result["time"] = int(self.api.simulator.time)
                result["theta"] = int(self.api.simulator.theta)
                result["steps"] = int(result["steps"] + 1)
                result["actions"].append(action)
        return self.api.response(status=200, response=result)

    def get_time_backward(self, time_str: str):
        time: int = None
        try:
            time = int(time_str)
        except ValueError:
            return self.api.response(status=300, response="Failed to parse steps")

        if self.api.simulator.time is None:
            return self.api.response(status=300, response="Can not move further back in time.")

        result: dict[str, any] = {
            "time": str(self.api.simulator.time),
            "theta": str(self.api.simulator.theta),
            "steps": int(0),
            "actions": [],
        }

        maximum_target_time = self.api.simulator.time - time

        while self.api.simulator.time > maximum_target_time:
            action = self.api.simulator.step_backward(verbose=False)
            if action is None:
                return self.api.response(status=200, response=result)
            else:
                result["time"] = str(self.api.simulator.time)
                result["theta"] = str(self.api.simulator.theta)
                result["steps"] = int(result["steps"] + 1)
                result["actions"].append(action)

                if self.api.simulator.time is None:
                    return self.api.response(status=200, response=result)

        return self.api.response(status=200, response=result)
