from flask import Flask, make_response, render_template
from anagrams import get_dictionary_options, get_daily_challenge

app = Flask(__name__)

@app.route('/', methods=['GET'])
def handle_directory():
    view = render_template('index.html')
    return make_response(view), 200

@app.route('/tetris', methods=['GET'])
def handle_tetris():
    view = render_template('tetris.html')
    return make_response(view), 200

@app.route('/snake', methods=['GET'])
def handle_snake():
    view = render_template('snake.html')
    return make_response(view), 200

@app.route('/spell-that-pokemon', methods=['GET'])
def handle_stp():
    dictionary_id = 'pokemon'
    options = get_dictionary_options(dictionary_id)
    if options is None:
        return 'Dictionary not found', 404
    challenge = get_daily_challenge(dictionary_id=dictionary_id)
    if challenge is None:
        return 'Challenge not found', 404
    view = render_template('spell-that-pokemon.html', options=options, challenge=challenge)
    response = make_response(view)
    response.cache_control.public = True
    response.cache_control.max_age = 3600
    return response, 200

@app.teardown_appcontext
def shutdown_session(exception=None):
    if exception:
        print(exception)

if __name__ == '__main__':
    app.run(host='0.0.0.0')
