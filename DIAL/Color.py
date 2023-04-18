class Color:
    red: int
    green: int
    blue: int

    def __init__(self, r=255, g=255, b=255):
        self.red = r
        self.green = g
        self.blue = b

    def __repr__(self):
        r_str = "%2X" % self.red
        g_str = "%2X" % self.green
        b_str = "%2X" % self.blue
        return "#" + r_str + g_str + b_str