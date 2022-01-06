import re
import string
import unicodedata
from random import choice

# TODO: rewrite most/all of this file into a class so multiple instances can be used

DEBUG = False
DICTIONARY = './data/pokemon.csv'
MAX_UNIQUE_CHARACTERS = 8
MIN_RESULTS_COUNT = 4
GENERATION_MAX_ATTEMPTS = 10000 # clients should re-attempt with an exponential decay
ALPHANUM_LOWER = string.ascii_lowercase + string.digits # represents the normalized search space

sorted_trie = {}
baskets = {} # keep track of exact anagrams (only used in debug mode for now)

def normalize_input(text):
  word = text[0:text.index(',')] if ',' in text else text
  return unicodedata.normalize('NFD', word.lower()).encode('ascii', 'ignore').decode()

def get_unique_chars(word):
  unique_chars = list(set(word))
  unique_chars.sort()
  return ''.join([char for char in unique_chars if char in ALPHANUM_LOWER])

def process_line(line):
  word = normalize_input(line)
  unique_chars = get_unique_chars(word)

  layer = sorted_trie
  for char in unique_chars:
    if char not in layer:
      layer[char] = {}
    layer = layer[char]
  if 'words' not in layer:
    layer['words'] = []
  filename = re.sub(r'[\.:\']', '', word.replace(' ', '-')) + \
             ('-m' if '♂' in line else '-f' if '♀' in line else '' ) + '.png'
  layer['words'].append({
    'line': line[0:line.index(',')] if ',' in line else line,
    'word': word,
    'filename': filename
  })

  if DEBUG:
    if unique_chars not in baskets:
      baskets[unique_chars] = []
    baskets[unique_chars].append(word)

def find_anagrams(word, layer=sorted_trie):
  unique_chars = get_unique_chars(normalize_input(word)) if layer is sorted_trie else word
  words_found = layer['words'] if 'words' in layer else []
  for char in layer:
    if char in unique_chars:
      words_found = words_found + find_anagrams(unique_chars, layer[char])
  return words_found

with open(DICTIONARY) as file:
  for line in file:
    process_line(line.strip('\r?\n'))

def randomize_chars(count):
  chars = ''
  while count > 0:
    chars += choice(ALPHANUM_LOWER)
    count -= 1
  return chars

def find_challenge(max_char_count=MAX_UNIQUE_CHARACTERS, min_words=MIN_RESULTS_COUNT):
  # brute force random character sets until requirements are met or max attempts is reached
  attempts = 0
  while attempts < GENERATION_MAX_ATTEMPTS:
    chars = randomize_chars(max_char_count)
    anagrams = find_anagrams(chars)
    if len(anagrams) >= min_words:
      break
    attempts += 1
  all_matches_str = ''.join([anagram['word'] for anagram in anagrams])
  letters = get_unique_chars(all_matches_str)
  punctuation = ''.join(list(set(
    [char for char in all_matches_str if char not in ALPHANUM_LOWER])))
  if anagrams:
    return (letters, anagrams, punctuation)
  raise Exception('Could not satisfy challenge requirements with given dictionary'
                 f' (attempted {attempts} times)')

if DEBUG:
  exact_anagrams = [(chars, words) for chars, words in baskets.items() if len(words) > 1]
  print(f'Found {len(exact_anagrams)} exact anagrams:\n', exact_anagrams)
  print(sorted_trie['e']['g']['k']['o']['r']['y'])   # Grookey, Kyogre
  print(('aeklmouz',   find_anagrams('aeklmouz')))   # Alakazam, Komala, Alomomola, Muk, Kommo-o
  print(('eijmr',      find_anagrams('eijmr')))      # Mr. Mime, Mr. Rime, Mime Jr.
  print(('ehilmopt',   find_anagrams('ehilmopt')))   # Lileep, Petilil, Litleo, Poipole, Helioptile, Popplio, Hoppip, Mothim, Ho-oh, Hoothoot
  print(('eilopsvw',   find_anagrams('eilopsvw')))   # Lileep, Poipole, Seel, Swellow, Eevee, Solosis, Popplio, Wooloo
  print(('abcghort',   find_anagrams('abcghort')))   # Crobat, Barboach, Abra, Raboot, Chatot, Torracat, Rattata, Gogoat, Ho-oh, Hoothoot, Throh
  print(('abcefl',     find_anagrams('abcefl')))     # Flabébé, Clefable, Cleffa
  print(('aeilmnrt',   find_anagrams('aeilmnrt')))   # Marill, Altaria, Meltan, Melmetal, Mantine, Mareanie, Rattata, Malamar, Litten, Mr. Mime, Mr. Rime, Entei
  print(('aelnptuy',   find_anagrams('aelnptuy')))   # Appletun, Tapu Lele, Natu, Lunala, Type: Null
  print(('acdefhirst', find_anagrams('acdefhirst'))) # Farfetch'd, Raticate, Seadra, Rattata, Herdier, Sirfetch'd
  print(('adinor',     find_anagrams('adinor')))     # Nidoran♀, Nidorina, Nidoran♂, Aron, Nidorino, Dodrio
  print(find_challenge())
