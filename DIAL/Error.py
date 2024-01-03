class Error:
    message: str
    status: int | None

    def __init__(self, message: str):
        self.message = message
        self.status = None
