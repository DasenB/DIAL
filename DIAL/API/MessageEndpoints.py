from DIAL.Message import Message, MessageParser
from DIAL.Error import Error
from DIAL.Topology import EdgeConfig
from flask import request

class MessageEndpoints:
    api: any

    def __init__(self, api: any):
        self.api = api

    def get_messages(self):
        messages: dict[int, list[Message]] = {}
        for t in sorted(list(self.api.simulator.messages.keys())):
            messages[int(t)] = [msg.summary() for msg in self.api.simulator.messages[t]]
        response_data = {
            "time": self.api.simulator.time,
            "theta": self.api.simulator.theta,
            "messages": messages
        }
        return self.api.response(status=200, response=response_data)

    def get_message(self, message_id: str):
        message = self.api.simulator.get_message(message_id)
        if message is None:
            return self.api.response(status=404, response=f'No message with ID "{message_id}"')
        return self.api.response(status=200, response=message.to_json())

    def del_message(self, message_id: str):
        message = self.api.simulator.get_message(message_id)
        if message is None:
            return self.api.response(status=404, response=f'No message with ID "{message_id}"')
        # Remove reference from parent message
        if message._parent_message is not None:
            parent = self.api.simulator.get_message(message._parent_message)
            if parent is not None:
                parent._child_messages.remove(message._id)
        # Remove reference from child messages
        for child_id in message._child_messages:
            child = self.api.simulator.get_message(child_id)
            if child is not None:
                child._parent_message = None
        # Modify the arrival theta of all messages with the same time
        time = message._arrival_time
        theta = message._arrival_time
        if len(self.api.simulator.messages[time]) > theta + 1:
            for n in range(0, len(self.api.simulator.messages[time])):
                msg = self.api.simulator.messages[time][n]
                if msg._arrival_theta > theta:
                    msg._arrival_theta -= 1
        # Remove the message from the simulator
        self.api.simulator.messages[time].remove(message)
        if len(self.api.simulator.messages[time]) == 0:
            del self.api.simulator.messages[time]
        return self.api.response(status=200, response=f'OK')

    def add_message(self):
        message_parser = MessageParser(self.api.simulator, generate_missing_id=True)
        message = message_parser.parse_message(request.get_json())
        if isinstance(message, Error):
            return self.api.response(status=400, response=message.message)
        if message._arrival_time in self.api.simulator.messages.keys():
            if message._arrival_theta < len(self.api.simulator.messages[message._arrival_time]):
                return self.api.response(status=400, response="Invalid theta for provided arrival_time")
        if message._arrival_time not in self.api.simulator.messages.keys():
            if message._arrival_theta != 0:
                return self.api.response(status=400, response="Invalid theta for provided arrival_time")
        if message._is_self_message:
            self.api.simulator.insert_self_message_to_queue(message)
        else:
            edge_config: EdgeConfig | None = self.api.simulator.topology.get_edge_config(
                message.source_address.node_name,
                message.target_address.node_name)
            if edge_config is None:
                return self.api.response(status=400,
                                         response="No edge exists between nodes in message.source and message.target")
            self.api.simulator.insert_message_to_queue(message, time=message._arrival_time)
        return self.api.response(status=200, response=f'OK')

    def put_message(self, message_id: str):
        old_message = self.api.simulator.get_message(message_id)
        if old_message is None:
            return self.api.response(status=404, response=f'No message with ID "{message_id}"')
        json: dict[str, any] = request.get_json()
        for key in json.keys():
            if key not in list(old_message.summary().keys()) + ["data"]:
                return self.api.response(status=300, response=f'Invalid attribute message.{key}')

        message_parser = MessageParser(simulator=self.api.simulator, generate_missing_id=False)
        new_message = message_parser.parse_message(json)
        if isinstance(new_message, Error):
            return self.api.response(status=400, response=new_message.message)

        if old_message._id != new_message._id:
            return self.api.response(status=400, response="Changing message.id is not permitted.")

        if old_message._child_messages != new_message._child_messages:
            return self.api.response(status=400, response="Manually changing message.children is not permitted.")

        if old_message._parent_message != new_message._parent_message:
            return self.api.response(status=400, response="Manually changing message.parent is not permitted.")

        if new_message._arrival_time != old_message._arrival_time or new_message._arrival_theta != old_message._arrival_theta:
            response = self.api.control_endpoint.get_reschedule(message_id, new_message._arrival_time, new_message._arrival_theta)
            if response.status != "200 OK":
                return response

        old_message.title = new_message.title
        old_message.color = new_message.color
        old_message.target_address = new_message.target_address
        old_message.source_address = new_message.source_address
        for key in list(old_message.data.keys()):
            del old_message.data[key]
        old_message.data |= new_message.data

        old_message._is_lost = new_message._is_lost
        old_message._is_self_message = new_message._is_self_message
        old_message._self_message_delay = new_message._self_message_delay
        old_message._arrival_time = new_message._arrival_time
        old_message._arrival_theta = new_message._arrival_theta
        old_message._creation_time = new_message._creation_time
        old_message._creation_theta = new_message._creation_theta

        return self.api.response(status=200, response=old_message.to_json())
