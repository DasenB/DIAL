# Simulator
- [x] Skip lost messages
- [x] Fix bug where rescheduling is impossible before the first step was executed. 
- [ ] good way to distribute package
- [ ] generate certs if they do not exist

# General
- [x] Warning if no connection to backend can be made
- [ ] A way to add new messages
- [x] Prevent Alert-Overlay from being closeable by clicking on the background or the cross. Only actions close it.
- [ ] Use node modules for all imported libraries

# Graph View:
- [x] A node that is overlapped by a message should not be selected if the message on top of it is being clicked 
- [x] When stepping forward the message that is being received should be highlighted in a nice way
  - [ ] Messages that are being received at the same time but with a different theta should also be highlighted in a nice but different way
- [ ] Messages that have already been received should not be shown. But messages with the same theta that will be received later should be shown
- [x] Failed Messages are not being displayed after 50% of their way
- [x] Paint Node-color based on selection in menu
- [x] Self messages do not stay still but complete one circle around the border of its node
- [x] Visually distinguish between unidirectional and bidirectional links
- [x] Add optional statistics overlay (active messages, total messages; active_messages-selected-algo, total messages-selected-algo)

# Timeline View:
- [ ] Implement

# Detail View
- [x] Messages are updated by the simulation
- [x] Lost messages are clearly marked
- [x] Messages should not be shown before the time they are created
- [x] Messages should be shown from the moment on they are created
- [x] Messages that are highlighted in the graph view should also be highlighted in the detail view
- [x] Fix bug when reordered messages are duplicated as time progresses
- [x] Give Feedback when rescheduling failed because the desired time/theta is invalid.
- [ ] Use Number-Picker for Theta Value and restrict to valid numbers
- [x] Once the first simulation step has been made the first message can not be changed anymore
- [x] Rescheduling a message does not (always) update the graph view

# Menu
- [x] Toggle Play/Pause Icon on Button
- [ ] Disable Backwards/Forwards Buttons at Start/End
- [ ] Make settings persistent over page loads (speed, settings, view selection)

# Editor
- [x] Warn before dismissing unsaved changes
- [x] Disable changes while the animation is running
- [ ] Save changes

# Error
- [x] Backend TypeError: Object of type int64 is not JSON serializable
  - [2023-10-10 11:10:07,931] ERROR in app: Exception on /message/920d211d-243d-4ed4-814e-5208598dede3 [GET]

