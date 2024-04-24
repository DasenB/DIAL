FROM python:3.12

RUN mkdir /dial
WORKDIR /dial
RUN pip install --no-cache-dir dial-simulator
EXPOSE 10101
RUN useradd dial
RUN chown dial /dial
RUN chgrp dial /dial
USER dial

CMD ["/bin/sh", "-c", "bash"]