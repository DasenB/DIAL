# DIAL
DIAL is a framework for simulating and visualizing distributed algorithms in Python.

![Screenshot of the DIAL visualization](https://github.com/DasenB/DIAL/blob/media/Readme-Images/screenshot_24_01_21.png?raw=true)


## Installation

You can use either `pip` or `nix` to install DIAL.
Python 3.12 is recommended and the only version that has been tested.

To run the simulator you need a `.py` file in which you import the DIAL package. Examples for this file are provided in the [examples directory](https://github.com/DasenB/DIAL/tree/main/examples).


```python
from DIAL import *
```


### Installation using PIP

```bash
pip install dial-simulator
```

Now you can run your `.py`-file.

```bash
python <PATH_TO_YOUR_PYTHON_FILE>
```

### Installation using Nix
The following command automaticly uses the correct version of python with all dependencies installed.
It does not make permanent changes to your system or your default python installation.

```
nix run github:DasenB/DIAL#python <PATH_TO_YOUR_PYTHON_FILE>
```

For this to work you need the [Nix Package Manager](https://nixos.org/download/) with enabled support for flakes.
To temporarily enable flakes you can add the flag `--experimental-features 'nix-command flakes'` to the command.

Using the nix package manager you get the **exact** version of all dependencies that are specified in the repository. 
The result is a "works on all machines installation" similar to docker. 
If the installation using `pip` fails the `nix` approach probably still works.


### Installation using Docker

```
docker build --tag "dial" https://github.com/DasenB/DIAL.git#main
docker run --network host -v ~/:/dial -it dial
```

After doing this you receive a shell within a container that has the DIAL framework installed and your home-directory mounted.
From there you can run your `.py`-file.

```bash
python <PATH_TO_YOUR_PYTHON_FILE>
```

Now you must navigate to `https://localhost:10101/index.html` in your browser.


## Minimal Example

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


## Concepts

### 1. Distributed Algorithm
Any function with a signature of 
`(state: State, message: Message) -> None`
can be used as an algorithm. It must be passed to the simulator on initialisation.

Because the behaviour of the simulator should be deterministic, there are some restrictions on what you can do within
an algorithm-function.
To prevent you from accidentally breaking the determinism, access to objects defined outside the algorithm
is not possible.
Only the following objects defined outside your algorithm can be accessed:

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
| ``DIAL.get_local_states`` | Function that gives you a read-only copy of all instance states that are stored on the same local node. You should not try to change it as modifications are not persistent. |
| ``DIAL.get_global_time``  | Function that gives you the global simulation time                                                                                                                           |

**Note:** This also mean that you can not use any function provided by libraries like numpy. If you really need to use a library
you can import it directly within your algorithm function. But do so at your own risk!

Any algorithm-function receives the following two arguments: 

| Argument                                     | Description                                                                                                                                                                                 |
|----------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| ``state: State``                             | The state of the instance that is called. You can make changes to the values. They will persist between multiple function calls of the same instance.                                       |
| ``message: Message``                         | The message that is being received in the current processing step.                                                                                                                          |


### 2. Topology
A topology-object defines the system your algorithm is running on. It consists of nodes and edges.
The nodes receive, process and send messages and store an internal state. The edges transport messages between nodes.
Nodes are identified by their name, edges by their source and target node.

Edges have some properties that can be different for each individual edge. This way different behaviours can be simulated. 
The following properties are defined by an edges ``EdgeConfig``-object:

- ``direction``: unidirectional or bidirectional 
- ``reliability``: Probability with wich a message arrives at its target. This can be used to simulate loss of messages.
- ``scheduler``: Function that determines the arrival time for a message send through the edge. There are predefined scheduler-functions, but you also can implement your own.


### 3. Address
An address consists of three elements:

- **Node**:       Name of a processing unit that is part of the topology.
- **Algorithm**:  Dictionary-key of the algorithm function that is provided when creating the simulator.
- **Instance**:   An algorithm can be started multiple times. Each instance has a unique name that can be chosen arbitrarily.

Addresses are represented by ``DIAL.Address``-objects and can be formatted as a string in the following way: ``node/algorithm/instance``


### 4. Message
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


### 5. Simulator and Frontend
The simulator-object is initialized with some a topology, a set of algorithms and a set of initial messages.
You can make the simulator execute steps by either calling ``simulator.step_forward()`` from your code or by
starting the api-frontend with the simulator (which is the recommended method).

When the api is started a browser window should be opened with the url ``https://127.0.0.1:10101/index.html``.
If that is not the case you can open it manually. In the frontend you can manipulate the state of the simulation by stepping forward or backward
and by changing messages and instance-states. The only browser that has been tested is Firefox. Other browsers might or might not work.

### 6. Randomness and Determinism
Distributed systems are inherently non-deterministic. This is one of the main reasons why creating distributed programs is so hard.
To aid in the development of such programs it is desirable to enable deterministic behaviour of the simulator.
In DIAL there are two mechanisms that control two different aspects of this:

#### 6.1 Determinism of Algorithm Functions
The first is the ability to step through the program execution step by step in both forward and backward directions.
Every processing step receives a state as input and produces an altered state as output. The sequence of states for 
every algorithm instance is being recorded. When stepping forward though the simulation new states are produced and added to the 
record. When going a step backwards the latest state is removed from the record and the previous state is outputted. 
To ensure that the next time a forward-step is taken it produces the same output that was previously removed the individual calls
to the algorithm function have to be deterministic.

DIAL archives this by limiting what can be done within an algorithm function. To make sure the output of an algorithm function
only depends on the arguments supplied to the function access to the global scope is prevented. You can not access any variables declared
outside your function. This includes imported libraries. If you need to use a library you can import it directly within your function.
BUT: This can lead to unintended side effects which might break the deterministic behaviour of the simulation.

For some algorithms access to random numbers is necessary. In this case the random numbers must be obtained through the simulator
and not for example by importing the ``random``-module. The following code shows how you can get a random number within an algorithm function.
The ``state.random_number_generator``-object is a [NumPy Random Generator](https://numpy.org/doc/stable/reference/random/generator.html)-Object
which is provided by the simulator and you can use its functions.

```python
def algorithm(state: State, message: Message) -> None:
    x = int(state.random_number_generator.integers(low=0, high=10000))
```

#### 6.2 Determinism of Simulator Executions
The second desired property is the ability to reproduce behaviour across multiple executions of the python-script.
This can help when debugging and also enables the sharing of examples which always execute the same way.
For this reason the simulator can take a seed as argument. It defaults to 0 if you do not manually set it.

```python
simulator = Simulator(
    topology=...,
    algorithms=...,
    initial_messages=...,
    seed=0
)
```

There might be times when you want to test different execution paths of your program. This can be done by setting supplying ``None`` as a seed
to the Simulator. Now every time the python script is run a new seed is used. The ability to step forward and backward through the 
simulation as described in the previous section is still given.



## License
This project is licensed under **Creative Commons BY-NC-SA 4.0**

A simple summary of the license can be found under: https://creativecommons.org/licenses/by-nc-sa/4.0/deed
