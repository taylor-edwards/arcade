from datetime import datetime
from pathlib import Path
import json
import generator

DICTIONARIES = {
    'pokemon': {
        'app_name': 'Spell that Pokémon',
        'filename': 'pokemon.csv',
        'max_unique_characters': 10,
        'min_results_count': 3
    },
    'cities': {
        'app_name': 'City Spellers',
        'filename': 'cities.csv',
        'max_unique_characters': 12,
        'min_results_count': 3
    }
}

LOG_DIR = './logs'
Path(LOG_DIR).mkdir(parents=True, exist_ok=True)
# TODO: (de-)serialize this cache to/from disk on startup/shutdown
daily_cache = {}

def log_daily(challenge):
    try:
        date = challenge['created_date']
        log_text = json.dumps(challenge)
        log_filename = date[0:date.rindex('-')]
        with open(Path(LOG_DIR, log_filename), 'a') as log_file:
            log_file.write(log_text + '\n')
    except Exception as err:
        print('Could not log daily challenge:\n', err)

def get_dictionary_options(dictionary_id):
    if dictionary_id not in DICTIONARIES:
        return None
    return DICTIONARIES[dictionary_id]

def get_daily_challenge(dictionary_id):
    if dictionary_id not in DICTIONARIES:
        return None
    today = str(datetime.date(datetime.now()))
    if dictionary_id not in daily_cache or daily_cache[dictionary_id]['created_date'] != today:
        (letters, answers, punctuation) = generator.find_challenge()
        challenge = {
            'created_date': today,
            'letters': letters,
            'answers': answers,
            'punctuation': punctuation
        }
        daily_cache[dictionary_id] = challenge
        log_daily(challenge)
    return daily_cache[dictionary_id]
