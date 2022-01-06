FROM python:latest
MAINTAINER Taylor Edwards (me@tayloredwards.net)

RUN python -m pip install --upgrade pip

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN adduser --gecos "" --disabled-password --no-create-home --uid 1000 flask
RUN chown -hR flask:flask .

USER flask
EXPOSE 5000/tcp
CMD ["uwsgi", "--ini", "uwsgi.ini", "--enable-threads"]
