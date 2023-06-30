# DIAL
Framework for Distributed Algorithms in Python

## Mandatory Requirements
- [ ] Simulation of distributed algorithms
- [ ] It is possible to go back in time within the simulation
    - Option 1: Using a seed and count the number of steps to rerun to the desired position
    - Option 2: Save the state after every action
- [ ] Visualizing the state of the algorithm
- [ ] It should be possible to stop the simulation to get a console on the individual nodes to change its state

## Optional Requirements
- [ ] Multiple Algorithms can run on the network at the same time
- [ ] Allow execution on multiple physical machines

## Problems
- Running multiple algorithms on the same network at the same time
- How do individual nodes know their neighbors?

## Hard Problems
  - Subroutines: Calling child algorithm to use its result in the parent algorithm
  - Recreating previous states of the system if the user uses global variables outside DIALs control

## Change Requests
- (State, Message) -> State, [Message] ==> (Node, Message) -> void+
  - State => Node (Problematic, as a node has multiple states and the "State"-Object is more suitably named "AlgorithmState")
  - node => node_name
  - send(neighbor, message) # neighbor is not necessary as it is already provided in message.target
- t.add_edge Options
  - FIFO / Random
  - Reliable / Unreliable
  - Unidirectional / Bidirectional
  - Abstraktion für neue Link-Verhaltensoptionen
    - MessageQueue: add(edge, message)
- Filter: Es können conditions definiert werden, die nach jeder Action ausgeführt werden
  - Wird eine condition erfüllt, wird eine aktion ausgeführt, bevor die nächste reguläre aktion aus der Message-Queue ausgewählt wird
- Periodische Aktionen an nodes / SetTimeout and Redo
  - Einfach Nachrichten an sich selbst senden und bei empfang testen, ob ausreichend Zeit vergangen ist
  - Zeit wird als paramter an algoritmus übergeben
  - kein periodic(4, xyz), da dies zwei Zeitmechanismen erfordern würde (simulationszeit 1,2,3,4,... und virtuelle zeit für jeden algorithmus.)
    - wie würde sonst mit zwei prozessen umgegangen werden, die beide periodic(2, xyz) ausführen? (A, B, A, B, A) es könnten keine weiteren "normalen" nachrichten mehr empfangen werden
    - periodic(1, abc) => deadlock
- Optional: Statistics View
- Optional: View für Nachrichten Call-Tree (vgl. Terminierungs Algorithmus VL)


## Next Week
- Colors in graph
- Colors in Timeline
- Detail-View
- Highlight message indicator before receiving

## TODO
- Finish the interface
- Documentation and extensive comments

### Improvements
- Error-handling
- URL-compliant address scheme
- Animate timeline.addMessage 
- highlight messageIndicator before removing an item for receiving
- animate messages to/from outside of the topology
- delete animation for reverse emits leaving a node 
- Indicate "busy-state" while jumpToEnd to indicate infinite loops

### Features
- Network adapter
- Example algorithms
- Creating new messages from the webinterface
- Simulate unreliable links and nodes
- Random receive order (not only fifo queue)
- Setting animation-speed
- Display current position number in the interface
- Extend the graph-View with a list of running instances to choose which instance defines a nodes color


## Lizenz

Dieses Projekt steht unter der Creative Commons BY-NC-ND 3.0 DE Lizenz.
Unter https://creativecommons.org/licenses/by-nc-nd/3.0/de/legalcode ist die Lizenz einsehbar.
Eine Kopie dieser Lizenz ist diesem Projekt beigefügt.
Unter https://creativecommons.org/licenses/by-nc-nd/3.0/de/ ist eine einfache Zusammenfassung der Lizenz einsehbar. 
