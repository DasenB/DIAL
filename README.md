# DIAL
DIAL is a framework for implementing and simulating distributed algorithms in Python.

## TODO
- Release Packet
- Readme Documentation

## Functions

## 
To implement an algorithm you have to create a function the signature (node: State, message: Message, time: int) -> None
This algorithm-function is later passed to the simulator which will then call it every time a node receives a message that is
addressed to the algorithm.

Because the behaviour of the simulator should be deterministic there are some restrictions on what you can do within
an algorithm-function. To prevent you from accidentally breaking te determinism the scope within the function is
limited. Only the following objects defined outside your algorithm can be accessed:

- ALL python builtins (print, dict, range, min, max, ...)
- SOME objects from the DIAL package 
  - Color             (Representation of colors in RGB)
  - DefaultColors     (Enum with predefined colors)
  - Message           (Representation of a message that can be sent from one node to another) 
  - Address           (An address is a reference to an instance of an algorithm on a node)
  - State             (A State-object acts as the scope of an algorithm instance and is the only place where data persists between multiple calls of an instance)
  - send              (Function to send messages between nodes. Can only send messages between nodes if a corresponding edge exists in the topology)
  - send_to_self      (Function to schedule a message to be received on the same node after a specified delay)


### Send
- Can only send messages to nodes to which an edge within the topology exsists

### Send_To_Self
- Can always send to the current node even if no self-edge exists in the topology

## License
Dieses Projekt steht unter der Creative Commons BY-NC-ND 3.0 DE Lizenz.
Unter https://creativecommons.org/licenses/by-nc-nd/3.0/de/legalcode ist die Lizenz einsehbar.
Eine Kopie dieser Lizenz ist diesem Projekt beigefügt.
Unter https://creativecommons.org/licenses/by-nc-nd/3.0/de/ ist eine einfache Zusammenfassung der Lizenz einsehbar. 
