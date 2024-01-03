
class TopologyEndpoints:
    api: any

    def __init__(self, api: any):
        self.api = api

    def get_topology(self):
        topology: dict[str, any] = {
            "nodes": self.api.simulator.topology.nodes,
            "edges": [[edge[0], edge[1]] for edge in self.api.simulator.topology.edges]
        }
        return self.api.response(status=200, response=topology)

