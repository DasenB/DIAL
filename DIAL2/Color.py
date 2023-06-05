from enum import Enum


class Color:
    red: int
    green: int
    blue: int

    def __init__(self, r=255, g=255, b=255):
        self.red = r
        self.green = g
        self.blue = b

    def __repr__(self) -> str:
        r_str = "%2X" % self.red
        g_str = "%2X" % self.green
        b_str = "%2X" % self.blue
        return "#" + r_str + g_str + b_str

    def __eq__(self, other) -> bool:
        if self.red != other.red:
            return False
        if self.green != other.green:
            return False
        if self.blue != other.blue:
            return False
        return True


class Colors(Enum):
    RED = Color(255, 0, 0)
    GREEN = Color(0, 255, 0)
    BLUE = Color(0, 0, 255)
    PURPLE = Color(186, 3, 252)
    ORANGE = Color(252, 173, 3)
    YELLOW = Color(248, 252, 3)
    PINK = Color(252, 3, 244)
    BLACK = Color(0, 0, 0)
    WHITE = Color(255, 255, 255)

