# DIAL
DIAL is a framework for implementing and simulating distributed algorithms in Python.

## Requirements
- [x] Possibility to use predefined topologies as well as custom topologies
- [x] Possibility to run the simulation backwards
- [ ] Multiple statistics and views that display the state of the system
- [ ] Visualisation of message transfers
- [ ] Possibility to interactively modify the state of the system (add, remove and modify messages)
- [x] Support for running multiple algorithms at the same time or after another
- [x] Support for algorithm composition
- [ ] Optional: Statistics View
- [ ] Optional: Time-Flow View (useful for algorithm termination)

## Functions

### Send
- Can only send messages to nodes to which an edge within the topology exsists

### Send_To_Self
- Can always send to the current node even if no self-edge exists in the topology

## License
Dieses Projekt steht unter der Creative Commons BY-NC-ND 3.0 DE Lizenz.
Unter https://creativecommons.org/licenses/by-nc-nd/3.0/de/legalcode ist die Lizenz einsehbar.
Eine Kopie dieser Lizenz ist diesem Projekt beigefügt.
Unter https://creativecommons.org/licenses/by-nc-nd/3.0/de/ ist eine einfache Zusammenfassung der Lizenz einsehbar. 
