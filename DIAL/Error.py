
class Error:
    msg: str

    def __init__(self, msg: str):
        self.msg = msg


def guard(err: Error) -> bool:
    if err is None:
        return True
    print("\033[91m {}\033[00m".format(err.msg))
    exit(1)