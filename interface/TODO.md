# Simulator
- [x] Skip lost messages

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
- [ ] Paint Node-color based on selection in menu
- [ ] Self messages do not stay still but complete one circle around the border of its node
- [ ] Visually distinguish between unidirectional and bidirectional links

# Detail View
- [x] Messages are updated by the simulation
- [x] Lost messages are clearly marked
- [x] Messages should not be shown before the time they are created
- [ ] Messages should be shown from the moment on they are created
- [ ] Messages that are highlighted in the graph view should also be highlighted in the detail view
- [ ] Fix bug when reordered messages are duplicated as time progresses

# Menu
- [x] Toggle Play/Pause Icon on Button
- [ ] Disable Backwards/Forwards Buttons at Start/End

# Editor
- [x] Warn before dismissing unsaved changes
- [x] Disable changes while the animation is running

# Error
- [x] Backend TypeError: Object of type int64 is not JSON serializable
  - [2023-10-10 11:10:07,931] ERROR in app: Exception on /message/920d211d-243d-4ed4-814e-5208598dede3 [GET]

