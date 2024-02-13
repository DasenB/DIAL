# DIAL
DIAL is a framework for simulating and visualizing distributed algorithms in Python.

![Screenshot of the DIAL visualization](https://github.com/DasenB/DIAL/blob/main/Documents/screenshot.png?raw=true)

## Getting started

### Installation

You can use `pip` to install DIAL. Python 3.11 is recommended and the only version of python that has been tested.

```bash
pip install dial-simulator
```

Now you can import the simulator in your python file.

```python
from DIAL import *
```

### Distributed Algorithm
Any function with a signature of 
`(state: State, message: Message) -> None`
can be used as an algorithm. It must be passed to the simulator on initialisation.

Because the behaviour of the simulator should be deterministic, there are some restrictions on what you can do within
an algorithm-function. To prevent you from accidentally breaking the determinism, access to objects defined outside the algorithm
is not possible. Only the following objects defined outside your algorithm can be accessed:

| Type                      | Description                                                                                                                                                                  |
|---------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ``Python Builtins``       | print, range, min, max, dict, ...                                                                                                                                            |
| ``DIAL.Address``          | A reference to an instance of an algorithm on a node                                                                                                                         |
| ``DIAL.Color``            | Representation of colors in RGB                                                                                                                                              |
| ``DIAL.DefaultColors``    | Enum with predefined colors                                                                                                                                                  |
| ``DIAL.Message``          | Object to communicate between different instances                                                                                                                            |
| ``DIAL.State``            | A State-object acts as the scope of an instance and is the only place where data persists between executions                                                                 |
| ``DIAL.send``             | Function to send messages between nodes that are directly connected within the topology                                                                                      |
| ``DIAL.send_to_self``     | Function to send messages that will be received on the same node after a specified delay                                                                                     |
| ``DIAL.get_local_states`` | Function that gives you a read-only copy of all instance states that are stored on the same lokal node. You should not try to change it as modifications are not persistent. |
| ``DIAL.get_time``         | Function that gives you the global simulation time                                                                                                                           |

**Note:** This also mean that you can not use any function provided by libraries like numpy. If you really need to use a library
you can import it directly within your algorithm function. But do so at your own risk!

Any algorithm-function receives the following two arguments: 

| Argument                                     | Description                                                                                                                                                                                 |
|----------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ``state: State``                             | The state of the instance that is called. You can make changes to the values. They will persist between multiple function calls of the same instance.                                       |
| ``message: Message``                         | The message that is being received in the current processing step.                                                                                                                          |


### Topology
A topology-object defines the system your algorithm is running on. It consists of nodes and edges.
The nodes receive, process and send messages and store an internal state. The edges transport messages between nodes.
Nodes are identified by their name, edges by their source and target node.

Edges have some properties that can be different for each individual edge. This way different behaviours can be simulated. 
The following properties are defined by an edges ``EdgeConfig``-object:

- ``direction``: unidirectional or bidirectional 
- ``reliability``: Probability with wich a message arrives at its target. This can be used to simulate loss of messages.
- ``scheduler``: Function that determines the arrival time for a message send through the edge. There are predefined scheduler-functions, but you also can implement your own.


### Address
An address consists of three elements:

- **Node**:       Name of a processing unit that is part of the topology.
- **Algorithm**:  Dictionary-key of the algorithm function that is provided when creating the simulator.
- **Instance**:   An algorithm can be started multiple times. Each instance has a unique name that can be chosen arbitrarily.

Addresses are represented by ``DIAL.Address``-objects and can be formatted as a string in the following way: ``node/algorithm/instance``


### Message
Messages are send between instances. The target-node and the target-algorithm must already exist. If the target-instance does not yet exist it is
created once the message is being received.

Every message has a color and a title which both can be seen in the frontend.
If no color is explicitly specified it defaults to white. The title is a string that can be freely chosen.
Arbitrary data can be placed in the messages data-attribute. To prevent object references from causing side effects across different nodes and to be able
to display the message as string in the frontend, all values stored in a message must be serializable to JSON. If you store objects in a message
you might need to implement your own json encoding and decoding. Also, object-references are deliberately broken up by replacing a send message with a deepcopy before it is being delivered.
Keep that in mind when putting objects into messages.

You can send messages within your algorithm using two different methods:

- `send(message)`: Can send messages between nodes that are connected through an edge. The arrival time of the message is determined by the edge of the topology.
- `send_to_self(message, delay)`: Can send messages to instances that are located on the same node. The delay until the message is received can be chosen.


### Simulator and Frontend
The simulator-object is initialized with some a topology, a set of algorithms and a set of initial messages.
You can make the simulator execute steps by either calling ``simulator.step_forward()`` from your code or by
starting the api-frontend with the simulator (which is the recommended method).

When the api is started a browser window should be opened with the url ``https://127.0.0.1:10101/index.html``.
If that is not the case you can open it manually. In the frontend you can manipulate the state of the simulation by stepping forward or backward
and by changing messages and instance-states.


### Minimal Example

```python
# 1. Import the DIAL framework
from DIAL import *

# 2. Implement some algorithm
def hello_world_algorithm(state: State, message: Message) -> None:
  state.color = DefaultColors.RED

# 3. Create an initial message
initial_message = Message(
  source_address="A/hello_world/example_instance_asdf",
  target_address="B/hello_world/example_instance_asdf",
)

# 4. Create the simulator
simulator = Simulator(
  topology=DefaultTopologies.EXAMPLE_NETWORK_3,
  algorithms={
    "hello_world": hello_world_algorithm,
  },
  initial_messages={
    1: [initial_message]
  }
)

# 5. Run the simulator
api = API(simulator=simulator)
```




## License
Dieses Projekt steht unter der **Creative Commons BY-NC-ND 3.0 DE** Lizenz.

Unter https://creativecommons.org/licenses/by-nc-nd/3.0/de/legalcode ist die Lizenz einsehbar.
Eine Kopie dieser Lizenz ist diesem Projekt beigefügt.
Unter https://creativecommons.org/licenses/by-nc-nd/3.0/de/ ist eine einfache Zusammenfassung der Lizenz einsehbar. 
