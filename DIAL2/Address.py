

class Address:
    node: str
    algorithm: str
    instance: str

    def __init__(self, node: str, algorithm: str, instance: str):
        self.node = node
        self.algorithm = algorithm
        self.instance = instance

    def copy(self, node: str = None, algorithm: str = None, instance: str = None):
        if node is None:
            node = self.node
        if algorithm is None:
            algorithm = self.algorithm
        if instance is None:
            instance = self.instance
        return Address(node, algorithm, instance)

    def __repr__(self):
        return f"{self.node}/{self.algorithm}/{self.instance}"

    def __eq__(self, other) -> bool:
        if other.__class__.__name__ != "Address":
            return False
        if self.node != other.node:
            return False
        if self.algorithm != other.algorithm:
            return False
        if self.instance != other.instance:
            return False
        return True

    def __hash__(self):
        return hash(str(self))