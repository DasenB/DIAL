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
        r_str = "%02X" % self.red
        g_str = "%02X" % self.green
        b_str = "%02X" % self.blue
        return "#" + r_str + g_str + b_str

    def __eq__(self, other) -> bool:
        if other.__class__.__name__ == "DefaultColors":
            other = other.value
        if self.red != other.red:
            return False
        if self.green != other.green:
            return False
        if self.blue != other.blue:
            return False
        return True

    @classmethod
    def from_string(cls, string: str):
        if not isinstance(string, str) :
            return None
        if len(string) != 7:
            return None
        string = string.lstrip("#")
        color_rgb = tuple(int(string[i:i + 2], 16) for i in (0, 2, 4))
        color = Color(r=color_rgb[0], g=color_rgb[1], b=color_rgb[2])
        return color

class DefaultColors(Enum):
    RED = Color(255, 0, 0)
    GREEN = Color(0, 255, 0)
    BLUE = Color(0, 0, 255)
    PURPLE = Color(186, 3, 252)
    ORANGE = Color(252, 173, 3)
    YELLOW = Color(248, 252, 3)
    PINK = Color(252, 3, 244)
    BLACK = Color(0, 0, 0)
    WHITE = Color(255, 255, 255)

