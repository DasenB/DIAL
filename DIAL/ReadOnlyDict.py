# Credit: Marcin Raczyński
# https://stackoverflow.com/a/31049908

def _readonly(self, *args, **kwargs):
    raise RuntimeError("Cannot modify ReadOnlyDict")

class ReadOnlyDict(dict):
    __setitem__ = _readonly
    __delitem__ = _readonly
    pop = _readonly
    popitem = _readonly
    clear = _readonly
    update = _readonly
    setdefault = _readonly