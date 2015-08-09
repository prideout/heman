import os
from glob import glob

CORE_SRC = glob('src/*.c')
MATH_SRC = glob('kazmath/*.c')

LIB_SRC = CORE_SRC + MATH_SRC
TEST_SRC = CORE_SRC + MATH_SRC + ['test/main.c']
TEST_BIN = 'build/test_islandman'

env = Environment(
    LIBS=['boost_python', 'python2.7', 'm'],
    CPPPATH=['include', '/usr/include/python2.7', '.'],
    SHLIBPREFIX='',
    LINKFLAGS='-fopenmp',
    CFLAGS='-fopenmp -g -O3 -Wall -std=c99')

Default(env.SharedLibrary(
    'build/_islandman.so', source=LIB_SRC))

env = env.Clone(LIBS=['m'])
env.Program(TEST_BIN, source=TEST_SRC)
env.Command('test', TEST_BIN, TEST_BIN)
AlwaysBuild('test')

additions = ['include/islandman.h', 'test/main.c']
exclusions = ['src/noise.c', 'src/noise.h']
cfiles = glob('src/*.c') + glob('src/*.h') + additions
cfiles = list(set(cfiles) - set(exclusions))
env.Command('format', cfiles, 'clang-format-3.6 -i $SOURCES')
AlwaysBuild('format')
